import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import postcss from 'postcss';

const ShorthandProperties = new Set(['all', 'animation', 'background', 'border', 'border-block', 'border-color', 'border-image', 'border-inline', 'border-radius', 'border-style', 'border-width', 'columns', 'flex', 'font', 'gap', 'grid', 'grid-area', 'grid-column', 'grid-row', 'inset', 'list-style', 'margin', 'offset', 'outline', 'overflow', 'padding', 'place-content', 'place-items', 'place-self', 'text-decoration', 'transition']);
const RuntimeAtRules = new Set(['keyframes', 'font-face', 'page', 'property']);
const ScopeAtRules = new Set(['media', 'supports', 'container', 'layer', 'scope']);

function parsePostcssSemanticRecords(sourceText, sourceHash, options) {
  try {
    const root = postcss.parse(sourceText, { from: options.sourcePath });
    const records = postcssContainerRecords(root.nodes ?? [], [], sourceHash, options);
    return { records, proofGaps: [], parser: { name: 'postcss', sourceCodeLocationInfo: true, parseErrors: [] } };
  } catch (error) {
    const reason = error?.reason ?? error?.message ?? 'CSS parser failed';
    return {
      records: [],
      proofGaps: [proofGap('css-parser-error', `CSS parser rejected source: ${reason}`)],
      parser: {
        name: 'postcss',
        sourceCodeLocationInfo: true,
        parseErrors: [compactRecord({ reason, line: error?.line, column: error?.column, input: error?.input?.file })]
      }
    };
  }
}

function postcssContainerRecords(nodes, scopes, sourceHash, options) {
  const records = [];
  for (const node of nodes) {
    if (node.type === 'rule') records.push(postcssRuleRecord(node, scopes, sourceHash, options));
    else if (node.type === 'atrule') {
      records.push(postcssAtRuleRecord(node, scopes, sourceHash, options));
      if (ScopeAtRules.has(String(node.name).toLowerCase()) && node.nodes?.length) {
        records.push(...postcssContainerRecords(node.nodes, [...scopes, postcssAtRuleScopeKey(node)], sourceHash, options));
      }
    }
  }
  return records.sort((left, right) => left.sourceSpan.startOffset - right.sourceSpan.startOffset);
}

function postcssRuleRecord(node, scopes, sourceHash, options) {
  const selectors = String(node.selector ?? '').split(',').map((selector) => selector.trim()).filter(Boolean);
  const declarations = (node.nodes ?? []).filter((child) => child.type === 'decl').map(postcssDeclaration);
  const nestedChildren = (node.nodes ?? []).filter((child) => child.type !== 'decl' && child.type !== 'comment');
  const proofGaps = [
    ...declarations.filter((declaration) => ShorthandProperties.has(declaration.property)).map((declaration) => proofGap('css-shorthand-expansion-unproved', `CSS shorthand ${declaration.property} needs longhand expansion evidence.`)),
    ...scopes.length && !options.scopedCascadeGraphHash ? [proofGap('css-scoped-cascade-equivalence-unproved', 'Scoped cascade equivalence requires browser/style evidence.')] : [],
    ...nestedChildren.length ? [proofGap('css-nesting-semantic-unproved', 'CSS nested rule semantics require nesting expansion evidence.')] : []
  ];
  return compactRecord({
    kind: 'rule',
    selectors,
    selectorHash: hashSemanticValue({ kind: 'frontier.lang.css.selectors.v2.postcss', selectors }),
    specificity: selectors.map(selectorSpecificity),
    scopes,
    declarations: declarations.map((declaration, ordinal) => ({
      ...declaration,
      ordinal,
      cascadeKey: [...scopes, selectors.join(','), declaration.property].join('::'),
      declarationHash: hashSemanticValue({ kind: 'frontier.lang.css.declaration.v2.postcss', scopes, selectors, property: declaration.property, rawProperty: declaration.rawProperty, value: declaration.value, important: declaration.important })
    })),
    customProperties: declarations.filter((declaration) => declaration.property.startsWith('--')).map((declaration) => declaration.property),
    scopedCascadeGraphHash: scopes.length ? options.scopedCascadeGraphHash : undefined,
    selectorTargetGraphHash: options.selectorTargetGraphHash,
    sourceSpan: sourceSpanFromPostcss(node.source, options.sourcePath),
    sourceHash,
    rawTextHash: hashSemanticValue({ kind: 'frontier.lang.css.rawRuleText.v1', text: node.toString() }),
    ruleHash: hashSemanticValue({ kind: 'frontier.lang.css.rule.v2.postcss', selectors, scopes, declarations, nestedChildren: nestedChildren.map((child) => child.type) }),
    parser: 'postcss',
    proofGaps: proofGaps.length ? proofGaps : undefined
  });
}

function postcssDeclaration(node) {
  const property = String(node.prop ?? '').toLowerCase();
  const value = String(node.value ?? '').trim();
  return {
    property,
    rawProperty: node.raws?.prop?.raw ?? node.prop,
    value,
    important: node.important === true,
    valueHash: hashSemanticValue({ kind: 'frontier.lang.css.value.v2.postcss', value }),
    sourceSpan: sourceSpanFromPostcss(node.source, node.source?.input?.file),
    rawTextHash: hashSemanticValue({ kind: 'frontier.lang.css.rawDeclarationText.v1', text: node.toString() })
  };
}

function postcssAtRuleRecord(node, scopes, sourceHash, options) {
  const atRuleName = String(node.name ?? 'unknown').toLowerCase();
  const conditionText = String(node.params ?? '').trim();
  const rawText = rawPostcssText(node);
  const proofGaps = [];
  if (RuntimeAtRules.has(atRuleName)) proofGaps.push(proofGap(`css-${atRuleName}-runtime-equivalence-unproved`, `CSS @${atRuleName} semantics require browser evidence.`));
  if (ScopeAtRules.has(atRuleName) && !options.scopedCascadeGraphHash) proofGaps.push(proofGap(`css-${atRuleName}-cascade-scope-unproved`, `CSS @${atRuleName} scoped cascade requires condition evaluation evidence.`));
  if (!node.nodes?.length && atRuleName === 'layer') proofGaps.push(proofGap('css-layer-order-statement-unsupported', 'CSS @layer statement order requires cascade order evidence.'));
  else if (!node.nodes?.length) proofGaps.push(proofGap(`css-${atRuleName}-statement-equivalence-unproved`, `CSS @${atRuleName} statement semantics require host evidence.`));
  const kind = node.nodes?.length ? 'at-rule' : 'at-rule-statement';
  return compactRecord({
    kind,
    atRuleName,
    conditionText,
    statementText: kind === 'at-rule-statement' ? rawText : undefined,
    scopeKey: postcssAtRuleScopeKey(node),
    scopes,
    dependencyTokens: atRuleDependencyTokens(node, atRuleName),
    scopedCascadeGraphHash: ScopeAtRules.has(atRuleName) ? options.scopedCascadeGraphHash : undefined,
    sourceSpan: sourceSpanFromPostcss(node.source, options.sourcePath),
    sourceHash,
    rawTextHash: hashSemanticValue({ kind: 'frontier.lang.css.rawAtRuleText.v1', text: rawText }),
    atRuleHash: hashSemanticValue({ kind: 'frontier.lang.css.atRule.v2.postcss', atRuleName, conditionText, scopes, statementText: kind === 'at-rule-statement' ? rawText : undefined }),
    parser: 'postcss',
    proofGaps: proofGaps.length ? proofGaps : undefined
  });
}

function postcssAtRuleScopeKey(node) {
  return `@${String(node.name ?? 'unknown').toLowerCase()} ${String(node.params ?? '').trim()}`.trim();
}

function atRuleDependencyTokens(node, atRuleName) {
  if (atRuleName !== 'font-face') return undefined;
  const declarations = (node.nodes ?? []).filter((child) => child.type === 'decl');
  const fontFamilies = declarations
    .filter((declaration) => String(declaration.prop ?? '').toLowerCase() === 'font-family')
    .flatMap((declaration) => fontFamilyNames(declaration.value));
  const urls = declarations.flatMap((declaration) => cssUrlReferences(declaration.value));
  return compactRecord({ fontFamilies: unique(fontFamilies), urls: unique(urls) });
}

function fontFamilyNames(value) {
  return String(value ?? '').split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function cssUrlReferences(value) {
  return [...String(value ?? '').matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g)]
    .map((match) => (match[1] ?? match[2] ?? match[3] ?? '').trim())
    .filter(Boolean);
}

function sourceSpanFromPostcss(source, fallbackPath) {
  const start = source?.start;
  const end = source?.end;
  if (!start || !end) return undefined;
  return compactRecord({
    path: fallbackPath,
    startOffset: start.offset,
    endOffset: end.offset,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column
  });
}

function rawPostcssText(node) {
  const css = node.source?.input?.css;
  const start = node.source?.start?.offset;
  const end = node.source?.end?.offset;
  return typeof css === 'string' && Number.isFinite(start) && Number.isFinite(end) ? css.slice(start, end) : node.toString();
}

function selectorSpecificity(selector) {
  const withoutStrings = selector.replace(/"[^"]*"|'[^']*'/g, '');
  const ids = (withoutStrings.match(/#[\w-]+/g) ?? []).length;
  const classes = (withoutStrings.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) ?? []).length;
  const elements = (withoutStrings.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:{1,2}[\w-]+(?:\([^)]*\))?/g, ' ').match(/\b[A-Za-z][\w-]*\b/g) ?? []).length;
  return [ids, classes, elements];
}

function proofGap(code, summary) { return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false }; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }

export { parsePostcssSemanticRecords };

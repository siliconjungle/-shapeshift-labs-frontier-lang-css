import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

const CssModulePathPattern = /\.module\.css$/i;

export function createCssModuleEvidence(records, options, sourceHash) {
  const enabled = options.cssModule === true || options.cssModules === true || CssModulePathPattern.test(String(options.sourcePath ?? ''));
  if (!enabled) return undefined;
  const rules = records.filter((record) => record.kind === 'rule');
  const exports = cssModuleExports(rules, options);
  const compositions = cssModuleCompositions(rules);
  const icssImports = cssModuleIcssImports(rules);
  const icssExports = cssModuleIcssExports(rules);
  const proofGaps = cssModuleProofGaps(exports, compositions, icssImports, icssExports, options);
  const moduleHash = hashSemanticValue({
    kind: 'frontier.lang.css.modules.v1',
    exports: exports.map((entry) => ({ name: entry.name, selectors: entry.selectors })),
    compositions: compositions.map((entry) => ({ localName: entry.localName, names: entry.names, source: entry.source })),
    icssImports,
    icssExports
  });
  return {
    kind: 'frontier.lang.cssModuleEvidence',
    version: 1,
    sourceHash,
    moduleHash,
    mode: 'css-modules',
    exports,
    compositions,
    icssImports,
    icssExports,
    generatedClassNameMapHash: options.generatedClassNameMapHash ?? generatedClassNameMapHash(options.generatedClassNameMap),
    jsTsUseSiteGraphHash: options.jsTsUseSiteGraphHash,
    cssModuleCompositionGraphHash: options.cssModuleCompositionGraphHash,
    icssGraphHash: options.icssGraphHash,
    proofGaps
  };
}

function cssModuleProofGaps(exports, compositions, icssImports, icssExports, options) {
  const proofGaps = [];
  if (exports.length && !options.generatedClassNameMapHash && !options.generatedClassNameMap) {
    proofGaps.push(proofGap('css-module-generated-class-map-unproved', 'CSS Modules exported local classes need generated class-name map evidence from the bundler/runtime.'));
  }
  if (exports.length && options.generatedClassNameMap && exports.some((entry) => !entry.generatedName)) {
    proofGaps.push(proofGap('css-module-generated-class-map-incomplete', 'CSS Modules generated class-name map evidence must cover every exported local class.'));
  }
  if (exports.length && !options.jsTsUseSiteGraphHash) {
    proofGaps.push(proofGap('css-module-js-ts-use-site-graph-unproved', 'CSS Modules exported classes need JS/TS/JSX import and member-use graph evidence.'));
  }
  if (compositions.length && !options.cssModuleCompositionGraphHash) {
    proofGaps.push(proofGap('css-module-composition-resolution-unproved', 'CSS Modules composes declarations need resolved local/global/file composition graph evidence.'));
  }
  if ((icssImports.length || icssExports.length) && !options.icssGraphHash) {
    proofGaps.push(proofGap('css-module-icss-graph-unproved', 'ICSS import/export records need a resolved token graph before equivalence can be claimed.'));
  }
  return proofGaps;
}

function cssModuleExports(rules, options) {
  const generatedClassNameMap = options.generatedClassNameMap ?? {};
  const byName = new Map();
  for (const rule of rules) {
    if (isIcssSelector(rule)) continue;
    for (const selector of rule.selectors ?? []) {
      for (const localName of localClassNamesForSelector(selector)) {
        const existing = byName.get(localName) ?? {
          kind: 'css-module-export',
          name: localName,
          localName,
          selectors: [],
          ruleHashes: [],
          sourceSpans: [],
          generatedName: generatedClassNameMap[localName],
          exportHash: undefined
        };
        existing.selectors.push(selector);
        existing.ruleHashes.push(rule.ruleHash);
        existing.sourceSpans.push(rule.sourceSpan);
        byName.set(localName, existing);
      }
    }
  }
  return [...byName.values()].map(cssModuleExportWithHash);
}

function cssModuleExportWithHash(entry) {
  const selectors = uniqueStrings(entry.selectors);
  const ruleHashes = uniqueStrings(entry.ruleHashes);
  return {
    ...entry,
    selectors,
    ruleHashes,
    exportHash: hashSemanticValue({ kind: 'frontier.lang.css.module.export.v1', name: entry.name, selectors, ruleHashes, generatedName: entry.generatedName })
  };
}

function cssModuleCompositions(rules) {
  const result = [];
  for (const rule of rules) {
    if (isIcssSelector(rule)) continue;
    const localNames = uniqueStrings((rule.selectors ?? []).flatMap(localClassNamesForSelector));
    for (const declaration of rule.declarations ?? []) {
      if (declaration.property !== 'composes') continue;
      const parsed = parseCssModuleComposesValue(declaration.value);
      for (const localName of localNames) {
        result.push({
          kind: 'css-module-composition',
          localName,
          names: parsed.names,
          source: parsed.source,
          sourceKind: parsed.sourceKind,
          selectorHash: rule.selectorHash,
          declarationHash: declaration.declarationHash,
          compositionHash: hashSemanticValue({ kind: 'frontier.lang.css.module.composition.v1', localName, names: parsed.names, source: parsed.source, sourceKind: parsed.sourceKind })
        });
      }
    }
  }
  return result;
}

function cssModuleIcssImports(rules) {
  const result = [];
  for (const rule of rules) {
    const source = icssImportSource(rule);
    if (!source) continue;
    for (const declaration of rule.declarations ?? []) {
      const importedName = declaration.rawProperty ?? declaration.property;
      result.push({
        kind: 'icss-import',
        source,
        importedName,
        localName: declaration.value,
        declarationHash: declaration.declarationHash,
        importHash: hashSemanticValue({ kind: 'frontier.lang.css.module.icssImport.v1', source, importedName, localName: declaration.value })
      });
    }
  }
  return result;
}

function cssModuleIcssExports(rules) {
  const result = [];
  for (const rule of rules) {
    if (!(rule.selectors ?? []).some((selector) => selector.trim() === ':export')) continue;
    for (const declaration of rule.declarations ?? []) {
      const name = declaration.rawProperty ?? declaration.property;
      result.push({
        kind: 'icss-export',
        name,
        value: declaration.value,
        declarationHash: declaration.declarationHash,
        exportHash: hashSemanticValue({ kind: 'frontier.lang.css.module.icssExport.v1', name, value: declaration.value })
      });
    }
  }
  return result;
}

function parseCssModuleComposesValue(value) {
  const match = /^(.*?)\s+from\s+(.+)$/i.exec(value.trim());
  const namesPart = match ? match[1] : value;
  const source = match ? stripCssQuotes(match[2].trim()) : undefined;
  return {
    names: uniqueStrings(namesPart.split(/\s+/).map((item) => item.trim()).filter(Boolean)),
    source,
    sourceKind: !source ? 'local' : source === 'global' ? 'global' : 'file'
  };
}

function localClassNamesForSelector(selector) {
  const forcedLocal = [];
  const globalNames = new Set();
  let stripped = String(selector ?? '').replace(/:global\(([^)]*)\)/g, (_, body) => {
    for (const name of classNames(body)) globalNames.add(name);
    return ' ';
  });
  stripped = stripped.replace(/:local\(([^)]*)\)/g, (_, body) => {
    forcedLocal.push(...classNames(body));
    return ' ';
  });
  if (/:global\b/.test(stripped)) return uniqueStrings(forcedLocal);
  return uniqueStrings([...forcedLocal, ...classNames(stripped).filter((name) => !globalNames.has(name))]);
}

function classNames(selector) {
  return (String(selector ?? '').match(/\.[_A-Za-z-][\w-]*/g) ?? []).map((name) => name.slice(1));
}

function isIcssSelector(rule) {
  return (rule.selectors ?? []).some((selector) => selector.trim() === ':export' || /^:import\(/.test(selector.trim()));
}

function icssImportSource(rule) {
  for (const selector of rule.selectors ?? []) {
    const match = /^:import\((['"]?)(.*?)\1\)$/.exec(selector.trim());
    if (match) return match[2];
  }
  return undefined;
}

function generatedClassNameMapHash(generatedClassNameMap) {
  return generatedClassNameMap ? hashSemanticValue({ kind: 'frontier.lang.css.modules.generatedClassNameMap.v1', generatedClassNameMap }) : undefined;
}

function proofGap(code, summary) { return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false }; }
function stripCssQuotes(value) { return String(value ?? '').replace(/^['"]|['"]$/g, ''); }
function uniqueStrings(values) { return [...new Set((values ?? []).map((value) => String(value)).filter(Boolean))]; }

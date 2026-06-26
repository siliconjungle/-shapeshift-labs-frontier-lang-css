import assert from 'node:assert/strict';
import { capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssSemanticMergeEvidence, emitCss, emitCssWithSourceMap, parseCssSemanticSheet, renderCssAst, renderCssAstWithSourceMap, toCssAst } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'TodoCss', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'field_title', name: 'title', type: 'Text' }] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'field_done', name: 'done', type: 'Bool' }] }),
  capabilityNode({ id: 'cap_view', name: 'ViewRender', capability: 'view.render', category: 'dom' })
] });

const ast = toCssAst(document);
const out = emitCss(document);
const rendered = renderCssAstWithSourceMap(ast, {
  sourceMapId: 'map_doc_css',
  sourcePath: 'doc.frontier',
  targetPath: 'doc.css',
  semanticIndexId: 'semantic_doc',
  sourceSpansBySemanticNodeId: {
    entity_todo: { path: 'doc.frontier', startLine: 5, startColumn: 1, endLine: 7, endColumn: 2 }
  },
  evidence: [{ id: 'evidence_projection', kind: 'projection', summary: 'css projection evidence' }]
});
const emitted = emitCssWithSourceMap(document, { targetPath: 'doc.css' });

assert.equal(ast.kind, 'css.stylesheet');
assert.equal(renderCssAst(ast), out);
assert.equal(rendered.code, out);
assert.equal(emitted.code, out);
assert.equal(emitted.ast.kind, 'css.stylesheet');
assert.equal(rendered.sourceMap.kind, 'frontier.lang.sourceMap');
assert.equal(rendered.sourceMap.id, 'map_doc_css');
assert.equal(rendered.sourceMap.target.language, 'css');
assert.equal(rendered.sourceMap.targetPath, 'doc.css');
assert.equal(rendered.sourceMap.semanticIndexId, 'semantic_doc');
assert.match(out, /\.frontier-Todo/);
assert.match(out, /--frontier-field-done/);
const todoMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'entity_todo');
assert.equal(todoMapping.generatedName, '.frontier-Todo');
assert.equal(todoMapping.precision, 'rule-block');
assert.equal(todoMapping.sourceSpan.path, 'doc.frontier');

const source = [
  ':root { --brand: rebeccapurple; }',
  '.todo[data-state="done"] { color: var(--brand); margin: 0 1rem; }',
  '@media (min-width: 700px) {',
  '  .todo { display: grid; gap: 1rem; }',
  '}',
  '@layer theme {',
  '  .todo { color: green !important; }',
  '}',
  '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }'
].join('\n');
const sheet = parseCssSemanticSheet(source, { sourcePath: 'view.css' });
const evidence = createCssSemanticMergeEvidence(source, { sourcePath: 'view.css' });
const todoRule = sheet.records.find((record) => record.kind === 'rule' && record.selectors?.includes('.todo[data-state="done"]'));
assert.equal(sheet.kind, 'frontier.lang.cssSemanticSheet');
assert.equal(Boolean(sheet.sheetHash), true);
assert.deepEqual(todoRule.specificity[0], [0, 2, 0]);
assert.equal(todoRule.declarations.some((declaration) => declaration.property === 'color'), true);
assert.equal(todoRule.customProperties.length, 0);
assert.equal(sheet.records.some((record) => record.customProperties?.includes('--brand')), true);
assert.equal(sheet.proofGaps.some((gap) => gap.code === 'css-shorthand-expansion-unproved'), true);
assert.equal(sheet.proofGaps.some((gap) => gap.code === 'css-media-cascade-scope-unproved'), true);
assert.equal(sheet.proofGaps.some((gap) => gap.code === 'css-layer-cascade-scope-unproved'), true);
assert.equal(sheet.proofGaps.some((gap) => gap.code === 'css-keyframes-runtime-equivalence-unproved'), true);
assert.equal(evidence.kind, 'frontier.lang.cssSemanticMergeEvidence');
assert.equal(evidence.status, 'needs-review');
assert.equal(evidence.autoMergeClaim, false);
assert.equal(evidence.semanticEquivalenceClaim, false);
assert.equal(evidence.browserCascadeEquivalenceClaim, false);
assert.equal(evidence.browserRenderEquivalenceClaim, false);

const tokenModulePath = ['.', '/', 'tokens.module.css'].join('');
const baseModulePath = ['.', '/', 'base.module.css'].join('');
const moduleSource = [
  `:import("${tokenModulePath}") {`,
  '  brandColor: colorToken;',
  '}',
  '.root {',
  `  composes: base primary from "${baseModulePath}";`,
  '  color: var(--brand);',
  '}',
  '.root :global(.external) { display: block; }',
  ':local(.active) { opacity: 1; }',
  ':export {',
  '  primaryColor: var(--brand);',
  '}'
].join('\n');
const moduleSheet = parseCssSemanticSheet(moduleSource, { sourcePath: 'Button.module.css' });
const moduleEvidence = createCssSemanticMergeEvidence(moduleSource, { sourcePath: 'Button.module.css' });
const provenModuleEvidence = createCssSemanticMergeEvidence(moduleSource, {
  sourcePath: 'Button.module.css',
  generatedClassNameMap: { root: 'Button_root__hash', active: 'Button_active__hash' },
  jsTsUseSiteGraphHash: 'hash_use_sites',
  cssModuleCompositionGraphHash: 'hash_composition',
  icssGraphHash: 'hash_icss'
});

assert.equal(moduleSheet.cssModules.kind, 'frontier.lang.cssModuleEvidence');
assert.equal(moduleSheet.cssModules.mode, 'css-modules');
assert.equal(moduleSheet.summary.cssModuleExports, 2);
assert.equal(moduleSheet.summary.cssModuleCompositions, 1);
assert.equal(moduleSheet.summary.icssImports, 1);
assert.equal(moduleSheet.summary.icssExports, 1);
assert.equal(moduleSheet.cssModules.exports.some((entry) => entry.name === 'root'), true);
assert.equal(moduleSheet.cssModules.exports.some((entry) => entry.name === 'active'), true);
assert.equal(moduleSheet.cssModules.exports.some((entry) => entry.name === 'external'), false);
const rootComposition = moduleSheet.cssModules.compositions.find((entry) => entry.localName === 'root');
assert.deepEqual(rootComposition.names, ['base', 'primary']);
assert.equal(rootComposition.source, './base.module.css');
assert.equal(rootComposition.sourceKind, 'file');
assert.equal(moduleSheet.cssModules.icssImports[0].source, './tokens.module.css');
assert.equal(moduleSheet.cssModules.icssImports[0].importedName, 'brandColor');
assert.equal(moduleSheet.cssModules.icssImports[0].localName, 'colorToken');
assert.equal(moduleSheet.cssModules.icssExports[0].name, 'primaryColor');
assert.equal(moduleEvidence.proofGaps.some((gap) => gap.code === 'css-module-generated-class-map-unproved'), true);
assert.equal(moduleEvidence.proofGaps.some((gap) => gap.code === 'css-module-js-ts-use-site-graph-unproved'), true);
assert.equal(moduleEvidence.proofGaps.some((gap) => gap.code === 'css-module-composition-resolution-unproved'), true);
assert.equal(moduleEvidence.proofGaps.some((gap) => gap.code === 'css-module-icss-graph-unproved'), true);
assert.equal(moduleEvidence.cssModuleGeneratedNameEquivalenceClaim, false);
assert.equal(moduleEvidence.cssModuleUseSiteEquivalenceClaim, false);
assert.equal(provenModuleEvidence.cssModules.generatedClassNameMapHash.startsWith('fnv1a32:'), true);
assert.equal(provenModuleEvidence.cssModules.proofGaps.length, 0);
assert.equal(provenModuleEvidence.status, 'ready');

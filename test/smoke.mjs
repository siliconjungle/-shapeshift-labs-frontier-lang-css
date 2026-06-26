import assert from 'node:assert/strict';
import { capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssSemanticMergeEvidence, emitCss, emitCssWithSourceMap, parseCssSemanticSheet, renderCssAst, renderCssAstWithSourceMap, safeMergeCssSource, toCssAst } from '../dist/index.js';
import './parser-evidence-smoke.mjs'; import './selector-target-smoke.mjs'; import './dependency-graph-smoke.mjs';

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

const scopedSource = '@media (min-width: 700px) {\n  .todo { color: red; padding-left: 1rem; }\n}';
const scopedWithoutProof = createCssSemanticMergeEvidence(scopedSource, { sourcePath: 'view.css' });
const scopedWithProof = createCssSemanticMergeEvidence(scopedSource, { sourcePath: 'view.css', scopedCascadeGraphHash: 'hash_scoped_cascade' });
assert.equal(scopedWithoutProof.proofGaps.some((gap) => gap.code === 'css-media-cascade-scope-unproved'), true);
assert.equal(scopedWithoutProof.proofGaps.some((gap) => gap.code === 'css-scoped-cascade-equivalence-unproved'), true);
assert.equal(scopedWithProof.proofGaps.some((gap) => gap.code === 'css-media-cascade-scope-unproved'), false);
assert.equal(scopedWithProof.proofGaps.some((gap) => gap.code === 'css-scoped-cascade-equivalence-unproved'), false);
assert.equal(scopedWithProof.status, 'ready');

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
const incompleteModuleEvidence = createCssSemanticMergeEvidence(moduleSource, {
  sourcePath: 'Button.module.css',
  generatedClassNameMap: { root: 'Button_root__hash' },
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
assert.equal(incompleteModuleEvidence.proofGaps.some((gap) => gap.code === 'css-module-generated-class-map-incomplete'), true);

const cssMergeBase = [
  '.button {',
  '  color: red;',
  '  padding: 1rem;',
  '}',
  ''
].join('\n');
const cssMergeWorker = [
  '.button {',
  '  color: blue;',
  '  padding: 1rem;',
  '}',
  ''
].join('\n');
const cssMergeHead = [
  '.button {',
  '  color: red;',
  '  padding: 1rem;',
  '  background-color: white;',
  '}',
  ''
].join('\n');
const cssMerged = safeMergeCssSource({
  id: 'css_independent_declarations',
  sourcePath: 'button.css',
  baseSourceText: cssMergeBase,
  workerSourceText: cssMergeWorker,
  headSourceText: cssMergeHead
});
assert.equal(cssMerged.kind, 'frontier.lang.cssSafeMerge');
assert.equal(cssMerged.status, 'merged');
assert.equal(cssMerged.operation, 'semantic-declaration-merge');
assert.match(cssMerged.mergedSourceText, /color: blue/);
assert.match(cssMerged.mergedSourceText, /background-color: white/);
assert.equal(cssMerged.autoMergeClaim, false);
assert.equal(cssMerged.semanticEquivalenceClaim, false);

const cssMergeConflict = safeMergeCssSource({
  id: 'css_overlapping_declaration_conflict',
  sourcePath: 'button.css',
  baseSourceText: cssMergeBase,
  workerSourceText: cssMergeWorker,
  headSourceText: cssMergeBase.replace('color: red', 'color: green')
});
assert.equal(cssMergeConflict.status, 'blocked');
assert.equal(cssMergeConflict.conflicts.some((conflict) => conflict.code === 'css-cascade-declaration-conflict'), true);
assert.equal(cssMergeConflict.admission.reasonCodes.includes('css-cascade-declaration-conflict'), true);

const cssShorthandMerge = safeMergeCssSource({
  id: 'css_independent_known_shorthand',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; padding: 1rem; }\n',
  workerSourceText: '.button { color: blue; padding: 1rem; }\n',
  headSourceText: '.button { color: red; padding: 1rem; background: white; }\n'
});
assert.equal(cssShorthandMerge.status, 'merged');
assert.match(cssShorthandMerge.mergedSourceText, /background: white/);
assert.match(cssShorthandMerge.mergedSourceText, /color: blue/);

const cssShorthandConflict = safeMergeCssSource({
  id: 'css_shorthand_longhand_conflict',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.button { color: red; background: white; }\n',
  headSourceText: '.button { color: red; background-color: black; }\n'
});
assert.equal(cssShorthandConflict.status, 'blocked');
assert.equal(cssShorthandConflict.conflicts.some((conflict) => conflict.code === 'css-shorthand-longhand-conflict'), true);

const cssScopedMergeBase = '@media (min-width: 700px) {\n  .button {\n    color: red;\n    padding-left: 1rem;\n  }\n}\n';
const cssScopedMergeWorker = '@media (min-width: 700px) {\n  .button {\n    color: blue;\n    padding-left: 1rem;\n  }\n}\n';
const cssScopedMergeHead = '@media (min-width: 700px) {\n  .button {\n    color: red;\n    padding-left: 1rem;\n    background-color: white;\n  }\n}\n';
const cssScopedMergeMissingProof = safeMergeCssSource({
  id: 'css_scoped_declaration_missing_proof',
  sourcePath: 'button.css',
  baseSourceText: cssScopedMergeBase,
  workerSourceText: cssScopedMergeWorker,
  headSourceText: cssScopedMergeHead
});
assert.equal(cssScopedMergeMissingProof.status, 'blocked');
assert.equal(cssScopedMergeMissingProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-scoped-cascade-equivalence-unproved'), true);

const cssScopedMerge = safeMergeCssSource({
  id: 'css_scoped_declaration_proven',
  sourcePath: 'button.css',
  baseSourceText: cssScopedMergeBase,
  workerSourceText: cssScopedMergeWorker,
  headSourceText: cssScopedMergeHead,
  scopedCascadeGraphHash: 'hash_scoped_cascade'
});
assert.equal(cssScopedMerge.status, 'merged');
assert.match(cssScopedMerge.mergedSourceText, /@media \(min-width: 700px\) \{/);
assert.match(cssScopedMerge.mergedSourceText, /color: blue/);
assert.match(cssScopedMerge.mergedSourceText, /background-color: white/);
const cssLayerStatementMerge = safeMergeCssSource({
  id: 'css_layer_statement_preserved',
  baseSourceText: '@layer reset, components;\n.button { color: red; }\n',
  workerSourceText: '@layer reset, components;\n.button { color: blue; }\n',
  headSourceText: '@layer reset, components;\n.button { color: red; }\n'
});
assert.equal(cssLayerStatementMerge.status, 'merged');
assert.match(cssLayerStatementMerge.mergedSourceText, /@layer reset, components;/);
const cssLayerStatementConflict = safeMergeCssSource({ id: 'css_layer_statement_conflict', baseSourceText: '@layer reset, components;\n.button { color: red; }\n', workerSourceText: '@layer components, reset;\n.button { color: red; }\n', headSourceText: '@layer reset, components;\n.button { color: blue; }\n' });
assert.equal(cssLayerStatementConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'css-layer-order-statement-unsupported'), true);
const cssOneSidedScopeConflict = safeMergeCssSource({ id: 'css_one_sided_scope_conflict', baseSourceText: '.button { color: red; }\n', workerSourceText: '@media (min-width: 700px) { .button { color: red; } }\n', headSourceText: '.button { color: red; }\n', scopedCascadeGraphHash: 'hash_scoped_cascade' });
assert.equal(cssOneSidedScopeConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'css-atrule-new-scope-unsupported'), true);

const cssModuleMergeBase = [
  '.root {',
  '  color: red;',
  '}',
  ''
].join('\n');
const cssModuleMergeWorkerAddsExport = [
  '.root {',
  '  color: red;',
  '}',
  '.label {',
  '  font-weight: 600;',
  '}',
  ''
].join('\n');
const cssModuleMergeHeadChangesStyle = [
  '.root {',
  '  color: blue;',
  '}',
  ''
].join('\n');
const cssModuleMissingProof = safeMergeCssSource({
  id: 'css_module_missing_contract_proof',
  sourcePath: 'Button.module.css',
  baseSourceText: cssModuleMergeBase,
  workerSourceText: cssModuleMergeWorkerAddsExport,
  headSourceText: cssModuleMergeHeadChangesStyle
});
assert.equal(cssModuleMissingProof.status, 'blocked');
assert.equal(cssModuleMissingProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-module-js-ts-use-site-graph-unproved'), true);

const cssModuleContractMerge = safeMergeCssSource({
  id: 'css_module_contract_merge',
  sourcePath: 'Button.module.css',
  baseSourceText: cssModuleMergeBase,
  workerSourceText: cssModuleMergeWorkerAddsExport,
  headSourceText: cssModuleMergeHeadChangesStyle,
  generatedClassNameMap: { root: 'Button_root__hash', label: 'Button_label__hash' },
  jsTsUseSiteGraphHash: 'hash_css_module_use_sites'
});
assert.equal(cssModuleContractMerge.status, 'merged');
assert.equal(cssModuleContractMerge.workerChangedCssModuleContracts, 1);
assert.match(cssModuleContractMerge.mergedSourceText, /\.label/);
assert.match(cssModuleContractMerge.mergedSourceText, /color: blue/);

const cssModuleCompositionMissingProof = safeMergeCssSource({
  id: 'css_module_composition_missing_proof',
  sourcePath: 'Button.module.css',
  baseSourceText: '.root { color: red; }\n',
  workerSourceText: '.root { color: red; composes: base from "./base.module.css"; }\n',
  headSourceText: '.root { color: blue; }\n',
  generatedClassNameMap: { root: 'Button_root__hash' },
  jsTsUseSiteGraphHash: 'hash_css_module_use_sites'
});
assert.equal(cssModuleCompositionMissingProof.status, 'blocked');
assert.equal(cssModuleCompositionMissingProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-module-composition-resolution-unproved'), true);

const cssModuleCompositionMerge = safeMergeCssSource({
  id: 'css_module_composition_merge',
  sourcePath: 'Button.module.css',
  baseSourceText: '.root { color: red; }\n',
  workerSourceText: '.root { color: red; composes: base from "./base.module.css"; }\n',
  headSourceText: '.root { color: blue; }\n',
  generatedClassNameMap: { root: 'Button_root__hash' },
  jsTsUseSiteGraphHash: 'hash_css_module_use_sites',
  cssModuleCompositionGraphHash: 'hash_composition_graph'
});
assert.equal(cssModuleCompositionMerge.status, 'merged');
assert.match(cssModuleCompositionMerge.mergedSourceText, /composes: base from "\.\/base\.module\.css"/);

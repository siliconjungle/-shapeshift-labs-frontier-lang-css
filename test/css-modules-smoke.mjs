import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssSemanticMergeEvidence, parseCssSemanticSheet, safeMergeCssSource } from '../dist/index.js';

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
const localModuleSource = [
  '.base { display: block; }',
  '.root {',
  '  composes: base;',
  '  color: red;',
  '}',
  ':export {',
  '  primaryColor: red;',
  '}'
].join('\n');
const localModuleEvidence = createCssSemanticMergeEvidence(localModuleSource, {
  sourcePath: 'Local.module.css',
  generatedClassNameMap: { base: 'Local_base__hash', root: 'Local_root__hash' },
  jsTsUseSiteGraphHash: 'hash_local_use_sites'
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
assert.equal(localModuleEvidence.cssModules.cssModuleCompositionGraphHash.startsWith('fnv1a32:'), true);
assert.equal(localModuleEvidence.cssModules.cssModuleCompositionGraphSource, 'source-local');
assert.equal(localModuleEvidence.cssModules.icssGraphHash.startsWith('fnv1a32:'), true);
assert.equal(localModuleEvidence.cssModules.icssGraphSource, 'source-export-only');
assert.equal(localModuleEvidence.proofGaps.some((gap) => gap.code === 'css-module-composition-resolution-unproved'), false);
assert.equal(localModuleEvidence.proofGaps.some((gap) => gap.code === 'css-module-icss-graph-unproved'), false);
assert.equal(localModuleEvidence.status, 'ready');

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
const cssModuleMergeOutput = [
  '.root {',
  '  color: blue;',
  '}',
  '',
  '.label {',
  '  font-weight: 600;',
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

const cssModuleHashOnlyProof = safeMergeCssSource({
  id: 'css_module_hash_only_contract_proof',
  sourcePath: 'Button.module.css',
  baseSourceText: cssModuleMergeBase,
  workerSourceText: cssModuleMergeWorkerAddsExport,
  headSourceText: cssModuleMergeHeadChangesStyle,
  generatedClassNameMap: { root: 'Button_root__hash', label: 'Button_label__hash' },
  jsTsUseSiteGraphHash: 'hash_css_module_use_sites',
  includeBlockedMergeCandidate: true
});
assert.equal(cssModuleHashOnlyProof.status, 'blocked');
assert.equal(cssModuleHashOnlyProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-module-contract-source-proof-unproved'), true);
assert.equal(cssModuleHashOnlyProof.candidateMergedSourceText, cssModuleMergeOutput);
assert.equal(typeof cssModuleHashOnlyProof.candidateMergedSourceHash, 'string');

const cssModuleContractMerge = safeMergeCssSource({
  id: 'css_module_contract_merge',
  sourcePath: 'Button.module.css',
  baseSourceText: cssModuleMergeBase,
  workerSourceText: cssModuleMergeWorkerAddsExport,
  headSourceText: cssModuleMergeHeadChangesStyle,
  generatedClassNameMap: { root: 'Button_root__hash', label: 'Button_label__hash' },
  jsTsUseSiteGraphHash: 'hash_css_module_use_sites',
  cssModuleContractProofs: [{
    id: 'proof_css_module_label_export',
    kind: 'css-source-bound-module-contract-proof',
    status: 'passed',
    sourcePath: 'Button.module.css',
    side: 'worker',
    changeKind: 'add',
    contractKey: 'export:label',
    contractKind: 'css-module-export',
    baseSourceHash: hashSemanticValue(cssModuleMergeBase),
    workerSourceHash: hashSemanticValue(cssModuleMergeWorkerAddsExport),
    headSourceHash: hashSemanticValue(cssModuleMergeHeadChangesStyle),
    outputSourceHash: hashSemanticValue(cssModuleMergeOutput),
    moduleHash: parseCssSemanticSheet(cssModuleMergeWorkerAddsExport, { sourcePath: 'Button.module.css', generatedClassNameMap: { root: 'Button_root__hash', label: 'Button_label__hash' }, jsTsUseSiteGraphHash: 'hash_css_module_use_sites' }).cssModules.moduleHash,
    generatedClassNameMapHash: hashSemanticValue({ kind: 'frontier.lang.css.modules.generatedClassNameMap.v1', generatedClassNameMap: { root: 'Button_root__hash', label: 'Button_label__hash' } }),
    jsTsUseSiteGraphHash: 'hash_css_module_use_sites'
  }]
});
assert.equal(cssModuleContractMerge.status, 'merged');
assert.equal(cssModuleContractMerge.workerChangedCssModuleContracts, 1);
assert.equal(cssModuleContractMerge.cssModuleContractProofs.length, 1);
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
  cssModuleCompositionGraphHash: 'hash_composition_graph',
  cssModuleContractProofs: [{
    id: 'proof_css_module_composition',
    kind: 'css-source-bound-module-contract-proof',
    status: 'passed',
    sourcePath: 'Button.module.css',
    side: 'worker',
    changeKind: 'add',
    contractKey: 'composition:root:file:./base.module.css',
    contractKind: 'css-module-composition',
    baseSourceText: '.root { color: red; }\n',
    workerSourceText: '.root { color: red; composes: base from "./base.module.css"; }\n',
    headSourceText: '.root { color: blue; }\n',
    outputSourceText: '.root {\n  color: blue;\n  composes: base from "./base.module.css";\n}\n',
    moduleHash: parseCssSemanticSheet('.root { color: red; composes: base from "./base.module.css"; }\n', { sourcePath: 'Button.module.css', generatedClassNameMap: { root: 'Button_root__hash' }, jsTsUseSiteGraphHash: 'hash_css_module_use_sites', cssModuleCompositionGraphHash: 'hash_composition_graph' }).cssModules.moduleHash,
    cssModuleCompositionGraphHash: 'hash_composition_graph'
  }]
});
assert.equal(cssModuleCompositionMerge.status, 'merged');
assert.equal(cssModuleCompositionMerge.cssModuleContractProofs.length, 1);
assert.match(cssModuleCompositionMerge.mergedSourceText, /composes: base from "\.\/base\.module\.css"/);

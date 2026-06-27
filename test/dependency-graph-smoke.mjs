import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssSemanticMergeEvidence, parseCssSemanticSheet, safeMergeCssSource } from '../dist/index.js';

const dependencySource = [
  ':root {',
  '  --motion-name: fade;',
  '  --asset-url: url("./spinner.svg");',
  '}',
  '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
  '@font-face {',
  '  font-family: "Inter";',
  '  src: url("./inter.woff2");',
  '}',
  '.spinner {',
  '  animation-name: var(--motion-name, fade);',
  '  background-image: var(--asset-url, url("./fallback.svg"));',
  '  font-family: "Inter", sans-serif;',
  '}',
  ''
].join('\n');

const sheet = parseCssSemanticSheet(dependencySource, { sourcePath: 'spinner.css' });
const graph = sheet.dependencyGraphEvidence;
assert.equal(graph.kind, 'frontier.lang.cssDependencyGraphEvidence');
assert.equal(graph.hasDependencySurface, true);
assert.equal(graph.dependencyGraphHashPresent, true);
assert.equal(graph.cssDependencyGraphHashPresent, true);
assert.equal(typeof graph.dependencyGraphHash, 'string');
assert.equal(graph.customPropertyDefinitions, 2);
assert.equal(graph.customPropertyReferences, 2);
assert.equal(graph.varReferences, 2);
assert.equal(graph.varFallbackReferences, 2);
assert.equal(graph.keyframeDefinitions, 1);
assert.equal(graph.animationNameLinks, 1);
assert.equal(graph.keyframeLinks, 1);
assert.equal(graph.fontFaceDefinitions, 1);
assert.equal(graph.fontFaceLinks, 1);
assert.equal(graph.urlAssetReferences, 3);
assert.equal(graph.browserCascadeEquivalenceClaim, false);
assert.equal(graph.browserRenderEquivalenceClaim, false);
assert.equal(graph.semanticEquivalenceClaim, false);
assert.equal(sheet.summary.dependencySurfaceCount, graph.dependencySurfaceCount);
assert.equal(sheet.summary.customPropertyReferences, 2);
assert.equal(sheet.summary.urlAssetReferences, 3);

const descriptorSource = [
  '@property --brand-hue {',
  '  syntax: "<number>";',
  '  inherits: false;',
  '  initial-value: 210;',
  '}',
  '@page :first {',
  '  margin: 1cm;',
  '  size: A4;',
  '  @top-left { content: "Draft"; }',
  '}',
  ''
].join('\n');
const descriptorSheet = parseCssSemanticSheet(descriptorSource, { sourcePath: 'runtime.css' });
const descriptorGraph = descriptorSheet.dependencyGraphEvidence;
assert.equal(descriptorGraph.hasDependencySurface, true);
assert.equal(descriptorGraph.propertyRegistrations, 1);
assert.equal(descriptorGraph.propertyRegistrationDescriptors, 3);
assert.equal(descriptorGraph.pageDescriptors, 2);
assert.equal(descriptorGraph.pageMarginDescriptors, 1);
assert.equal(descriptorSheet.summary.propertyRegistrations, 1);
assert.equal(descriptorSheet.summary.pageDescriptors, 2);
assert.equal(descriptorGraph.records.propertyRegistrations[0].name, '--brand-hue');
assert.equal(descriptorGraph.records.propertyRegistrations[0].syntax, '"<number>"');
assert.equal(descriptorGraph.records.propertyRegistrationDescriptors.some((entry) => entry.descriptorName === 'initial-value' && entry.value === '210'), true);
assert.equal(descriptorGraph.records.pageDescriptors.some((entry) => entry.pageSelector === ':first' && entry.property === 'size' && entry.value === 'A4'), true);
assert.equal(descriptorGraph.records.pageMarginDescriptors.some((entry) => entry.marginBox === '@top-left' && entry.property === 'content'), true);
assert.equal(descriptorGraph.semanticEquivalenceClaim, false);
assert.equal(descriptorGraph.browserRenderEquivalenceClaim, false);

const evidence = createCssSemanticMergeEvidence(dependencySource, { sourcePath: 'spinner.css' });
assert.equal(evidence.dependencyGraphEvidence.dependencyGraphHash, graph.dependencyGraphHash);
assert.equal(evidence.browserCascadeEquivalenceClaim, false);
assert.equal(evidence.browserRenderEquivalenceClaim, false);

const base = [
  ':root { --motion-name: fade; }',
  '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
  '.spinner { animation-name: var(--motion-name, fade); color: red; }',
  ''
].join('\n');
const worker = base.replace('--motion-name: fade', '--motion-name: fade-fast');
const head = base.replace('color: red', 'color: blue');
const blockedMerge = safeMergeCssSource({
  id: 'css_dependency_graph_merge_evidence',
  sourcePath: 'spinner.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head
});
assert.equal(blockedMerge.status, 'blocked');
assert.equal(blockedMerge.dependencyGraphEvidence.kind, 'frontier.lang.cssSafeMergeDependencyGraphEvidence');
assert.equal(blockedMerge.dependencyGraphEvidence.hasDependencySurface, true);
assert.equal(blockedMerge.dependencyGraphEvidence.dependencyGraphHashPresent, true);
assert.equal(blockedMerge.dependencyGraphEvidence.cssDependencyGraphHashPresent, true);
assert.equal(blockedMerge.dependencyGraphEvidence.changedDependencySurfaceCount, 1);
assert.equal(blockedMerge.dependencyGraphEvidence.changedDependencySurfaces[0].cascadeKey, ':root::--motion-name');
assert.equal(blockedMerge.dependencyGraphEvidence.changedDependencySurfaces[0].reasonCode, 'css-dependency-graph-proof-unproved');
assert.equal(blockedMerge.dependencyGraphEvidence.semanticEquivalenceClaim, false);
assert.equal(blockedMerge.dependencyGraphEvidence.browserCascadeEquivalenceClaim, false);
assert.equal(blockedMerge.dependencyGraphEvidence.sides.worker.customPropertyDefinitions, 1);
assert.equal(blockedMerge.conflicts.some((item) => item.details.reasonCode === 'css-dependency-graph-proof-unproved'), true);

const provenOutput = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }\n\n:root {\n  --motion-name: fade-fast;\n}\n\n.spinner {\n  animation-name: var(--motion-name, fade);\n  color: blue;\n}\n';
const graphHash = (sourceText) => parseCssSemanticSheet(sourceText, { sourcePath: 'spinner.css' }).dependencyGraphEvidence.dependencyGraphHash;
const provenMerge = safeMergeCssSource({
  id: 'css_dependency_graph_merge_proven',
  sourcePath: 'spinner.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  cssDependencyGraphProofs: [{
    id: 'proof_css_dependency_graph_motion_name',
    kind: 'css-source-bound-dependency-graph-proof',
    status: 'passed',
    sourcePath: 'spinner.css',
    reasonCode: 'css-dependency-graph-proof-unproved',
    side: 'worker',
    cascadeKey: ':root::--motion-name',
    baseSourceHash: hashSemanticValue(base),
    workerSourceHash: hashSemanticValue(worker),
    headSourceHash: hashSemanticValue(head),
    outputSourceHash: hashSemanticValue(provenOutput),
    dependencyGraphHashes: { base: graphHash(base), worker: graphHash(worker), head: graphHash(head) }
  }]
});
assert.equal(provenMerge.status, 'merged');
assert.equal(provenMerge.mergedSourceText, provenOutput);
assert.equal(provenMerge.dependencyGraphProofs.length, 1);
assert.equal(provenMerge.admission.cssDependencyGraphProofs.length, 1);

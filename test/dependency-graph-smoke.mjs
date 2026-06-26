import assert from 'node:assert/strict';
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
const merge = safeMergeCssSource({
  id: 'css_dependency_graph_merge_evidence',
  sourcePath: 'spinner.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head
});
assert.equal(merge.status, 'merged');
assert.equal(merge.dependencyGraphEvidence.kind, 'frontier.lang.cssSafeMergeDependencyGraphEvidence');
assert.equal(merge.dependencyGraphEvidence.hasDependencySurface, true);
assert.equal(merge.dependencyGraphEvidence.dependencyGraphHashPresent, true);
assert.equal(merge.dependencyGraphEvidence.cssDependencyGraphHashPresent, true);
assert.equal(merge.dependencyGraphEvidence.changedDependencySurfaceCount, 1);
assert.equal(merge.dependencyGraphEvidence.semanticEquivalenceClaim, false);
assert.equal(merge.dependencyGraphEvidence.browserCascadeEquivalenceClaim, false);
assert.equal(merge.dependencyGraphEvidence.sides.worker.customPropertyDefinitions, 1);

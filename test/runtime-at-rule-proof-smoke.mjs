import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeCssSource } from '../dist/index.js';

const propertyBase = '@property --brand-hue { syntax: "<number>"; inherits: false; initial-value: 210; }\n.button { color: red; }\n';
const propertyWorker = propertyBase.replace('initial-value: 210', 'initial-value: 250');
const propertyHead = propertyBase.replace('color: red', 'color: blue');
const propertyOutput = '@property --brand-hue { syntax: "<number>"; inherits: false; initial-value: 250; }\n\n.button {\n  color: blue;\n}\n';
const propertyUnproved = safeMergeCssSource({
  id: 'css_property_runtime_unproved',
  sourcePath: 'props.css',
  baseSourceText: propertyBase,
  workerSourceText: propertyWorker,
  headSourceText: propertyHead
});
assert.equal(propertyUnproved.status, 'blocked');
assert.equal(propertyUnproved.dependencyGraphEvidence.propertyRegistrations, 1);
assert.equal(propertyUnproved.dependencyGraphEvidence.propertyRegistrationDescriptors, 3);
assert.equal(propertyUnproved.conflicts.some((item) => item.details.reasonCode === 'css-property-runtime-equivalence-unproved'), true);

const propertyProven = safeMergeCssSource({
  id: 'css_property_runtime_proven',
  sourcePath: 'props.css',
  baseSourceText: propertyBase,
  workerSourceText: propertyWorker,
  headSourceText: propertyHead,
  cssCascadeRuntimeProofs: [runtimeProof({
    id: 'proof_css_property_runtime',
    sourcePath: 'props.css',
    reasonCode: 'css-property-runtime-equivalence-unproved',
    shapeKey: 'at-rule:property::--brand-hue',
    base: propertyBase,
    worker: propertyWorker,
    head: propertyHead,
    output: propertyOutput
  })]
});
assert.equal(propertyProven.status, 'merged');
assert.equal(propertyProven.mergedSourceText, propertyOutput);

const pageBase = '@page { margin: 1cm; }\n.article { color: red; }\n';
const pageWorker = pageBase.replace('margin: 1cm', 'margin: 0.75cm');
const pageHead = pageBase.replace('color: red', 'color: blue');
const pageOutput = '@page { margin: 0.75cm; }\n\n.article {\n  color: blue;\n}\n';
const pageUnproved = safeMergeCssSource({
  id: 'css_page_runtime_unproved',
  sourcePath: 'print.css',
  baseSourceText: pageBase,
  workerSourceText: pageWorker,
  headSourceText: pageHead
});
assert.equal(pageUnproved.status, 'blocked');
assert.equal(pageUnproved.dependencyGraphEvidence.pageDescriptors, 1);
assert.equal(pageUnproved.conflicts.some((item) => item.details.reasonCode === 'css-page-runtime-equivalence-unproved'), true);

const pageProven = safeMergeCssSource({
  id: 'css_page_runtime_proven',
  sourcePath: 'print.css',
  baseSourceText: pageBase,
  workerSourceText: pageWorker,
  headSourceText: pageHead,
  cssCascadeRuntimeProofs: [runtimeProof({
    id: 'proof_css_page_runtime',
    sourcePath: 'print.css',
    reasonCode: 'css-page-runtime-equivalence-unproved',
    shapeKey: 'at-rule:page::',
    base: pageBase,
    worker: pageWorker,
    head: pageHead,
    output: pageOutput
  })]
});
assert.equal(pageProven.status, 'merged');
assert.equal(pageProven.mergedSourceText, pageOutput);

function runtimeProof({ id, sourcePath, reasonCode, shapeKey, base, worker, head, output }) {
  return { id, kind: 'css-source-bound-cascade-runtime-proof', status: 'passed', sourcePath, reasonCode, side: 'worker', shapeKey, baseSourceHash: hashSemanticValue(base), workerSourceHash: hashSemanticValue(worker), headSourceHash: hashSemanticValue(head), outputSourceHash: hashSemanticValue(output) };
}

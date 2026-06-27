import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { parseCssSemanticSheet, safeMergeCssSource } from '../dist/index.js';

const base = [
  '@container card (min-width: 300px) {',
  '  .button {',
  '    color: red;',
  '    padding-left: 1rem;',
  '  }',
  '}',
  ''
].join('\n');
const worker = base.replace('color: red', 'color: blue');
const head = base.replace('padding-left: 1rem;', 'padding-left: 1rem;\n    background-color: white;');
const output = [
  '@container card (min-width: 300px) {',
  '  .button {',
  '    color: blue;',
  '    padding-left: 1rem;',
  '    background-color: white;',
  '  }',
  '}',
  ''
].join('\n');
const proof = {
  id: 'proof_css_container_scoped_cascade',
  kind: 'css-source-bound-scoped-cascade-proof',
  status: 'passed',
  sourcePath: 'card.css',
  reasonCodes: ['css-scoped-cascade-equivalence-unproved', 'css-container-cascade-scope-unproved'],
  sides: ['worker', 'head'],
  selectors: ['.button'],
  scopes: ['@container card (min-width: 300px)'],
  cascadeKeys: ['@container card (min-width: 300px)::.button::color', '@container card (min-width: 300px)::.button::background-color'],
  properties: ['color', 'background-color'],
  scopedCascadeGraphHash: 'hash_container_scope',
  baseSourceHash: hashSemanticValue(base),
  workerSourceHash: hashSemanticValue(worker),
  headSourceHash: hashSemanticValue(head),
  outputSourceHash: hashSemanticValue(output)
};
const shapeKey = '@container card (min-width: 300px)';
const shapeGraphHash = 'hash_container_scope_shape_keyed';

const shapeSheet = parseCssSemanticSheet(base, {
  sourcePath: 'card.css',
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: shapeGraphHash }
});
const shapeRule = shapeSheet.records.find((record) => record.kind === 'rule' && record.selectors?.includes('.button'));
assert.equal(shapeRule.scopedCascadeGraphShapeKey, shapeKey);
assert.equal(shapeRule.scopedCascadeGraphHash, shapeGraphHash);

const hashOnly = safeMergeCssSource({
  id: 'css_container_scope_hash_only',
  sourcePath: 'card.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHash: 'hash_container_scope'
});
assert.equal(hashOnly.status, 'blocked');
assert.equal(hashOnly.conflicts.some((conflict) => conflict.code === 'css-scoped-cascade-proof-blocked'), true);

const wrongOutput = safeMergeCssSource({
  id: 'css_container_scope_wrong_output',
  sourcePath: 'card.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHash: 'hash_container_scope',
  cssScopedCascadeProofs: [{ ...proof, outputSourceHash: hashSemanticValue('wrong output') }]
});
assert.equal(wrongOutput.status, 'blocked');
assert.equal(wrongOutput.conflicts.some((conflict) => conflict.details.reasonCode === 'css-scoped-cascade-equivalence-unproved'), true);

const wrongShape = safeMergeCssSource({
  id: 'css_container_scope_wrong_shape',
  sourcePath: 'card.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: shapeGraphHash },
  cssScopedCascadeProofs: [{ ...proof, scopedCascadeGraphHash: shapeGraphHash, scopedCascadeGraphShapeKey: '@media (min-width: 300px)' }]
});
assert.equal(wrongShape.status, 'blocked');
assert.equal(wrongShape.conflicts.some((conflict) => conflict.code === 'css-scoped-cascade-proof-blocked'), true);

const shapeKeyed = safeMergeCssSource({
  id: 'css_container_scope_shape_keyed',
  sourcePath: 'card.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: shapeGraphHash },
  cssScopedCascadeProofs: [{
    ...proof,
    scopedCascadeGraphHash: undefined,
    scopedCascadeGraphShapeKey: shapeKey,
    scopedCascadeGraphHashesByShapeKey: { [shapeKey]: shapeGraphHash }
  }]
});
assert.equal(shapeKeyed.status, 'merged');
assert.equal(shapeKeyed.scopedCascadeProofs.every((record) => record.scopedCascadeGraphShapeKey === shapeKey), true);

const proven = safeMergeCssSource({
  id: 'css_container_scope_proven',
  sourcePath: 'card.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHash: 'hash_container_scope',
  cssScopedCascadeProofs: [proof]
});
assert.equal(proven.status, 'merged');
assert.equal(proven.mergedSourceText, output);
assert.equal(proven.scopedCascadeProofs.length, 2);
assert.equal(proven.admission.cssScopedCascadeProofs.length, 2);
assert.equal(proven.browserCascadeEquivalenceClaim, false);

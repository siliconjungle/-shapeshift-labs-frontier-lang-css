import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeCssSource } from '../dist/index.js';

const base = '.button { color: red; }\n';
const worker = '@media (min-width: 700px) { .button { color: red; } }\n';
const output = '@media (min-width: 700px) {\n  .button {\n    color: red;\n  }\n}\n';
const proof = {
  id: 'proof_css_source_shape_media',
  kind: 'css-source-bound-cascade-runtime-proof',
  status: 'passed',
  sourcePath: 'button.css',
  reasonCode: 'css-atrule-new-scope-unsupported',
  side: 'worker',
  shapeKey: 'at-rule:media::(min-width: 700px)',
  baseSourceHash: hashSemanticValue(base),
  workerSourceHash: hashSemanticValue(worker),
  headSourceHash: hashSemanticValue(base),
  outputSourceHash: hashSemanticValue(output),
  runtimeCommand: 'playwright test css-cascade-runtime.spec.ts',
  runtimeProbeId: 'css-media-cascade-probe',
  runtimeEvidenceHash: hashSemanticValue('button.css media cascade runtime evidence'),
  runtimeSignals: ['css-cascade-runtime']
};

const sourceHashOnlyProof = { ...proof };
delete sourceHashOnlyProof.runtimeCommand;
delete sourceHashOnlyProof.runtimeProbeId;
delete sourceHashOnlyProof.runtimeEvidenceHash;
delete sourceHashOnlyProof.runtimeSignals;
const missingRuntimeEvidence = safeMergeCssSource({
  id: 'css_source_shape_source_hash_only',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [sourceHashOnlyProof]
});
assert.equal(missingRuntimeEvidence.status, 'blocked');
assert.equal(missingRuntimeEvidence.conflicts.some((conflict) => conflict.details.reasonCode === 'css-atrule-new-scope-unsupported'), true);

const wrongProof = safeMergeCssSource({
  id: 'css_source_shape_wrong_proof',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [{ ...proof, outputSourceHash: hashSemanticValue('wrong output') }]
});
assert.equal(wrongProof.status, 'blocked');
assert.equal(wrongProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-atrule-new-scope-unsupported'), true);

const proven = safeMergeCssSource({
  id: 'css_source_shape_proven',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [proof]
});
assert.equal(proven.status, 'merged');
assert.equal(proven.browserCascadeEquivalenceClaim, true);
assert.equal(proven.browserRenderEquivalenceClaim, false);
assert.equal(proven.admission.browserCascadeEquivalenceClaim, true);
assert.equal(proven.cascadeRuntimeProofs.length, 1);
assert.equal(proven.cascadeRuntimeProofs[0].reasonCode, 'css-atrule-new-scope-unsupported');
assert.equal(proven.cascadeRuntimeProofs[0].runtimeEvidenceBound, true);
assert.equal(proven.cascadeRuntimeProofs[0].runtimeEvidenceHash, proof.runtimeEvidenceHash);
assert.deepEqual(proven.cascadeRuntimeProofs[0].requiredRuntimeSignals, ['css-cascade-runtime', 'cascade-runtime', 'browser-cascade-runtime']);
assert.equal(proven.mergedSourceText, output);

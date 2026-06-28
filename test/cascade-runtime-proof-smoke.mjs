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

const capsuleProof = {
  id: 'proof_css_source_shape_media_capsule',
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
  runtimeProofCapsule: {
    mode: 'isolated-fixture',
    status: 'passed',
    command: 'playwright test css-cascade-runtime-capsule.spec.ts',
    probeId: 'css:button:media-cascade-capsule',
    evidenceHash: hashSemanticValue('button.css media cascade runtime capsule evidence'),
    signals: ['css-cascade-runtime'],
    browser: { name: 'chromium', version: 'stable' },
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    artifacts: { sourceHash: 'css-capsule-source', cssHash: 'css-capsule-stylesheet' },
    telemetry: {
      hash: 'css-capsule-telemetry',
      domSnapshotHash: 'css-capsule-dom',
      computedStyleHash: 'css-capsule-style',
      layoutSnapshotHash: 'css-capsule-layout',
      eventTraceHash: 'css-capsule-events',
      cumulativeLayoutShift: 0
    }
  }
};

const capsuleProven = safeMergeCssSource({
  id: 'css_source_shape_capsule_proven',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [capsuleProof]
});
assert.equal(capsuleProven.status, 'merged');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeCommand, 'playwright test css-cascade-runtime-capsule.spec.ts');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeProofMode, 'isolated-fixture');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeBrowserName, 'chromium');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeViewport.width, 1280);
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeTelemetryHash, 'css-capsule-telemetry');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeDomSnapshotHash, 'css-capsule-dom');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeComputedStyleHash, 'css-capsule-style');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeLayoutSnapshotHash, 'css-capsule-layout');
assert.equal(capsuleProven.cascadeRuntimeProofs[0].runtimeCumulativeLayoutShift, 0);
assert.equal(typeof capsuleProven.cascadeRuntimeProofs[0].runtimeProofCapsuleHash, 'string');

const blockedCapsuleProof = {
  ...capsuleProof,
  id: 'proof_css_source_shape_media_capsule_blocked',
  runtimeProofCapsule: {
    mode: 'environment-blocked',
    status: 'blocked',
    command: 'playwright test css-cascade-runtime-capsule.spec.ts',
    probeId: 'css:button:media-cascade-capsule',
    evidenceHash: hashSemanticValue('button.css media cascade runtime capsule blocked'),
    signals: ['css-cascade-runtime']
  }
};
const blockedCapsule = safeMergeCssSource({
  id: 'css_source_shape_capsule_blocked',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [blockedCapsuleProof]
});
assert.equal(blockedCapsule.status, 'blocked');
assert.equal(blockedCapsule.conflicts.some((conflict) => conflict.details.reasonCode === 'css-atrule-new-scope-unsupported'), true);

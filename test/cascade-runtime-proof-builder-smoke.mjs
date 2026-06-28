import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssCascadeRuntimeProof, safeMergeCssSource } from '../dist/index.js';

const base = '.button { color: red; }\n';
const worker = '@media (min-width: 700px) { .button { color: red; } }\n';
const output = '@media (min-width: 700px) {\n  .button {\n    color: red;\n  }\n}\n';
const proof = createCssCascadeRuntimeProof({
  id: 'proof_css_builder_media_runtime',
  sourcePath: 'button.css',
  reasonCode: 'css-atrule-new-scope-unsupported',
  side: 'worker',
  shapeKey: 'at-rule:media::(min-width: 700px)',
  base,
  worker,
  head: base,
  output,
  runtimeCommand: 'playwright test css-cascade-runtime.spec.ts',
  runtimeProbeId: 'css:button:media-cascade',
  runtimeEvidenceHash: hashSemanticValue('css builder runtime evidence'),
  runtimeSignals: ['css-cascade-runtime']
});

assert.equal(proof.kind, 'css-source-bound-cascade-runtime-proof');
assert.equal(proof.status, 'passed');
assert.equal(proof.baseSourceHash, hashSemanticValue(base));
assert.equal(proof.outputSourceHash, hashSemanticValue(output));
assert.equal(proof.runtimeEvidenceBound, true);
assert.equal(proof.browserCascadeEquivalenceClaim, false);
assert.equal(proof.autoMergeClaim, false);

const capsuleProof = createCssCascadeRuntimeProof({
  id: 'proof_css_builder_media_runtime_capsule',
  sourcePath: 'button.css',
  reasonCode: 'css-atrule-new-scope-unsupported',
  side: 'worker',
  shapeKey: 'at-rule:media::(min-width: 700px)',
  base,
  worker,
  head: base,
  output,
  runtimeProofCapsule: {
    mode: 'app-shell-fixture',
    status: 'passed',
    command: 'playwright test css-builder-runtime-capsule.spec.ts',
    probeId: 'css:button:media-cascade-builder',
    evidenceHash: hashSemanticValue('css builder runtime capsule evidence'),
    signals: ['css-cascade-runtime'],
    telemetry: { hash: 'css-builder-capsule-telemetry', cumulativeLayoutShift: 0 }
  }
});
assert.equal(capsuleProof.runtimeCommand, 'playwright test css-builder-runtime-capsule.spec.ts');
assert.equal(capsuleProof.runtimeProofMode, 'app-shell-fixture');
assert.equal(capsuleProof.runtimeTelemetryHash, 'css-builder-capsule-telemetry');

const proven = safeMergeCssSource({
  id: 'css_builder_runtime_proven',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [proof]
});
assert.equal(proven.status, 'merged');
assert.equal(proven.cascadeRuntimeProofs[0].runtimeEvidenceBound, true);
assert.equal(proven.cascadeRuntimeProofs[0].browserCascadeEquivalenceClaim, true);
assert.equal(proven.mergedSourceText, output);

const incomplete = createCssCascadeRuntimeProof({
  sourcePath: 'button.css',
  reasonCode: 'css-atrule-new-scope-unsupported',
  side: 'worker',
  shapeKey: 'at-rule:media::(min-width: 700px)',
  base,
  worker,
  head: base,
  output,
  runtimeCommand: 'playwright test css-cascade-runtime.spec.ts',
  runtimeProbeId: 'css:button:media-cascade',
  runtimeEvidenceHash: hashSemanticValue('css builder runtime evidence')
});
const blocked = safeMergeCssSource({
  id: 'css_builder_runtime_missing_signal',
  sourcePath: 'button.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: base,
  scopedCascadeGraphHash: 'hash_scoped_cascade',
  cssCascadeRuntimeProofs: [incomplete]
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.conflicts.some((item) => item.details.reasonCode === 'css-atrule-new-scope-unsupported'), true);

import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { normalizeRuntimeProofCapsule, runtimeEvidenceMetadataFromProof } from '@shapeshift-labs/frontier-runtime-proof';

function createCssCascadeRuntimeProof(input = {}) {
  const runtime = runtimeEvidenceInput(input);
  return compactRecord({
    id: input.id,
    kind: input.kind ?? 'css-source-bound-cascade-runtime-proof',
    status: input.status ?? 'passed',
    proofLevel: input.proofLevel ?? 'css-cascade-runtime-source-bound',
    sourcePath: input.sourcePath,
    reasonCode: input.reasonCode,
    reasonCodes: input.reasonCodes,
    side: input.side ?? 'worker',
    sides: input.sides,
    shapeKey: input.shapeKey,
    shapeKeys: input.shapeKeys,
    baseSourceHash: sourceHash(input, 'base'),
    workerSourceHash: sourceHash(input, 'worker'),
    headSourceHash: sourceHash(input, 'head'),
    outputSourceHash: sourceHash(input, 'output'),
    runtimeCommand: runtime.command,
    runtimeProbeId: runtime.probeId,
    runtimeEvidenceHash: runtime.evidenceHash,
    runtimeSignals: runtime.signals,
    ...runtimeProofCapsuleFields(runtime),
    runtimeEvidence: compactRecord({
      command: runtime.command,
      probeId: runtime.probeId,
      evidenceHash: runtime.evidenceHash,
      signals: runtime.signals,
      capsule: runtime.capsule
    }),
    runtimeEvidenceBound: Boolean(runtime.command && runtime.probeId && runtime.evidenceHash && runtime.signals?.length),
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false,
    autoMergeClaim: false
  });
}

function admitCascadeRuntimeProofs({ id, sourcePath, input, sourceShapeChanges, binding, hash }) {
  const proofs = cascadeRuntimeProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [];
  for (const change of sourceShapeChanges) {
    const proof = proofs.find((candidate) => isCascadeRuntimeProofForChange(candidate, change, sourcePath, binding, hash));
    if (proof) admitted.push(cascadeRuntimeProofRecord(proof, change, sourcePath, binding, hash));
    else conflicts.push(conflict(id, sourcePath, 'css-source-shape-unsupported', change.reasonCode, change));
  }
  return { proofs: admitted, conflicts };
}

function cascadeRuntimeProofCandidates(input = {}, sourcePath) {
  return [
    input.cssCascadeRuntimeProof,
    input.cssCascadeRuntimeProofs,
    input.cssCascadeRuntimeProofsByPath?.[sourcePath],
    input.cssSourceBoundCascadeProof,
    input.cssSourceBoundCascadeProofs,
    input.cssSourceBoundCascadeProofsByPath?.[sourcePath],
    input.cascadeRuntimeProof,
    input.cascadeRuntimeProofs,
    input.cascadeRuntimeProofsByPath?.[sourcePath],
    input.sourceBoundCascadeProof,
    input.sourceBoundCascadeProofs,
    input.sourceBoundCascadeProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isCascadeRuntimeProofForChange(proof, change, sourcePath, binding, hash) {
  return Boolean(proof && typeof proof === 'object') &&
    CascadeRuntimeProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.reasonCode, proof.reasonCodes, change.reasonCode) &&
    proofCoversValue(proof.side, proof.sides, change.side) &&
    proofCoversValue(proof.shapeKey, proof.shapeKeys, change.shapeKey) &&
    cascadeProofSourceMatches(proof, 'base', binding.base, hash) &&
    cascadeProofSourceMatches(proof, 'worker', binding.worker, hash) &&
    cascadeProofSourceMatches(proof, 'head', binding.head, hash) &&
    cascadeProofSourceMatches(proof, 'output', binding.output, hash) &&
    Boolean(cascadeRuntimeEvidenceMetadata(proof, change.reasonCode));
}

function cascadeProofSourceMatches(proof, role, sourceText, hash) {
  if (typeof sourceText !== 'string') return false;
  const sourceHash = hash?.(sourceText);
  const textFields = role === 'output' ? ['outputSourceText', 'mergedSourceText'] : [`${role}SourceText`];
  const hashFields = role === 'output' ? ['outputSourceHash', 'mergedSourceHash'] : [`${role}SourceHash`];
  const aliases = role === 'output' ? ['output', 'merged'] : [role];
  return textFields.some((field) => proof[field] === sourceText) ||
    aliases.some((alias) => proof.sourceTexts?.[alias] === sourceText || proof.sources?.[alias] === sourceText) ||
    hashFields.some((field) => sourceHash !== undefined && proof[field] === sourceHash) ||
    aliases.some((alias) => sourceHash !== undefined && (proof.sourceHashes?.[alias] === sourceHash || proof.hashes?.[alias] === sourceHash));
}

function cascadeRuntimeProofRecord(proof, change, sourcePath, binding, hash) {
  const runtimeEvidence = cascadeRuntimeEvidenceMetadata(proof, change.reasonCode);
  return {
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'css-cascade-runtime-source-bound',
    reasonCode: change.reasonCode,
    side: change.side,
    shapeKey: change.shapeKey,
    sourcePath,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output),
    runtimeCommand: runtimeEvidence.command,
    runtimeProbeId: runtimeEvidence.probeId,
    runtimeEvidenceHash: runtimeEvidence.evidenceHash,
    runtimeSignals: runtimeEvidence.signals,
    requiredRuntimeSignals: runtimeEvidence.requiredSignals,
    ...runtimeProofCapsuleFields(runtimeEvidence),
    runtimeEvidenceBound: true,
    browserCascadeEquivalenceClaim: true,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false,
    autoMergeClaim: false
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? details.shapeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function cascadeRuntimeEvidenceMetadata(proof, reasonCode) {
  const requiredSignals = requiredRuntimeSignalsForReason(reasonCode);
  const capsule = normalizeRuntimeProofCapsule(proof);
  if (capsule?.valid === false) return undefined;
  if (capsule?.valid === true) return runtimeEvidenceMetadataFromProof(proof, { requiredSignals });
  const command = firstString(proof.runtimeCommand, proof.browserCommand, proof.command, proof.commandId, proof.probeCommand, proof.evidence?.command, proof.runtimeEvidence?.command, proof.browserEvidence?.command, proof.evidence?.commandId, proof.runtimeEvidence?.commandId, proof.browserEvidence?.commandId);
  const probeId = firstString(proof.runtimeProbeId, proof.browserProbeId, proof.probeId, proof.probe?.id, proof.evidence?.probeId, proof.runtimeEvidence?.probeId, proof.browserEvidence?.probeId);
  const evidenceHash = firstString(proof.runtimeEvidenceHash, proof.browserEvidenceHash, proof.evidenceHash, proof.cascadeEvidenceHash, proof.renderEvidenceHash, proof.evidence?.hash, proof.evidence?.evidenceHash, proof.runtimeEvidence?.hash, proof.runtimeEvidence?.evidenceHash, proof.browserEvidence?.hash, proof.browserEvidence?.evidenceHash);
  const signals = runtimeSignalSet(proof);
  if ((!command && !probeId) || !evidenceHash || !requiredSignals.some((signal) => signals.has(signal))) return undefined;
  return { command, probeId, evidenceHash, signals: [...signals].sort(), requiredSignals };
}

function runtimeSignalSet(proof) {
  const signals = new Set();
  for (const value of [proof.runtimeSignals, proof.browserSignals, proof.evidenceSignals, proof.probeSignals, proof.evidence?.signals, proof.runtimeEvidence?.signals, proof.browserEvidence?.signals]) addRuntimeSignals(signals, value);
  return signals;
}

function addRuntimeSignals(signals, value) {
  if (Array.isArray(value)) for (const item of value) addRuntimeSignals(signals, item);
  else if (typeof value === 'string' && value.trim()) signals.add(value.trim());
  else if (value && typeof value === 'object') for (const [key, enabled] of Object.entries(value)) if (enabled) signals.add(key);
}

function requiredRuntimeSignalsForReason(reasonCode = '') {
  if (reasonCode.includes('keyframes')) return ['css-keyframes-runtime', 'keyframes-runtime', 'animation-runtime'];
  if (reasonCode.includes('font-face')) return ['css-font-face-runtime', 'font-face-runtime', 'font-loading-runtime'];
  if (reasonCode.includes('property')) return ['css-property-registration-runtime', 'property-registration-runtime'];
  if (reasonCode.includes('page')) return ['css-page-runtime', 'page-layout-runtime', 'paged-media-runtime'];
  return ['css-cascade-runtime', 'cascade-runtime', 'browser-cascade-runtime'];
}

function firstString(...values) { return values.find((value) => typeof value === 'string' && value.trim())?.trim(); }
function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }

function runtimeEvidenceInput(input) {
  const capsule = normalizeRuntimeProofCapsule(input);
  if (capsule?.valid === false) return {};
  if (capsule?.valid === true) return runtimeEvidenceMetadataFromProof(input) ?? {};
  return {
    command: firstString(input.runtimeCommand, input.browserCommand, input.command, input.commandId, input.probeCommand, input.evidence?.command, input.runtimeEvidence?.command, input.browserEvidence?.command, input.evidence?.commandId, input.runtimeEvidence?.commandId, input.browserEvidence?.commandId),
    probeId: firstString(input.runtimeProbeId, input.browserProbeId, input.probeId, input.probe?.id, input.evidence?.probeId, input.runtimeEvidence?.probeId, input.browserEvidence?.probeId),
    evidenceHash: firstString(input.runtimeEvidenceHash, input.browserEvidenceHash, input.evidenceHash, input.cascadeEvidenceHash, input.renderEvidenceHash, input.evidence?.hash, input.evidence?.evidenceHash, input.runtimeEvidence?.hash, input.runtimeEvidence?.evidenceHash, input.browserEvidence?.hash, input.browserEvidence?.evidenceHash),
    signals: [...runtimeSignalSet(input)].sort()
  };
}

function runtimeProofCapsuleFields(runtime = {}) {
  const capsule = runtime.capsule;
  return compactRecord({
    runtimeProofCapsule: capsule,
    runtimeProofMode: capsule?.mode,
    runtimeProofCapsuleHash: capsule?.hash,
    runtimeBrowserName: capsule?.browserName,
    runtimeBrowserVersion: capsule?.browserVersion,
    runtimeViewport: capsule?.viewport,
    runtimeTelemetryHash: capsule?.telemetryHash,
    runtimeDomSnapshotHash: capsule?.domSnapshotHash,
    runtimeComputedStyleHash: capsule?.computedStyleHash,
    runtimeLayoutSnapshotHash: capsule?.layoutSnapshotHash,
    runtimeEventTraceHash: capsule?.eventTraceHash,
    runtimeCumulativeLayoutShift: capsule?.cumulativeLayoutShift
  });
}

function sourceHash(input, role) {
  const hashFields = role === 'output' ? ['outputSourceHash', 'mergedSourceHash'] : [`${role}SourceHash`];
  for (const field of hashFields) if (firstHashString(input[field])) return firstHashString(input[field]);
  for (const alias of roleAliases(role)) {
    if (firstHashString(input.sourceHashes?.[alias], input.hashes?.[alias])) return firstHashString(input.sourceHashes?.[alias], input.hashes?.[alias]);
    const sourceText = firstSourceString(input[`${alias}SourceText`], input.sourceTexts?.[alias], input.sources?.[alias], input[alias]);
    if (sourceText !== undefined) return hashSemanticValue(sourceText);
  }
  return undefined;
}

function roleAliases(role) { return role === 'output' ? ['output', 'merged'] : [role]; }
function firstHashString(...values) { return values.find((value) => typeof value === 'string' && value.length > 0); }
function firstSourceString(...values) { return values.find((value) => typeof value === 'string'); }

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)));
}

const CascadeRuntimeProofKinds = new Set(['css-cascade-runtime-proof', 'css-source-bound-cascade-runtime-proof']);

export { admitCascadeRuntimeProofs, createCssCascadeRuntimeProof };

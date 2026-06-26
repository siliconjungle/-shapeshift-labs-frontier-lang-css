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
    cascadeProofSourceMatches(proof, 'output', binding.output, hash);
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
    outputSourceHash: hash?.(binding.output)
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? details.shapeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }

const CascadeRuntimeProofKinds = new Set(['css-cascade-runtime-proof', 'css-source-bound-cascade-runtime-proof']);

export { admitCascadeRuntimeProofs };

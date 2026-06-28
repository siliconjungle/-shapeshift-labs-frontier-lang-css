import { autoDependencyGraphProofCandidates } from './dependency-graph-keyframes.js';
import { autoFontFaceDependencyGraphProofCandidates } from './dependency-graph-fonts.js';
import { autoUrlAssetDependencyGraphProofCandidates } from './dependency-graph-assets.js';

function admitCssDependencyGraphProofs({ id, sourcePath, input, dependencyGraphEvidence, sourceShapeChanges = [], outputDependencyGraphEvidence, binding, hash }) {
  const proofs = [
    ...dependencyGraphProofCandidates(input, sourcePath),
    ...autoDependencyGraphProofCandidates({
      sourcePath,
      input,
      dependencyGraphEvidence,
      sourceShapeChanges,
      outputDependencyGraphEvidence,
      binding,
      hash
    }),
    ...autoFontFaceDependencyGraphProofCandidates({
      sourcePath,
      input,
      dependencyGraphEvidence,
      sourceShapeChanges,
      outputDependencyGraphEvidence,
      binding,
      hash
    }),
    ...autoUrlAssetDependencyGraphProofCandidates({
      sourcePath,
      input,
      dependencyGraphEvidence,
      outputDependencyGraphEvidence,
      binding,
      hash
    })
  ];
  const admitted = [];
  const conflicts = [];
  for (const change of dependencyGraphEvidence.changedDependencySurfaces ?? []) {
    const proof = proofs.find((candidate) => isDependencyGraphProofForChange(candidate, change, sourcePath, dependencyGraphEvidence, binding, hash));
    if (proof) admitted.push(dependencyGraphProofRecord(proof, change, sourcePath, dependencyGraphEvidence, binding, hash));
    else conflicts.push(conflict(id, sourcePath, 'css-dependency-graph-proof-blocked', change.reasonCode, change));
  }
  return { proofs: admitted, conflicts, coveredSourceShapeChanges: coveredSourceShapeChanges(admitted) };
}

function dependencyGraphProofCandidates(input = {}, sourcePath) {
  return [
    input.cssDependencyGraphProof,
    input.cssDependencyGraphProofs,
    input.cssDependencyGraphProofsByPath?.[sourcePath],
    input.cssSourceBoundDependencyGraphProof,
    input.cssSourceBoundDependencyGraphProofs,
    input.cssSourceBoundDependencyGraphProofsByPath?.[sourcePath],
    input.dependencyGraphProof,
    input.dependencyGraphProofs,
    input.dependencyGraphProofsByPath?.[sourcePath],
    input.sourceBoundDependencyGraphProof,
    input.sourceBoundDependencyGraphProofs,
    input.sourceBoundDependencyGraphProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isDependencyGraphProofForChange(proof, change, sourcePath, evidence, binding, hash) {
  return Boolean(proof && typeof proof === 'object') &&
    DependencyGraphProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.reasonCode, proof.reasonCodes, change.reasonCode) &&
    proofCoversValue(proof.side, proof.sides, change.side) &&
    proofCoversValue(proof.cascadeKey ?? proof.dependencyKey, proof.cascadeKeys ?? proof.dependencyKeys, change.cascadeKey) &&
    proofSourceMatches(proof, 'base', binding.base, hash) &&
    proofSourceMatches(proof, 'worker', binding.worker, hash) &&
    proofSourceMatches(proof, 'head', binding.head, hash) &&
    proofSourceMatches(proof, 'output', binding.output, hash) &&
    dependencyGraphHashMatches(proof, 'base', evidence.sides?.base) &&
    dependencyGraphHashMatches(proof, 'worker', evidence.sides?.worker) &&
    dependencyGraphHashMatches(proof, 'head', evidence.sides?.head);
}

function dependencyGraphHashMatches(proof, role, sideEvidence) {
  const graphHash = sideEvidence?.dependencyGraphHash;
  if (!graphHash) return true;
  return proof[`${role}DependencyGraphHash`] === graphHash ||
    proof[`${role}CssDependencyGraphHash`] === graphHash ||
    proof.dependencyGraphHashes?.[role] === graphHash ||
    proof.cssDependencyGraphHashes?.[role] === graphHash;
}

function proofSourceMatches(proof, role, sourceText, hash) {
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

function dependencyGraphProofRecord(proof, change, sourcePath, evidence, binding, hash) {
  return compactRecord({
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'css-dependency-graph-source-bound',
    reasonCode: change.reasonCode,
    side: change.side,
    cascadeKey: change.cascadeKey,
    sourcePath,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output),
    baseDependencyGraphHash: evidence.sides?.base?.dependencyGraphHash,
    workerDependencyGraphHash: evidence.sides?.worker?.dependencyGraphHash,
    headDependencyGraphHash: evidence.sides?.head?.dependencyGraphHash,
    outputDependencyGraphHash: proof.outputDependencyGraphHash ?? proof.outputCssDependencyGraphHash ?? proof.dependencyGraphHashes?.output ?? proof.cssDependencyGraphHashes?.output,
    autoGenerated: proof.autoGenerated,
    sourceBound: proof.sourceBound,
    shapeKeys: proof.shapeKeys,
    coveredSourceShapeChanges: proof.coveredSourceShapeChanges,
    keyframeRename: proof.keyframeRename,
    fontFaceRename: proof.fontFaceRename,
    urlAssetRename: proof.urlAssetRename
  });
}

function coveredSourceShapeChanges(proofs) {
  const keys = new Set(proofs.flatMap((proof) => proof.coveredSourceShapeChanges ?? []));
  return [...keys];
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }
function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }

const DependencyGraphProofKinds = new Set(['css-dependency-graph-proof', 'css-source-bound-dependency-graph-proof']);

export { admitCssDependencyGraphProofs };

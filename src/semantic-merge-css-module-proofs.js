const CssModuleContractProofKinds = new Set(['css-source-bound-module-contract-proof', 'css-module-contract-proof', 'css-source-bound-css-module-contract-proof']);

function admitCssModuleContractProofs({ id, sourcePath, input = {}, moduleChanges, binding, hash }) {
  const proofs = cssModuleContractProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [
    ...cssModuleOverlapConflicts(id, sourcePath, moduleChanges.worker, moduleChanges.head)
  ];
  for (const change of [...moduleChanges.worker, ...moduleChanges.head]) {
    const proof = proofs.find((candidate) => isProofForChange(candidate, change, sourcePath, binding, hash));
    if (proof) admitted.push(proofRecord(proof, change, sourcePath, binding, hash));
    else conflicts.push(...proofConflictsForChange(id, sourcePath, change));
  }
  return { proofs: admitted, conflicts };
}

function proofConflictsForChange(id, sourcePath, change) {
  const contract = change.after ?? change.before;
  const requiredCodes = contract?.requiredProofGapCodes ?? [];
  const gapConflicts = (change.proofGaps ?? [])
    .filter((gap) => requiredCodes.includes(gap.code))
    .map((gap) => conflict(id, sourcePath, 'css-module-proof-gap-blocked', gap.code, {
      contractKey: change.key,
      contractKind: contract.contractKind,
      side: change.side,
      changeKind: change.kind,
      proofGap: gap
    }));
  if (gapConflicts.length) return gapConflicts;
  return [conflict(id, sourcePath, 'css-module-contract-source-proof-blocked', 'css-module-contract-source-proof-unproved', {
    contractKey: change.key,
    contractKind: contract?.contractKind,
    side: change.side,
    changeKind: change.kind,
    nextProof: 'css-source-bound-module-contract-proof'
  })];
}

function cssModuleOverlapConflicts(id, sourcePath, workerChanges, headChanges) {
  const headByKey = new Map(headChanges.map((change) => [change.key, change]));
  return workerChanges.flatMap((workerChange) => {
    const headChange = headByKey.get(workerChange.key);
    if (!headChange || sameContractChange(workerChange, headChange)) return [];
    const contract = workerChange.after ?? workerChange.before ?? headChange.after ?? headChange.before;
    return [conflict(id, sourcePath, 'css-module-contract-conflict', 'css-module-contract-conflict', {
      contractKey: workerChange.key,
      contractKind: contract?.contractKind,
      worker: contractChangeDetails(workerChange),
      head: contractChangeDetails(headChange)
    })];
  });
}

function isProofForChange(proof, change, sourcePath, binding, hash) {
  const contract = change.after ?? change.before;
  return Boolean(proof && contract && typeof proof === 'object') &&
    CssModuleContractProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.side, proof.sides, change.side) &&
    proofCoversValue(proof.changeKind, proof.changeKinds, change.kind) &&
    proofCoversValue(proof.contractKey, proof.contractKeys, change.key) &&
    proofCoversValue(proof.contractKind, proof.contractKinds, contract.contractKind) &&
    proofSourceMatches(proof, 'base', binding.base, hash) &&
    proofSourceMatches(proof, 'worker', binding.worker, hash) &&
    proofSourceMatches(proof, 'head', binding.head, hash) &&
    proofSourceMatches(proof, 'output', binding.output, hash) &&
    contractHashesMatch(proof, contract);
}

function contractHashesMatch(proof, contract) {
  return proofHashMatches(proof, 'moduleHash', contract.moduleHash) &&
    proofHashMatches(proof, 'generatedClassNameMapHash', contract.generatedClassNameMapHash, contract.contractKind === 'css-module-export') &&
    proofHashMatches(proof, 'jsTsUseSiteGraphHash', contract.jsTsUseSiteGraphHash, contract.contractKind === 'css-module-export') &&
    proofHashMatches(proof, 'cssModuleCompositionGraphHash', contract.cssModuleCompositionGraphHash, contract.contractKind === 'css-module-composition') &&
    proofHashMatches(proof, 'icssGraphHash', contract.icssGraphHash, contract.contractKind === 'icss-import' || contract.contractKind === 'icss-export');
}

function proofHashMatches(proof, field, expected, required = true) {
  if (!required) return true;
  if (!expected) return false;
  return proof[field] === expected || proof.contractGraphHashes?.[field] === expected || proof.cssModuleGraphHashes?.[field] === expected;
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

function proofRecord(proof, change, sourcePath, binding, hash) {
  const contract = change.after ?? change.before;
  return {
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'css-module-contract-source-bound',
    sourcePath,
    side: change.side,
    changeKind: change.kind,
    contractKey: change.key,
    contractKind: contract.contractKind,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output),
    moduleHash: contract.moduleHash,
    generatedClassNameMapHash: contract.generatedClassNameMapHash,
    jsTsUseSiteGraphHash: contract.jsTsUseSiteGraphHash,
    cssModuleCompositionGraphHash: contract.cssModuleCompositionGraphHash,
    icssGraphHash: contract.icssGraphHash
  };
}

function cssModuleContractProofCandidates(input = {}, sourcePath) {
  return [
    input.cssModuleContractProof,
    input.cssModuleContractProofs,
    input.cssModuleContractProofsByPath?.[sourcePath],
    input.cssSourceBoundModuleContractProof,
    input.cssSourceBoundModuleContractProofs,
    input.cssSourceBoundModuleContractProofsByPath?.[sourcePath],
    input.cssSourceBoundCssModuleContractProof,
    input.cssSourceBoundCssModuleContractProofs,
    input.cssSourceBoundCssModuleContractProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function proofCoversValue(single, many, value) {
  if (single !== undefined) return single === value;
  if (Array.isArray(many)) return many.includes(value);
  return true;
}

function sameContractChange(left, right) { return (left.after?.hash ?? '') === (right.after?.hash ?? '') && left.kind === right.kind; }
function contractChangeDetails(change) { return { kind: change.kind, key: change.key, hash: change.after?.hash ?? change.before?.hash }; }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }
function conflict(id, sourcePath, code, reasonCode, details = {}) { return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.contractKey ?? sourcePath ?? 'source'}`, ...details } }; }

export { admitCssModuleContractProofs };

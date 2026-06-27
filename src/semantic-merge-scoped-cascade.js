function scopedCascadeChanges(changed, indexes) {
  return [
    ...scopedCascadeChangesForSide(changed.worker, 'worker', indexes.base),
    ...scopedCascadeChangesForSide(changed.head, 'head', indexes.base)
  ];
}

function scopedCascadeChangesForSide(changes, side, baseIndex) {
  const baseScopeKeys = new Set([...baseIndex.declarations.values()]
    .filter((entry) => entry.scopes?.length)
    .map((entry) => scopeListKey(entry.scopes)));
  return changes.flatMap((change) => {
    const entries = [change.before, change.after].filter((entry) => entry?.scopes?.length);
    if (!entries.length || !entries.some((entry) => baseScopeKeys.has(scopeListKey(entry.scopes)))) return [];
    const entry = change.after ?? change.before;
    const graphRoles = scopedCascadeGraphRoles(change, side);
    return [{
      side,
      changeKind: change.kind,
      reasonCode: 'css-scoped-cascade-equivalence-unproved',
      reasonCodes: unique(['css-scoped-cascade-equivalence-unproved', ...entries.flatMap((item) => scopedCascadeReasonCodes(item.scopes))]),
      cascadeKey: change.key,
      ruleKey: entry.ruleKey,
      selectors: entry.selectors,
      scopes: entry.scopes,
      property: entry.property,
      specificity: entry.specificity,
      scopedCascadeGraphReady: graphRoles.every((item) => typeof item.hash === 'string'),
      scopedCascadeGraphHash: graphRoles.find((item) => typeof item.hash === 'string')?.hash,
      scopedCascadeGraphHashes: Object.fromEntries(graphRoles.map((item) => [item.role, item.hash]).filter(([, value]) => typeof value === 'string')),
      before: scopedCascadeDeclarationDetails(change.before),
      after: scopedCascadeDeclarationDetails(change.after)
    }];
  });
}

function admitScopedCascadeProofs({ id, sourcePath, input, changes, binding, hash }) {
  const proofs = scopedCascadeProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [];
  for (const change of changes) {
    const proof = proofs.find((candidate) => isScopedCascadeProofForChange(candidate, change, sourcePath, binding, hash));
    if (proof) admitted.push(scopedCascadeProofRecord(proof, change, sourcePath, binding, hash));
    else conflicts.push(conflict(id, sourcePath, 'css-scoped-cascade-proof-blocked', change.reasonCode, change));
  }
  return { proofs: admitted, conflicts };
}

function scopedCascadeProofCandidates(input = {}, sourcePath) {
  return [
    input.cssScopedCascadeProof,
    input.cssScopedCascadeProofs,
    input.cssScopedCascadeProofsByPath?.[sourcePath],
    input.cssSourceBoundScopedCascadeProof,
    input.cssSourceBoundScopedCascadeProofs,
    input.cssSourceBoundScopedCascadeProofsByPath?.[sourcePath],
    input.scopedCascadeProof,
    input.scopedCascadeProofs,
    input.scopedCascadeProofsByPath?.[sourcePath],
    input.sourceBoundScopedCascadeProof,
    input.sourceBoundScopedCascadeProofs,
    input.sourceBoundScopedCascadeProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isScopedCascadeProofForChange(proof, change, sourcePath, binding, hash) {
  return Boolean(proof && typeof proof === 'object') &&
    ScopedCascadeProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    change.scopedCascadeGraphReady === true &&
    proofCoversAny(proof.reasonCode, proof.reasonCodes, change.reasonCodes) &&
    proofCoversValue(proof.side, proof.sides, change.side) &&
    proofCoversValue(proof.cascadeKey, proof.cascadeKeys, change.cascadeKey) &&
    proofCoversValue(proof.property, proof.properties, change.property) &&
    scopedCascadeRuleMatches(proof, change) &&
    scopedCascadeGraphHashMatches(proof, change) &&
    proofSourceMatches(proof, 'base', binding.base, hash) &&
    proofSourceMatches(proof, 'worker', binding.worker, hash) &&
    proofSourceMatches(proof, 'head', binding.head, hash) &&
    proofSourceMatches(proof, 'output', binding.output, hash);
}

function scopedCascadeRuleMatches(proof, change) {
  const ruleKeyMatches = proof.ruleKey === change.ruleKey || proof.ruleKeys?.includes(change.ruleKey);
  const selectorsMatch = selectorListKey(proof.selectors) === selectorListKey(change.selectors);
  const scopesMatch = scopeListKey(proof.scopes) === scopeListKey(change.scopes);
  return ruleKeyMatches || (selectorsMatch && scopesMatch);
}

function scopedCascadeGraphHashMatches(proof, change) {
  const hashes = Object.entries(change.scopedCascadeGraphHashes ?? {});
  if (!hashes.length) return false;
  return hashes.every(([role, expected]) => {
    const sharedHash = firstString(proof.scopedCascadeGraphHash, proof.graphHash);
    return sharedHash === expected ||
      proof[`${role}ScopedCascadeGraphHash`] === expected ||
      proof.scopedCascadeGraphHashes?.[role] === expected ||
      proof.graphHashes?.[role] === expected;
  });
}

function scopedCascadeProofRecord(proof, change, sourcePath, binding, hash) {
  return {
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'css-scoped-cascade-source-bound',
    reasonCode: change.reasonCode,
    side: change.side,
    cascadeKey: change.cascadeKey,
    ruleKey: change.ruleKey,
    property: change.property,
    scopes: change.scopes,
    sourcePath,
    scopedCascadeGraphHash: change.scopedCascadeGraphHash,
    scopedCascadeGraphHashes: change.scopedCascadeGraphHashes,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output)
  };
}

function scopedCascadeGraphRoles(change, side) {
  return [
    change.before?.scopedCascadeGraphHash ? { role: 'base', hash: change.before.scopedCascadeGraphHash } : undefined,
    change.after?.scopedCascadeGraphHash ? { role: side, hash: change.after.scopedCascadeGraphHash } : undefined
  ].filter(Boolean);
}

function scopedCascadeDeclarationDetails(entry) {
  return entry ? { property: entry.property, value: entry.value, ruleKey: entry.ruleKey, cascadeKey: entry.key, scopes: entry.scopes, scopedCascadeGraphHash: entry.scopedCascadeGraphHash } : undefined;
}

function scopedCascadeReasonCodes(scopes = []) {
  return scopes.map((scope) => /^@([-\w]+)/.exec(scope)?.[1]).filter(Boolean).map((name) => `css-${name}-cascade-scope-unproved`);
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

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function proofCoversAny(value, values, expectedValues = []) { return expectedValues.some((expected) => proofCoversValue(value, values, expected)); }
function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }
function selectorListKey(value = []) { return Array.isArray(value) ? value.join(',') : undefined; }
function scopeListKey(value = []) { return Array.isArray(value) ? value.join('::') : undefined; }
function firstString(...values) { return values.find((value) => typeof value === 'string' && value.length > 0); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

const ScopedCascadeProofKinds = new Set(['css-scoped-cascade-proof', 'css-source-bound-scoped-cascade-proof', 'css-scoped-cascade-runtime-proof', 'css-source-bound-scoped-cascade-runtime-proof']);
const ScopedCascadeProofGapCodes = new Set(['css-scoped-cascade-equivalence-unproved', 'css-media-cascade-scope-unproved', 'css-supports-cascade-scope-unproved', 'css-container-cascade-scope-unproved', 'css-layer-cascade-scope-unproved', 'css-scope-cascade-scope-unproved']);

export { ScopedCascadeProofGapCodes, admitScopedCascadeProofs, scopedCascadeChanges };

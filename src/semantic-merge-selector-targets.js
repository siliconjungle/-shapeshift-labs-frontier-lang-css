function mergeSelectorTargetEvidence(sheets, changed) {
  const entries = Object.entries(sheets).map(([side, sheet]) => [side, sheetSelectorTargetEvidence(sheet)]);
  const moves = { worker: selectorTargetMoves(changed.worker, 'worker'), head: selectorTargetMoves(changed.head, 'head') };
  return {
    kind: 'frontier.lang.cssSafeMergeSelectorTargetEvidence',
    version: 1,
    selectorTargetGraphHashPresent: entries.every(([, evidence]) => evidence.selectorTargetGraphHashPresent === true),
    parserBackedRuleSpans: entries.every(([, evidence]) => evidence.parserBackedRuleSpans === true),
    selectorMoveCount: moves.worker.length + moves.head.length,
    workerSelectorMoves: moves.worker.length,
    headSelectorMoves: moves.head.length,
    sides: Object.fromEntries(entries),
    moves
  };
}

function sheetSelectorTargetEvidence(sheet) {
  const rules = (sheet.records ?? []).filter((record) => record.kind === 'rule');
  return {
    ruleCount: rules.length,
    selectorCount: rules.reduce((sum, record) => sum + (record.selectors?.length ?? 0), 0),
    declarationCount: rules.reduce((sum, record) => sum + (record.declarations?.length ?? 0), 0),
    scopedRuleCount: rules.filter((record) => (record.scopes ?? []).length > 0).length,
    selectorTargetGraphHashPresent: rules.length === 0 || rules.every((record) => Boolean(record.selectorTargetGraphHash)),
    parserBackedRuleSpans: rules.every((record) => record.parser === 'postcss' && record.sourceSpan?.startOffset !== undefined),
    selectorSpecificityRecords: rules.filter((record) => Array.isArray(record.specificity)).length
  };
}

function selectorTargetMoves(changes, side) {
  const deletions = changes.filter((change) => change.kind === 'delete' && change.before);
  const additions = changes.filter((change) => change.kind === 'add' && change.after);
  const moves = [];
  const usedAdditions = new Set();
  for (const deletion of deletions) {
    const addition = additions.find((candidate) => !usedAdditions.has(candidate) && sameDeclarationTargetSignature(deletion.before, candidate.after) && deletion.before.ruleKey !== candidate.after.ruleKey);
    if (!addition) continue;
    usedAdditions.add(addition);
    moves.push({
      side,
      property: deletion.before.property,
      beforeRuleKey: deletion.before.ruleKey,
      afterRuleKey: addition.after.ruleKey,
      beforeSelectors: deletion.before.selectors,
      afterSelectors: addition.after.selectors,
      beforeScopes: deletion.before.scopes,
      afterScopes: addition.after.scopes,
      beforeSpecificity: deletion.before.specificity,
      afterSpecificity: addition.after.specificity,
      specificityInvariant: specificityListKey(deletion.before.specificity) === specificityListKey(addition.after.specificity),
      declarationHash: addition.after.declarationHash,
      beforeSelectorTargetGraphHash: deletion.before.selectorTargetGraphHash,
      afterSelectorTargetGraphHash: addition.after.selectorTargetGraphHash,
      selectorTargetGraphHashPresent: Boolean(deletion.before.selectorTargetGraphHash && addition.after.selectorTargetGraphHash)
    });
  }
  return moves;
}

function planSelectorTargetRebase(id, sourcePath, selectorTargetEvidence, changed, options = {}) {
  const planned = { worker: [...changed.worker], head: [...changed.head] };
  const worker = selectorTargetMoveSidePlan(id, sourcePath, selectorTargetEvidence.moves.worker, selectorTargetEvidence.moves.head, planned.head, options);
  const head = selectorTargetMoveSidePlan(id, sourcePath, selectorTargetEvidence.moves.head, selectorTargetEvidence.moves.worker, planned.worker, options);
  return {
    changed: planned,
    conflicts: [...worker.conflicts, ...head.conflicts],
    evidence: { ...selectorTargetEvidence, rebasedChangeCount: worker.rebaseProofs.length + head.rebaseProofs.length, rebaseProofs: [...worker.rebaseProofs, ...head.rebaseProofs] }
  };
}

function selectorTargetMoveSidePlan(id, sourcePath, moves, oppositeMoves, oppositeChanges, options) {
  const conflicts = [];
  const rebaseProofs = [];
  for (const move of moves) {
    if (oppositeMoves.some((oppositeMove) => sameSelectorMove(move, oppositeMove))) continue;
    for (let index = 0; index < oppositeChanges.length; index += 1) {
      const change = oppositeChanges[index];
      if (!selectorMoveTouchesChange(move, change)) continue;
      const proof = selectorTargetRebaseProofForChange(move, change, options, sourcePath);
      if (proof) {
        const rebased = rebaseChangeToSelectorMove(change, move, proof, options);
        oppositeChanges[index] = rebased.change;
        rebaseProofs.push(rebased.proof);
      } else conflicts.push(conflict(id, sourcePath, change.key, move, change));
    }
  }
  return { conflicts, rebaseProofs };
}

function selectorTargetRebaseProofForChange(move, change, options, sourcePath) {
  if (change.kind !== 'add' || !change.after || !move.specificityInvariant) return undefined;
  return selectorTargetProofCandidates(options, sourcePath)
    .find((proof) => isSelectorTargetProofForChange(proof, move, change, sourcePath, options));
}

function selectorTargetProofCandidates(input = {}, sourcePath) {
  return [
    input.cssSelectorTargetProof,
    input.cssSelectorTargetProofs,
    input.cssSelectorTargetProofsByPath?.[sourcePath],
    input.cssSourceBoundSelectorTargetProof,
    input.cssSourceBoundSelectorTargetProofs,
    input.cssSourceBoundSelectorTargetProofsByPath?.[sourcePath],
    input.selectorTargetProof,
    input.selectorTargetProofs,
    input.selectorTargetProofsByPath?.[sourcePath],
    input.selectorTargetRebaseProof,
    input.selectorTargetRebaseProofs,
    input.selectorTargetRebaseProofsByPath?.[sourcePath],
    input.sourceBoundSelectorTargetProof,
    input.sourceBoundSelectorTargetProofs,
    input.sourceBoundSelectorTargetProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isSelectorTargetProofForChange(proof, move, change, sourcePath, options) {
  const hash = options.hashSemanticValue;
  const binding = options.sourceBinding ?? {};
  return Boolean(proof && typeof proof === 'object') &&
    SelectorTargetProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.reasonCode, proof.reasonCodes, 'css-selector-target-rebase-unproved') &&
    proofCoversValue(proof.moveSide ?? proof.selectorMoveSide, proof.moveSides ?? proof.selectorMoveSides ?? proof.sides, move.side) &&
    proofCoversValue(proof.rebasedSide ?? proof.side, proof.rebasedSides, change.side) &&
    selectorTargetRuleOrSelectorMatches(proof, move) &&
    selectorTargetSpecificityMatches(proof, move) &&
    selectorTargetGraphHashMatches(proof, move) &&
    proofSourceMatches(proof, 'base', binding.base, hash) &&
    proofSourceMatches(proof, 'worker', binding.worker, hash) &&
    proofSourceMatches(proof, 'head', binding.head, hash);
}

function selectorTargetRuleOrSelectorMatches(proof, move) {
  const ruleKeysMatch = proof.fromRuleKey === move.beforeRuleKey && proof.toRuleKey === move.afterRuleKey;
  const selectorsMatch = selectorListKey(proof.fromSelectors) === selectorListKey(move.beforeSelectors) && selectorListKey(proof.toSelectors) === selectorListKey(move.afterSelectors);
  return ruleKeysMatch || selectorsMatch;
}

function selectorTargetSpecificityMatches(proof, move) {
  return move.specificityInvariant === true &&
    specificityListKey(proof.fromSpecificity) === specificityListKey(move.beforeSpecificity) &&
    specificityListKey(proof.toSpecificity) === specificityListKey(move.afterSpecificity);
}

function selectorTargetGraphHashMatches(proof, move) {
  const beforeHash = move.beforeSelectorTargetGraphHash;
  const afterHash = move.afterSelectorTargetGraphHash;
  if (!beforeHash || !afterHash) return false;
  const sharedHash = firstString(proof.selectorTargetGraphHash, proof.graphHash);
  if (sharedHash && sharedHash === beforeHash && sharedHash === afterHash) return true;
  return (proof.beforeSelectorTargetGraphHash === beforeHash && proof.afterSelectorTargetGraphHash === afterHash) ||
    (proof.selectorTargetGraphHashes?.before === beforeHash && proof.selectorTargetGraphHashes?.after === afterHash) ||
    (proof.graphHashes?.before === beforeHash && proof.graphHashes?.after === afterHash) ||
    (proof.baseSelectorTargetGraphHash === beforeHash && proof[`${move.side}SelectorTargetGraphHash`] === afterHash);
}

function proofSourceMatches(proof, role, sourceText, hash) {
  if (typeof sourceText !== 'string') return false;
  const sourceHash = hash?.(sourceText);
  return proof[`${role}SourceText`] === sourceText ||
    proof.sourceTexts?.[role] === sourceText ||
    proof.sources?.[role] === sourceText ||
    (sourceHash !== undefined && proof[`${role}SourceHash`] === sourceHash) ||
    (sourceHash !== undefined && proof.sourceHashes?.[role] === sourceHash) ||
    (sourceHash !== undefined && proof.hashes?.[role] === sourceHash);
}

function rebaseChangeToSelectorMove(change, move, proof, options) {
  const after = { ...change.after, ruleKey: move.afterRuleKey, selectors: move.afterSelectors, scopes: move.afterScopes ?? [], key: cascadeKey(move.afterScopes, move.afterSelectors, change.after.property), rebasedFromRuleKey: move.beforeRuleKey };
  return {
    change: { ...change, key: after.key, after },
    proof: {
      id: proof.id,
      kind: 'css-selector-target-rebase',
      proofKind: proof.kind,
      status: 'passed',
      proofLevel: proof.proofLevel ?? 'css-selector-target-source-bound',
      side: change.side,
      moveSide: move.side,
      fromRuleKey: move.beforeRuleKey,
      toRuleKey: move.afterRuleKey,
      fromSelectors: move.beforeSelectors,
      toSelectors: move.afterSelectors,
      property: change.after.property,
      cascadeKey: after.key,
      selectorTargetGraphHash: move.afterSelectorTargetGraphHash,
      beforeSelectorTargetGraphHash: move.beforeSelectorTargetGraphHash,
      afterSelectorTargetGraphHash: move.afterSelectorTargetGraphHash,
      specificityInvariant: true,
      beforeSpecificity: move.beforeSpecificity,
      afterSpecificity: move.afterSpecificity,
      baseSourceHash: options.hashSemanticValue?.(options.sourceBinding?.base),
      workerSourceHash: options.hashSemanticValue?.(options.sourceBinding?.worker),
      headSourceHash: options.hashSemanticValue?.(options.sourceBinding?.head)
    }
  };
}

function conflict(id, sourcePath, cascadeKey, selectorMove, change) {
  return {
    code: 'css-selector-target-conflict',
    gateId: 'css-semantic-merge',
    sourcePath,
    details: {
      reasonCode: 'css-selector-target-rebase-unproved',
      conflictKey: `css#${id}#css-selector-target-rebase-unproved#${cascadeKey ?? sourcePath ?? 'source'}`,
      cascadeKey,
      selectorMove,
      opposite: changeDetails(change)
    }
  };
}

function selectorMoveTouchesChange(move, change) {
  const entry = change.after ?? change.before;
  return entry?.ruleKey === move.beforeRuleKey || entry?.ruleKey === move.afterRuleKey;
}

function sameDeclarationTargetSignature(left, right) {
  return Boolean(left && right && left.property === right.property && left.value === right.value && left.important === right.important);
}

function sameSelectorMove(left, right) {
  return left.property === right.property && left.beforeRuleKey === right.beforeRuleKey && left.afterRuleKey === right.afterRuleKey && left.declarationHash === right.declarationHash;
}

function cascadeKey(scopes = [], selectors = [], property) { return [...scopes, selectors.join(','), property].join('::'); }
function selectorListKey(value = []) { return Array.isArray(value) ? value.join(',') : undefined; }
function specificityListKey(value = []) { return Array.isArray(value) ? value.map((item) => Array.isArray(item) ? item.join(',') : '').join('|') : undefined; }
function changeDetails(change) { return { kind: change.kind, property: (change.after ?? change.before)?.property, value: change.after?.value, important: change.after?.important }; }
function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }
function firstString(...values) { return values.find((value) => typeof value === 'string' && value.length > 0); }

const SelectorTargetProofKinds = new Set(['css-selector-target-proof', 'css-source-bound-selector-target-proof', 'css-selector-target-rebase-proof', 'css-source-bound-selector-target-rebase-proof']);

export { mergeSelectorTargetEvidence, planSelectorTargetRebase };

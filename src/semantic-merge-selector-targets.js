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
      if (canRebaseChange(move, change, options, sourcePath)) {
        const rebased = rebaseChangeToSelectorMove(change, move);
        oppositeChanges[index] = rebased.change;
        rebaseProofs.push(rebased.proof);
      } else conflicts.push(conflict(id, sourcePath, change.key, move, change));
    }
  }
  return { conflicts, rebaseProofs };
}

function canRebaseChange(move, change, options, sourcePath) {
  return change.kind === 'add' && change.after && hasSelectorTargetEquivalence(move, options, sourcePath);
}

function hasSelectorTargetEquivalence(move, options, sourcePath) {
  if (!move.specificityInvariant) return false;
  return (options.selectorTargetEquivalences ?? []).some((entry) => {
    const sourceMatches = !entry.sourcePath || entry.sourcePath === sourcePath;
    const ruleKeysMatch = entry.fromRuleKey === move.beforeRuleKey && entry.toRuleKey === move.afterRuleKey;
    const selectorsMatch = selectorListKey(entry.fromSelectors) === selectorListKey(move.beforeSelectors) && selectorListKey(entry.toSelectors) === selectorListKey(move.afterSelectors);
    const graphMatches = Boolean(entry.graphHash && entry.graphHash === move.beforeSelectorTargetGraphHash && entry.graphHash === move.afterSelectorTargetGraphHash);
    const specificityMatches = (!entry.fromSpecificity || specificityListKey(entry.fromSpecificity) === specificityListKey(move.beforeSpecificity)) && (!entry.toSpecificity || specificityListKey(entry.toSpecificity) === specificityListKey(move.afterSpecificity));
    return sourceMatches && graphMatches && specificityMatches && (ruleKeysMatch || selectorsMatch);
  });
}

function rebaseChangeToSelectorMove(change, move) {
  const after = { ...change.after, ruleKey: move.afterRuleKey, selectors: move.afterSelectors, scopes: move.afterScopes ?? [], key: cascadeKey(move.afterScopes, move.afterSelectors, change.after.property), rebasedFromRuleKey: move.beforeRuleKey };
  return {
    change: { ...change, key: after.key, after },
    proof: { kind: 'css-selector-target-rebase', side: change.side, fromRuleKey: move.beforeRuleKey, toRuleKey: move.afterRuleKey, property: change.after.property, cascadeKey: after.key, selectorTargetGraphHash: move.afterSelectorTargetGraphHash, specificityInvariant: true, beforeSpecificity: move.beforeSpecificity, afterSpecificity: move.afterSpecificity }
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

export { mergeSelectorTargetEvidence, planSelectorTargetRebase };

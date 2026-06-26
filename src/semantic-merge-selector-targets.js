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
      declarationHash: addition.after.declarationHash,
      selectorTargetGraphHashPresent: Boolean(deletion.before.selectorTargetGraphHash && addition.after.selectorTargetGraphHash)
    });
  }
  return moves;
}

function selectorTargetMoveConflicts(id, sourcePath, selectorTargetEvidence, changed) {
  return [
    ...selectorTargetMoveSideConflicts(id, sourcePath, selectorTargetEvidence.moves.worker, selectorTargetEvidence.moves.head, changed.head),
    ...selectorTargetMoveSideConflicts(id, sourcePath, selectorTargetEvidence.moves.head, selectorTargetEvidence.moves.worker, changed.worker)
  ];
}

function selectorTargetMoveSideConflicts(id, sourcePath, moves, oppositeMoves, oppositeChanges) {
  return moves.flatMap((move) => {
    if (oppositeMoves.some((oppositeMove) => sameSelectorMove(move, oppositeMove))) return [];
    return oppositeChanges.filter((change) => selectorMoveTouchesChange(move, change)).map((change) => conflict(id, sourcePath, change.key, move, change));
  });
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

function changeDetails(change) { return { kind: change.kind, property: (change.after ?? change.before)?.property, value: change.after?.value, important: change.after?.important }; }

export { mergeSelectorTargetEvidence, selectorTargetMoveConflicts };

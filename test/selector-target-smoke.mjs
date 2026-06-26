import assert from 'node:assert/strict';
import { safeMergeCssSource } from '../dist/index.js';

const cssMerged = safeMergeCssSource({
  id: 'css_selector_target_evidence',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; padding: 1rem; }\n',
  workerSourceText: '.button { color: blue; padding: 1rem; }\n',
  headSourceText: '.button { color: red; padding: 1rem; background-color: white; }\n'
});
assert.equal(cssMerged.selectorTargetEvidence.kind, 'frontier.lang.cssSafeMergeSelectorTargetEvidence');
assert.equal(cssMerged.selectorTargetEvidence.parserBackedRuleSpans, true);
assert.equal(cssMerged.selectorTargetEvidence.sides.base.selectorSpecificityRecords, 1);
assert.equal(cssMerged.selectorTargetEvidence.selectorMoveCount, 0);

const cssSelectorMoveConflict = safeMergeCssSource({
  id: 'css_selector_target_move_conflict',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.primary { color: red; }\n',
  headSourceText: '.button { color: red; background-color: white; }\n'
});
assert.equal(cssSelectorMoveConflict.status, 'blocked');
assert.equal(cssSelectorMoveConflict.selectorTargetEvidence.workerSelectorMoves, 1);
assert.equal(cssSelectorMoveConflict.conflicts.some((conflict) => conflict.code === 'css-selector-target-conflict'), true);
assert.equal(cssSelectorMoveConflict.admission.reasonCodes.includes('css-selector-target-rebase-unproved'), true);

const cssSelectorMoveRebase = safeMergeCssSource({
  id: 'css_selector_target_move_rebase',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.primary { color: red; }\n',
  headSourceText: '.button { color: red; background-color: white; }\n',
  selectorTargetEquivalences: [{ fromSelectors: ['.button'], toSelectors: ['.primary'] }]
});
assert.equal(cssSelectorMoveRebase.status, 'merged');
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebasedChangeCount, 1);
assert.match(cssSelectorMoveRebase.mergedSourceText, /\.primary \{/);
assert.match(cssSelectorMoveRebase.mergedSourceText, /background-color: white/);
assert.doesNotMatch(cssSelectorMoveRebase.mergedSourceText, /\.button \{/);

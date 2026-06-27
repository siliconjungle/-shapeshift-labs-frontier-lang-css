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

const cssSelectorMoveWeakEquivalence = safeMergeCssSource({
  id: 'css_selector_target_move_weak_equivalence',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.primary { color: red; }\n',
  headSourceText: '.button { color: red; background-color: white; }\n',
  selectorTargetEquivalences: [{ fromSelectors: ['.button'], toSelectors: ['.primary'] }]
});
assert.equal(cssSelectorMoveWeakEquivalence.status, 'blocked');
assert.equal(cssSelectorMoveWeakEquivalence.admission.reasonCodes.includes('css-selector-target-rebase-unproved'), true);

const cssSelectorMoveRebase = safeMergeCssSource({
  id: 'css_selector_target_move_rebase',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.primary { color: red; }\n',
  headSourceText: '.button { color: red; background-color: white; }\n',
  selectorTargetGraphHash: 'target-graph-v1',
  selectorTargetEquivalences: [{ sourcePath: 'button.css', fromSelectors: ['.button'], toSelectors: ['.primary'], fromSpecificity: [[0, 1, 0]], toSpecificity: [[0, 1, 0]], graphHash: 'target-graph-v1' }]
});
assert.equal(cssSelectorMoveRebase.status, 'merged');
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebasedChangeCount, 1);
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].specificityInvariant, true);
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].selectorTargetGraphHash, 'target-graph-v1');
assert.match(cssSelectorMoveRebase.mergedSourceText, /\.primary \{/);
assert.match(cssSelectorMoveRebase.mergedSourceText, /background-color: white/);
assert.doesNotMatch(cssSelectorMoveRebase.mergedSourceText, /\.button \{/);

const cssSpecificityChangingSelectorMove = safeMergeCssSource({
  id: 'css_selector_target_specificity_change',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '#button { color: red; }\n',
  headSourceText: '.button { color: red; background-color: white; }\n',
  selectorTargetGraphHash: 'target-graph-v1',
  selectorTargetEquivalences: [{ sourcePath: 'button.css', fromSelectors: ['.button'], toSelectors: ['#button'], graphHash: 'target-graph-v1' }]
});
assert.equal(cssSpecificityChangingSelectorMove.status, 'blocked');
assert.equal(cssSpecificityChangingSelectorMove.selectorTargetEvidence.moves.worker[0].specificityInvariant, false);
assert.equal(cssSpecificityChangingSelectorMove.admission.reasonCodes.includes('css-selector-target-rebase-unproved'), true);

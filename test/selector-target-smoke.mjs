import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
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
assert.equal(cssMerged.selectorTargetEvidence.parserBackedSelectorSpecificity, true);
assert.equal(cssMerged.selectorTargetEvidence.selectorsLevel4Specificity, true);
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

const selectorMoveBase = '.button { color: red; }\n';
const selectorMoveWorker = '.primary { color: red; }\n';
const selectorMoveHead = '.button { color: red; background-color: white; }\n';
const cssSelectorMoveGraphOnly = safeMergeCssSource({
  id: 'css_selector_target_move_graph_only',
  sourcePath: 'button.css',
  baseSourceText: selectorMoveBase,
  workerSourceText: selectorMoveWorker,
  headSourceText: selectorMoveHead,
  selectorTargetGraphHash: 'target-graph-v1',
  selectorTargetEquivalences: [{ sourcePath: 'button.css', fromSelectors: ['.button'], toSelectors: ['.primary'], fromSpecificity: [[0, 1, 0]], toSpecificity: [[0, 1, 0]], graphHash: 'target-graph-v1' }]
});
assert.equal(cssSelectorMoveGraphOnly.status, 'blocked');
assert.equal(cssSelectorMoveGraphOnly.admission.reasonCodes.includes('css-selector-target-rebase-unproved'), true);

const cssSelectorMoveRebase = safeMergeCssSource({
  id: 'css_selector_target_move_rebase',
  sourcePath: 'button.css',
  baseSourceText: selectorMoveBase,
  workerSourceText: selectorMoveWorker,
  headSourceText: selectorMoveHead,
  selectorTargetGraphHash: 'target-graph-v1',
  cssSelectorTargetProofs: [{
    id: 'proof_selector_target_button_primary',
    kind: 'css-source-bound-selector-target-proof',
    status: 'passed',
    sourcePath: 'button.css',
    reasonCode: 'css-selector-target-rebase-unproved',
    moveSide: 'worker',
    rebasedSide: 'head',
    fromSelectors: ['.button'],
    toSelectors: ['.primary'],
    fromSpecificity: [[0, 1, 0]],
    toSpecificity: [[0, 1, 0]],
    selectorTargetGraphHash: 'target-graph-v1',
    baseSourceHash: hashSemanticValue(selectorMoveBase),
    workerSourceHash: hashSemanticValue(selectorMoveWorker),
    headSourceHash: hashSemanticValue(selectorMoveHead)
  }]
});
assert.equal(cssSelectorMoveRebase.status, 'merged');
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebasedChangeCount, 1);
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].specificityInvariant, true);
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].selectorTargetGraphHash, 'target-graph-v1');
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].proofLevel, 'css-selector-target-source-bound');
assert.equal(cssSelectorMoveRebase.selectorTargetEvidence.rebaseProofs[0].baseSourceHash, hashSemanticValue(selectorMoveBase));
assert.match(cssSelectorMoveRebase.mergedSourceText, /\.primary \{/);
assert.match(cssSelectorMoveRebase.mergedSourceText, /background-color: white/);
assert.doesNotMatch(cssSelectorMoveRebase.mergedSourceText, /\.button \{/);

const functionalMoveBase = ':is(.button, #cta) { color: red; }\n';
const functionalMoveWorker = ':is(.primary, #cta) { color: red; }\n';
const functionalMoveHead = ':is(.button, #cta) { color: red; background-color: white; }\n';
const functionalMoveProofBase = {
  id: 'proof_selector_target_functional',
  kind: 'css-source-bound-selector-target-proof',
  status: 'passed',
  sourcePath: 'functional.css',
  reasonCode: 'css-selector-target-rebase-unproved',
  moveSide: 'worker',
  rebasedSide: 'head',
  fromSelectors: [':is(.button, #cta)'],
  toSelectors: [':is(.primary, #cta)'],
  fromSpecificity: [[1, 0, 0]],
  toSpecificity: [[1, 0, 0]],
  selectorTargetGraphHash: 'functional-target-graph-v1',
  baseSourceHash: hashSemanticValue(functionalMoveBase),
  workerSourceHash: hashSemanticValue(functionalMoveWorker),
  headSourceHash: hashSemanticValue(functionalMoveHead)
};
const cssFunctionalMoveWithoutSpecificityProof = safeMergeCssSource({
  id: 'css_selector_target_functional_specificity_requires_proof',
  sourcePath: 'functional.css',
  baseSourceText: functionalMoveBase,
  workerSourceText: functionalMoveWorker,
  headSourceText: functionalMoveHead,
  selectorTargetGraphHash: 'functional-target-graph-v1',
  cssSelectorTargetProofs: [functionalMoveProofBase]
});
assert.equal(cssFunctionalMoveWithoutSpecificityProof.status, 'blocked');
assert.equal(cssFunctionalMoveWithoutSpecificityProof.selectorTargetEvidence.moves.worker[0].functionalPseudoSpecificity, true);

const cssFunctionalMoveRebase = safeMergeCssSource({
  id: 'css_selector_target_functional_rebase',
  sourcePath: 'functional.css',
  baseSourceText: functionalMoveBase,
  workerSourceText: functionalMoveWorker,
  headSourceText: functionalMoveHead,
  selectorTargetGraphHash: 'functional-target-graph-v1',
  cssSelectorTargetProofs: [{
    ...functionalMoveProofBase,
    parserBackedSelectorSpecificity: true,
    selectorsLevel4Specificity: true,
    specificityExact: true,
    specificityAlgorithm: 'selectors-level-4'
  }]
});
assert.equal(cssFunctionalMoveRebase.status, 'merged');
assert.equal(cssFunctionalMoveRebase.selectorTargetEvidence.rebaseProofs[0].parserBackedSelectorSpecificity, true);
assert.equal(cssFunctionalMoveRebase.selectorTargetEvidence.rebaseProofs[0].selectorsLevel4Specificity, true);
assert.equal(cssFunctionalMoveRebase.selectorTargetEvidence.rebaseProofs[0].functionalPseudoSpecificity, true);
assert.match(cssFunctionalMoveRebase.mergedSourceText, /:is\(.primary, #cta\)/);
assert.match(cssFunctionalMoveRebase.mergedSourceText, /background-color: white/);

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

import assert from 'node:assert/strict';
import { safeMergeCssSource } from '../dist/index.js';

const duplicateRuleBase = '.alert { color: red; }\n.alert { color: green; }\n';
const duplicateRuleWorker = '.alert { color: blue; }\n.alert { color: green; }\n';
const duplicateRuleHead = '.alert { color: red; }\n.alert { color: yellow; }\n';
const duplicateRuleMerged = safeMergeCssSource({
  id: 'css_duplicate_cascade_rule_ordered_merge',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateRuleBase,
  workerSourceText: duplicateRuleWorker,
  headSourceText: duplicateRuleHead
});
assert.equal(duplicateRuleMerged.status, 'merged');
assert.match(duplicateRuleMerged.mergedSourceText, /color: blue;\n  color: yellow/);
assert.equal(duplicateRuleMerged.orderedCascadeOccurrenceEvidence.length, 1);
assert.equal(duplicateRuleMerged.orderedCascadeOccurrenceEvidence[0].cascadeKey, '.alert::color');
assert.equal(duplicateRuleMerged.orderedCascadeOccurrenceEvidence[0].occurrenceCount, 2);
assert.equal(duplicateRuleMerged.orderedCascadeOccurrenceEvidence[0].semanticEquivalenceClaim, false);
assert.equal(duplicateRuleMerged.admission.cssOrderedCascadeOccurrenceEvidence.length, 1);

const duplicateDeclarationBase = '.alert { color: red; color: green; }\n';
const duplicateDeclarationWorker = '.alert { color: blue; color: green; }\n';
const duplicateDeclarationHead = '.alert { color: red; color: yellow; }\n';
const duplicateDeclarationMerged = safeMergeCssSource({
  id: 'css_duplicate_cascade_declaration_ordered_merge',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateDeclarationBase,
  workerSourceText: duplicateDeclarationWorker,
  headSourceText: duplicateDeclarationHead
});
assert.equal(duplicateDeclarationMerged.status, 'merged');
assert.match(duplicateDeclarationMerged.mergedSourceText, /color: blue;\n  color: yellow/);
assert.equal(duplicateDeclarationMerged.orderedCascadeOccurrenceEvidence[0].mergedOccurrences[1].declarationOrdinal, 1);

const sameOccurrenceConflict = safeMergeCssSource({
  id: 'css_duplicate_cascade_same_occurrence_conflict',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateRuleBase,
  workerSourceText: duplicateRuleWorker,
  headSourceText: '.alert { color: orange; }\n.alert { color: green; }\n'
});
assert.equal(sameOccurrenceConflict.status, 'blocked');
assert.equal(sameOccurrenceConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'css-ordered-cascade-occurrence-conflict'), true);
assert.equal(sameOccurrenceConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved'), false);

const countChangedBlocked = safeMergeCssSource({
  id: 'css_duplicate_cascade_count_changed_blocked',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateRuleBase,
  workerSourceText: '.alert { color: blue; }\n.alert { color: green; }\n.alert { color: black; }\n',
  headSourceText: duplicateRuleHead
});
assert.equal(countChangedBlocked.status, 'blocked');
assert.equal(countChangedBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved'), true);

const scopedDuplicateBlocked = safeMergeCssSource({
  id: 'css_scoped_duplicate_cascade_still_needs_scope_proof',
  sourcePath: 'alerts.css',
  baseSourceText: '@layer theme {\n  .alert { color: red; }\n  .alert { color: green; }\n}\n',
  workerSourceText: '@layer theme {\n  .alert { color: blue; }\n  .alert { color: green; }\n}\n',
  headSourceText: '@layer theme {\n  .alert { color: red; }\n  .alert { color: yellow; }\n}\n',
  scopedCascadeGraphHash: 'hash_scoped_cascade'
});
assert.equal(scopedDuplicateBlocked.status, 'blocked');
assert.equal(scopedDuplicateBlocked.orderedCascadeOccurrenceEvidence.length, 1);
assert.equal(scopedDuplicateBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved'), false);

const repeatedSelectorDifferentProperty = safeMergeCssSource({
  id: 'css_repeated_selector_different_property_allowed',
  sourcePath: 'alerts.css',
  baseSourceText: '.alert { color: red; }\n.alert { background-color: white; }\n',
  workerSourceText: '.alert { color: blue; }\n.alert { background-color: white; }\n',
  headSourceText: '.alert { color: red; }\n.alert { background-color: black; }\n'
});
assert.equal(repeatedSelectorDifferentProperty.status, 'merged');
assert.match(repeatedSelectorDifferentProperty.mergedSourceText, /color: blue/);
assert.match(repeatedSelectorDifferentProperty.mergedSourceText, /background-color: black/);

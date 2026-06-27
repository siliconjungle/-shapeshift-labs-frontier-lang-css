import assert from 'node:assert/strict';
import { safeMergeCssSource } from '../dist/index.js';

const duplicateRuleBase = '.alert { color: red; }\n.alert { color: green; }\n';
const duplicateRuleWorker = '.alert { color: blue; }\n.alert { color: green; }\n';
const duplicateRuleHead = '.alert { color: red; }\n.alert { color: yellow; }\n';
const duplicateRuleBlocked = safeMergeCssSource({
  id: 'css_duplicate_cascade_rule_blocked',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateRuleBase,
  workerSourceText: duplicateRuleWorker,
  headSourceText: duplicateRuleHead
});
assert.equal(duplicateRuleBlocked.status, 'blocked');
assert.equal(duplicateRuleBlocked.conflicts.some((conflict) => conflict.code === 'css-duplicate-cascade-key-blocked'), true);
assert.equal(duplicateRuleBlocked.admission.reasonCodes.includes('css-duplicate-cascade-key-order-unproved'), true);
const duplicateRuleConflict = duplicateRuleBlocked.conflicts.find((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved');
assert.equal(duplicateRuleConflict.details.cascadeKey, '.alert::color');
assert.equal(duplicateRuleConflict.details.count, 2);
assert.equal(duplicateRuleConflict.details.declarations.length, 2);
assert.equal(duplicateRuleConflict.details.proofGap.failClosed, true);

const duplicateDeclarationBase = '.alert { color: red; color: green; }\n';
const duplicateDeclarationWorker = '.alert { color: blue; color: green; }\n';
const duplicateDeclarationHead = '.alert { color: red; color: yellow; }\n';
const duplicateDeclarationBlocked = safeMergeCssSource({
  id: 'css_duplicate_cascade_declaration_blocked',
  sourcePath: 'alerts.css',
  baseSourceText: duplicateDeclarationBase,
  workerSourceText: duplicateDeclarationWorker,
  headSourceText: duplicateDeclarationHead
});
assert.equal(duplicateDeclarationBlocked.status, 'blocked');
assert.equal(duplicateDeclarationBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved'), true);
assert.equal(duplicateDeclarationBlocked.conflicts.some((conflict) => conflict.details.declarations?.some((entry) => entry.declarationOrdinal === 1)), true);

const scopedDuplicateBase = '@layer theme {\n  .alert { color: red; }\n  .alert { color: green; }\n}\n';
const scopedDuplicateWorker = '@layer theme {\n  .alert { color: blue; }\n  .alert { color: green; }\n}\n';
const scopedDuplicateHead = '@layer theme {\n  .alert { color: red; }\n  .alert { color: yellow; }\n}\n';
const scopedDuplicateBlocked = safeMergeCssSource({
  id: 'css_scoped_duplicate_cascade_blocked',
  sourcePath: 'alerts.css',
  baseSourceText: scopedDuplicateBase,
  workerSourceText: scopedDuplicateWorker,
  headSourceText: scopedDuplicateHead,
  scopedCascadeGraphHash: 'hash_scoped_cascade'
});
assert.equal(scopedDuplicateBlocked.status, 'blocked');
assert.equal(scopedDuplicateBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'css-duplicate-cascade-key-order-unproved' && conflict.details.cascadeKey === '@layer theme::.alert::color'), true);

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

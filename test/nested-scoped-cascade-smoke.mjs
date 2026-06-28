import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { parseCssSemanticSheet, safeMergeCssSource } from '../dist/index.js';

const base = [
  '@media (min-width: 48rem) {',
  '  @layer components {',
  '    @scope (.card) {',
  '      .card {',
  '        & .button {',
  '          color: red;',
  '          padding-left: 1rem;',
  '        }',
  '      }',
  '    }',
  '  }',
  '}',
  ''
].join('\n');
const worker = base.replace('color: red', 'color: blue');
const head = base.replace('padding-left: 1rem;', 'padding-left: 1rem;\n          background-color: white;');
const output = [
  '@media (min-width: 48rem) {',
  '  @layer components {',
  '    @scope (.card) {',
  '      .card .button {',
  '        color: blue;',
  '        padding-left: 1rem;',
  '        background-color: white;',
  '      }',
  '    }',
  '  }',
  '}',
  ''
].join('\n');
const shapeKey = '@media (min-width: 48rem)::@layer components::@scope (.card)';
const graphHash = 'hash_nested_css_expansion_scope';

const sheet = parseCssSemanticSheet(base, {
  sourcePath: 'nested.css',
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: graphHash }
});
const nestedRule = sheet.records.find((record) => record.kind === 'rule' && record.selectors?.includes('.card .button'));
assert.ok(nestedRule, 'nested rule should be expanded into parser-backed semantic record');
assert.deepEqual(nestedRule.nestedSelectorExpansion.parentSelectors, ['.card']);
assert.deepEqual(nestedRule.nestedSelectorExpansion.nestedSelectors, ['& .button']);
assert.equal(nestedRule.nestedSelectorExpansion.sourceBound, true);
assert.equal(nestedRule.declarations.length, 2);
assert.equal(nestedRule.declarations.every((declaration) => declaration.sourceSpan?.startOffset !== undefined), true);
assert.equal(sheet.proofGaps.some((gap) => gap.code === 'css-nesting-semantic-unproved'), false);

const missingProof = safeMergeCssSource({
  id: 'css_nested_scope_missing_proof',
  sourcePath: 'nested.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: graphHash }
});
assert.equal(missingProof.status, 'blocked');
assert.equal(missingProof.parserEvidence.parserBackedDeclarationSpans, true);
assert.equal(missingProof.parserEvidence.declarationSpanMissingCount, 0);
assert.equal(missingProof.conflicts.some((conflict) => conflict.code === 'css-scoped-cascade-proof-blocked'), true);
assert.equal(missingProof.conflicts.some((conflict) => conflict.details.reasonCode === 'css-nesting-semantic-unproved'), false);

const proof = {
  id: 'proof_css_nested_scope_expansion',
  kind: 'css-source-bound-scoped-cascade-proof',
  status: 'passed',
  sourcePath: 'nested.css',
  reasonCodes: ['css-scoped-cascade-equivalence-unproved', 'css-media-cascade-scope-unproved', 'css-layer-cascade-scope-unproved', 'css-scope-cascade-scope-unproved'],
  sides: ['worker', 'head'],
  selectors: ['.card .button'],
  scopes: ['@media (min-width: 48rem)', '@layer components', '@scope (.card)'],
  cascadeKeys: [`${shapeKey}::.card .button::color`, `${shapeKey}::.card .button::background-color`],
  properties: ['color', 'background-color'],
  scopedCascadeGraphShapeKey: shapeKey,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: graphHash },
  baseSourceHash: hashSemanticValue(base),
  workerSourceHash: hashSemanticValue(worker),
  headSourceHash: hashSemanticValue(head),
  outputSourceHash: hashSemanticValue(output)
};

const staleProof = safeMergeCssSource({
  id: 'css_nested_scope_stale_proof',
  sourcePath: 'nested.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: graphHash },
  cssScopedCascadeProofs: [{ ...proof, outputSourceHash: hashSemanticValue('stale output') }]
});
assert.equal(staleProof.status, 'blocked');
assert.equal(staleProof.conflicts.some((conflict) => conflict.code === 'css-scoped-cascade-proof-blocked'), true);

const proven = safeMergeCssSource({
  id: 'css_nested_scope_proven',
  sourcePath: 'nested.css',
  baseSourceText: base,
  workerSourceText: worker,
  headSourceText: head,
  scopedCascadeGraphHashesByShapeKey: { [shapeKey]: graphHash },
  cssScopedCascadeProofs: [proof]
});
assert.equal(proven.status, 'merged');
assert.equal(proven.mergedSourceText, output);
assert.equal(proven.scopedCascadeProofs.length, 2);
assert.equal(proven.browserCascadeEquivalenceClaim, false);

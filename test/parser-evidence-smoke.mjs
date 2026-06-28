import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { parseCssSemanticSheet, safeMergeCssSource } from '../dist/index.js';

const source = [
  ':root { --brand: rebeccapurple; }',
  '.todo[data-state="done"] { color: var(--brand); margin: 0 1rem; }',
  '@media (min-width: 700px) {',
  '  .todo { display: grid; gap: 1rem; }',
  '}'
].join('\n');

const sheet = parseCssSemanticSheet(source, { sourcePath: 'view.css' });
const todoRule = sheet.records.find((record) => record.kind === 'rule' && record.selectors?.includes('.todo[data-state="done"]'));
const expectedSourceHash = hashSemanticValue({ kind: 'frontier.lang.css.source.v1', sourceText: source });
assert.equal(sheet.parser.name, 'postcss');
assert.equal(sheet.sourceHash, expectedSourceHash);
assert.equal(sheet.summary.parseErrors, 0);
assert.equal(todoRule.parser, 'postcss');
assert.equal(todoRule.sourceSpan.startOffset > 0, true);
assert.equal(Boolean(todoRule.rawTextHash), true);
assert.equal(todoRule.declarations.find((declaration) => declaration.property === 'color').sourceSpan.startLine, 2);
assert.deepEqual(todoRule.selectorSpecificityRecords[0].specificity, [0, 2, 0]);

const modernSelectorSheet = parseCssSemanticSheet(':is(.card, #hero) > button:nth-child(2n of .primary, #cta) { color: red; }\n', { sourcePath: 'specificity.css' });
const modernSelectorRule = modernSelectorSheet.records.find((record) => record.kind === 'rule');
assert.deepEqual(modernSelectorRule.specificity[0], [2, 1, 1]);
assert.equal(modernSelectorRule.selectorSpecificityRecords[0].algorithm, 'selectors-level-4');
assert.equal(modernSelectorRule.selectorSpecificityRecords[0].parserBackedSelectorSpecificity, true);
assert.equal(modernSelectorRule.selectorSpecificityRecords[0].functionalPseudoSpecificity, true);

const cssParserErrorSheet = parseCssSemanticSheet('.broken { color red; }\n', { sourcePath: 'broken.css' });
assert.equal(cssParserErrorSheet.parser.parseErrors.length, 1);
assert.equal(cssParserErrorSheet.proofGaps.some((gap) => gap.code === 'css-parser-error'), true);

const cssParserErrorMerge = safeMergeCssSource({
  id: 'css_parser_error_blocks_merge',
  sourcePath: 'broken.css',
  baseSourceText: '.broken { color red; }\n',
  workerSourceText: '.broken { color blue; }\n',
  headSourceText: '.broken { color red; }\n'
});
assert.equal(cssParserErrorMerge.status, 'blocked');
assert.equal(cssParserErrorMerge.conflicts.some((conflict) => conflict.code === 'css-parser-error-blocked'), true);
assert.equal(cssParserErrorMerge.parserEvidence.sides.base.sourceHash, cssParserErrorSheet.sourceHash);
assert.equal(cssParserErrorMerge.parserEvidence.sides.base.sourceTextHash, cssParserErrorSheet.sourceHash);
assert.equal(cssParserErrorMerge.browserCascadeEquivalenceClaim, false);
assert.equal(cssParserErrorMerge.browserRenderEquivalenceClaim, false);

const cssIdenticalParserErrorMerge = safeMergeCssSource({
  id: 'css_identical_parser_error_blocks_merge',
  sourcePath: 'identical-broken.css',
  baseSourceText: '.button { color: red; }\n',
  workerSourceText: '.broken { color red; }\n',
  headSourceText: '.broken { color red; }\n'
});
assert.equal(cssIdenticalParserErrorMerge.status, 'blocked');
assert.equal(cssIdenticalParserErrorMerge.conflicts.some((conflict) => conflict.code === 'css-parser-error-blocked'), true);

const cssMerged = safeMergeCssSource({
  id: 'css_parser_evidence_result',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; padding: 1rem; }\n',
  workerSourceText: '.button { color: blue; padding: 1rem; }\n',
  headSourceText: '.button { color: red; padding: 1rem; background-color: white; }\n'
});
const baseParserSourceHash = hashSemanticValue({ kind: 'frontier.lang.css.source.v1', sourceText: '.button { color: red; padding: 1rem; }\n' });
assert.equal(cssMerged.parserEvidence.parserNames.includes('postcss'), true);
assert.equal(cssMerged.parserEvidence.sourceHashPresent, true);
assert.equal(cssMerged.parserEvidence.sides.base.sourceHash, baseParserSourceHash);
assert.equal(cssMerged.parserEvidence.sides.base.sourceTextHash, baseParserSourceHash);
assert.equal(cssMerged.parserEvidence.sides.base.evidenceSourceHash, baseParserSourceHash);
assert.equal(cssMerged.parserEvidence.sourceHashes.base, baseParserSourceHash);
assert.equal(cssMerged.parserEvidence.sourceTextHashes.base, baseParserSourceHash);
assert.equal(cssMerged.parserEvidence.parserBackedSourceSpans, true);
assert.equal(cssMerged.parserEvidence.parserBackedDeclarationSpans, true);
assert.equal(cssMerged.parserEvidence.parserBackedTriviaHashes, true);
assert.equal(cssMerged.parserEvidence.parseErrors, 0);
assert.equal(cssMerged.parserEvidence.sides.base.sourceSpanRecordCount, 1);
assert.equal(cssMerged.parserEvidence.sides.base.sourceSpanMissingRecordCount, 0);
assert.equal(cssMerged.parserEvidence.sides.base.declarationSpanCount, 2);
assert.equal(cssMerged.parserEvidence.sides.base.declarationSpanMissingCount, 0);
assert.equal(cssMerged.parserEvidence.sides.base.triviaHashRecordCount, 1);
assert.equal(cssMerged.parserEvidence.sides.base.triviaHashMissingRecordCount, 0);

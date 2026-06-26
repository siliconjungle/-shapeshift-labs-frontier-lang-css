import assert from 'node:assert/strict';
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
assert.equal(sheet.parser.name, 'postcss');
assert.equal(sheet.summary.parseErrors, 0);
assert.equal(todoRule.parser, 'postcss');
assert.equal(todoRule.sourceSpan.startOffset > 0, true);
assert.equal(Boolean(todoRule.rawTextHash), true);
assert.equal(todoRule.declarations.find((declaration) => declaration.property === 'color').sourceSpan.startLine, 2);

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

const cssMerged = safeMergeCssSource({
  id: 'css_parser_evidence_result',
  sourcePath: 'button.css',
  baseSourceText: '.button { color: red; padding: 1rem; }\n',
  workerSourceText: '.button { color: blue; padding: 1rem; }\n',
  headSourceText: '.button { color: red; padding: 1rem; background-color: white; }\n'
});
assert.equal(cssMerged.parserEvidence.parserNames.includes('postcss'), true);
assert.equal(cssMerged.parserEvidence.parserBackedSourceSpans, true);
assert.equal(cssMerged.parserEvidence.parserBackedDeclarationSpans, true);
assert.equal(cssMerged.parserEvidence.parserBackedTriviaHashes, true);
assert.equal(cssMerged.parserEvidence.parseErrors, 0);

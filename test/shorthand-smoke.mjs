import assert from 'node:assert/strict';
import { safeMergeCssSource } from '../dist/index.js';

const cssBorderSideShorthandConflict = safeMergeCssSource({
  id: 'css_border_side_shorthand_conflict',
  sourcePath: 'button.css',
  baseSourceText: '.button { border-top: 1px solid red; }\n',
  workerSourceText: '.button { border-top: 2px solid red; }\n',
  headSourceText: '.button { border-top: 1px solid red; border-top-color: blue; }\n'
});
assert.equal(cssBorderSideShorthandConflict.status, 'blocked');
assert.equal(cssBorderSideShorthandConflict.conflicts.some((conflict) => conflict.code === 'css-shorthand-longhand-conflict'), true);

const cssInsetShorthandConflict = safeMergeCssSource({
  id: 'css_inset_shorthand_conflict',
  sourcePath: 'layout.css',
  baseSourceText: '.panel { inset: 0; }\n',
  workerSourceText: '.panel { inset: 1rem; }\n',
  headSourceText: '.panel { inset: 0; left: 2rem; }\n'
});
assert.equal(cssInsetShorthandConflict.status, 'blocked');
assert.equal(cssInsetShorthandConflict.conflicts.some((conflict) => conflict.code === 'css-shorthand-longhand-conflict'), true);

const cssGapShorthandConflict = safeMergeCssSource({
  id: 'css_gap_shorthand_conflict',
  sourcePath: 'grid.css',
  baseSourceText: '.grid { gap: 1rem; }\n',
  workerSourceText: '.grid { gap: 2rem; }\n',
  headSourceText: '.grid { gap: 1rem; row-gap: 3rem; }\n'
});
assert.equal(cssGapShorthandConflict.status, 'blocked');
assert.equal(cssGapShorthandConflict.conflicts.some((conflict) => conflict.code === 'css-shorthand-longhand-conflict'), true);

const cssGapShorthandExpansion = safeMergeCssSource({
  id: 'css_gap_shorthand_expansion',
  sourcePath: 'grid.css',
  baseSourceText: '.grid { color: red; gap: 1rem; }\n',
  workerSourceText: '.grid { color: blue; gap: 1rem; }\n',
  headSourceText: '.grid { color: red; gap: 2rem 3rem; }\n'
});
assert.equal(cssGapShorthandExpansion.status, 'merged');
const gapExpansion = cssGapShorthandExpansion.shorthandExpansionEvidence.changedShorthands.find((entry) => entry.property === 'gap' && entry.value === '2rem 3rem')?.expansion;
assert.deepEqual(gapExpansion?.longhands, [{ property: 'row-gap', value: '2rem' }, { property: 'column-gap', value: '3rem' }]);

const cssInsetLogicalExpansion = safeMergeCssSource({
  id: 'css_inset_logical_shorthand_expansion',
  sourcePath: 'layout.css',
  baseSourceText: '.panel { color: red; inset-inline: 1rem; }\n',
  workerSourceText: '.panel { color: blue; inset-inline: 1rem; }\n',
  headSourceText: '.panel { color: red; inset-inline: 2rem 3rem; }\n'
});
assert.equal(cssInsetLogicalExpansion.status, 'merged');
const insetExpansion = cssInsetLogicalExpansion.shorthandExpansionEvidence.changedShorthands.find((entry) => entry.property === 'inset-inline' && entry.value === '2rem 3rem')?.expansion;
assert.deepEqual(insetExpansion?.longhands, [{ property: 'inset-inline-start', value: '2rem' }, { property: 'inset-inline-end', value: '3rem' }]);

const cssFontShorthandBlocked = safeMergeCssSource({
  id: 'css_font_shorthand_blocked',
  sourcePath: 'type.css',
  baseSourceText: '.title { color: red; }\n',
  workerSourceText: '.title { color: blue; }\n',
  headSourceText: '.title { color: red; font: italic 1rem/1.5 serif; }\n'
});
assert.equal(cssFontShorthandBlocked.status, 'blocked');
assert.equal(cssFontShorthandBlocked.conflicts.some((conflict) => conflict.details.shorthandExpansion?.reasonCode === 'css-shorthand-expansion-unsupported'), true);

const cssRuntimeSubstitutionShorthandBlocked = safeMergeCssSource({
  id: 'css_runtime_substitution_shorthand_blocked',
  sourcePath: 'layout.css',
  baseSourceText: '.panel { color: red; }\n',
  workerSourceText: '.panel { color: blue; }\n',
  headSourceText: '.panel { color: red; margin: var(--space); }\n'
});
assert.equal(cssRuntimeSubstitutionShorthandBlocked.status, 'blocked');
assert.equal(cssRuntimeSubstitutionShorthandBlocked.conflicts.some((conflict) => conflict.details.shorthandExpansion?.reasonCode === 'css-shorthand-expansion-runtime-substitution'), true);

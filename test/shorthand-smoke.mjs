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

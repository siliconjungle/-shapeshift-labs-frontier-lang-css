import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeCssSource } from '../dist/index.js';

const keyframesBase = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }\n.button { color: red; }\n';
const keyframesHead = keyframesBase.replace('color: red', 'color: blue');
const keyframesWorker = keyframesBase.replace('opacity: 1', 'opacity: .8');

const preservedKeyframes = safeMergeCssSource({
  id: 'css_keyframes_preserved',
  sourcePath: 'anim.css',
  baseSourceText: keyframesBase,
  workerSourceText: keyframesBase.replace('color: red', 'color: blue'),
  headSourceText: keyframesBase.replace('.button {', '.button { background: white;')
});
assert.equal(preservedKeyframes.status, 'merged');
assert.match(preservedKeyframes.mergedSourceText, /@keyframes fade/);
assert.match(preservedKeyframes.mergedSourceText, /color: blue/);
assert.match(preservedKeyframes.mergedSourceText, /background: white/);

const fontFaceBase = '@font-face { font-family: Inter; src: url("/inter.woff2"); }\n.button { color: red; }\n';
const preservedFontFace = safeMergeCssSource({
  id: 'css_font_face_preserved',
  sourcePath: 'fonts.css',
  baseSourceText: fontFaceBase,
  workerSourceText: fontFaceBase.replace('color: red', 'color: blue'),
  headSourceText: fontFaceBase.replace('.button {', '.button { background: white;')
});
assert.equal(preservedFontFace.status, 'merged');
assert.match(preservedFontFace.mergedSourceText, /@font-face/);
assert.match(preservedFontFace.mergedSourceText, /color: blue/);
assert.match(preservedFontFace.mergedSourceText, /background: white/);

const blockedKeyframes = safeMergeCssSource({
  id: 'css_keyframes_unproved',
  sourcePath: 'anim.css',
  baseSourceText: keyframesBase,
  workerSourceText: keyframesWorker,
  headSourceText: keyframesHead
});
assert.equal(blockedKeyframes.status, 'blocked');
assert.equal(blockedKeyframes.conflicts.some((item) => item.details.reasonCode === 'css-keyframes-runtime-equivalence-unproved'), true);

const blockedFontFace = safeMergeCssSource({
  id: 'css_font_face_unproved',
  sourcePath: 'fonts.css',
  baseSourceText: fontFaceBase,
  workerSourceText: fontFaceBase.replace('/inter.woff2', '/inter-v2.woff2'),
  headSourceText: fontFaceBase.replace('.button {', '.button { background: white;')
});
assert.equal(blockedFontFace.status, 'blocked');
assert.equal(blockedFontFace.conflicts.some((item) => item.details.reasonCode === 'css-font-face-runtime-equivalence-unproved'), true);

const provenOutput = '@keyframes fade { from { opacity: 0; } to { opacity: .8; } }\n\n.button {\n  color: blue;\n}\n';
const provenKeyframes = safeMergeCssSource({
  id: 'css_keyframes_proven',
  sourcePath: 'anim.css',
  baseSourceText: keyframesBase,
  workerSourceText: keyframesWorker,
  headSourceText: keyframesHead,
  cssCascadeRuntimeProofs: [{
    id: 'proof_css_keyframes_runtime',
    kind: 'css-source-bound-cascade-runtime-proof',
    status: 'passed',
    sourcePath: 'anim.css',
    reasonCode: 'css-keyframes-runtime-equivalence-unproved',
    side: 'worker',
    shapeKey: 'at-rule:keyframes::fade',
    baseSourceHash: hashSemanticValue(keyframesBase),
    workerSourceHash: hashSemanticValue(keyframesWorker),
    headSourceHash: hashSemanticValue(keyframesHead),
    outputSourceHash: hashSemanticValue(provenOutput)
  }]
});
assert.equal(provenKeyframes.status, 'merged');
assert.equal(provenKeyframes.mergedSourceText, provenOutput);
assert.equal(provenKeyframes.cascadeRuntimeProofs.length, 1);

const divergentKeyframes = safeMergeCssSource({
  id: 'css_keyframes_divergent',
  sourcePath: 'anim.css',
  baseSourceText: keyframesBase,
  workerSourceText: keyframesBase.replace('opacity: 1', 'opacity: .8'),
  headSourceText: keyframesBase.replace('opacity: 1', 'opacity: .9')
});
assert.equal(divergentKeyframes.status, 'blocked');
assert.equal(divergentKeyframes.conflicts.some((item) => item.details.reasonCode === 'css-atrule-block-conflict'), true);

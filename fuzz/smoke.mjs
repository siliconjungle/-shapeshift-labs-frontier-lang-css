import assert from 'node:assert/strict';
import { createDocument, entityNode } from '@shapeshift-labs/frontier-lang-kernel';
import { createCssSemanticMergeEvidence, emitCss, emitCssWithSourceMap } from '../dist/index.js';

for (let index = 0; index < 100; index += 1) {
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [
    entityNode({ id: `ent_${index}`, name: 'Todo', fields: [{ id: `field_title_${index}`, name: 'title', type: 'Text' }] })
  ] });
  const output = emitCss(document);
  const mapped = emitCssWithSourceMap(document, { targetPath: `doc_${index}.css` });
  const evidence = createCssSemanticMergeEvidence(`.todo-${index} { color: red; --index: ${index}; }`);
  assert.match(output, /\.frontier-Todo/);
  assert.equal(mapped.code, output);
  assert.equal(mapped.sourceMap.target.language, 'css');
  assert.equal(evidence.status, 'ready');
  assert.equal(evidence.records.some((record) => record.customProperties?.includes('--index')), true);
}

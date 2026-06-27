function atRuleBlockEntry(record, key) {
  if (!shouldRenderOpaqueAtRuleBlock(record)) return undefined;
  return {
    key,
    scopes: record.scopes ?? [],
    atRuleName: record.atRuleName,
    conditionText: record.conditionText,
    blockText: record.blockText,
    rawTextHash: record.rawTextHash,
    atRuleHash: record.atRuleHash
  };
}

function shouldRenderOpaqueAtRuleBlock(record) {
  return record.kind === 'at-rule' && !ScopeAtRules.has(record.atRuleName) && typeof record.blockText === 'string';
}

function changedAtRuleBlocks(baseIndex, currentIndex, side) {
  const baseBlocks = baseIndex.atRuleBlocks ?? new Map();
  const currentBlocks = currentIndex.atRuleBlocks ?? new Map();
  const keys = unique([...baseBlocks.keys(), ...currentBlocks.keys()]);
  return keys.flatMap((key) => {
    const before = baseBlocks.get(key);
    const after = currentBlocks.get(key);
    if ((before?.rawTextHash ?? '') === (after?.rawTextHash ?? '')) return [];
    return [{ side, key, before, after, kind: before && after ? 'update' : before ? 'delete' : 'add' }];
  });
}

function atRuleBlockOverlapConflicts(id, sourcePath, workerChanges, headChanges, conflict) {
  const headByKey = new Map(headChanges.map((change) => [change.key, change]));
  return workerChanges.flatMap((workerChange) => {
    const headChange = headByKey.get(workerChange.key);
    if (!headChange || sameAtRuleBlockChange(workerChange, headChange)) return [];
    return [conflict(id, sourcePath, 'css-atrule-block-conflict', 'css-atrule-block-conflict', {
      shapeKey: workerChange.key,
      worker: atRuleBlockChangeDetails(workerChange),
      head: atRuleBlockChangeDetails(headChange)
    })];
  });
}

function applyAtRuleBlockChanges(index, changes) {
  const atRuleBlocks = new Map(index.atRuleBlocks);
  const atRuleBlockOrder = [...(index.atRuleBlockOrder ?? [])];
  for (const change of changes) {
    if (!change.after) atRuleBlocks.delete(change.key);
    else {
      atRuleBlocks.set(change.key, change.after);
      if (!atRuleBlockOrder.includes(change.key)) atRuleBlockOrder.push(change.key);
    }
  }
  return { ...index, atRuleBlocks, atRuleBlockOrder: atRuleBlockOrder.filter((key) => atRuleBlocks.has(key)) };
}

function renderAtRuleStatement(chunks, statement) {
  let indent = 0;
  for (const scope of statement.scopes ?? []) {
    chunks.push(`${spaces(indent)}${scope} {`);
    indent += 2;
  }
  chunks.push(`${spaces(indent)}${statement.statementText}`);
  closeScopes(chunks, statement.scopes, indent);
  chunks.push('');
}

function renderAtRuleBlock(chunks, block) {
  if (!block) return;
  let indent = 0;
  for (const scope of block.scopes ?? []) {
    chunks.push(`${spaces(indent)}${scope} {`);
    indent += 2;
  }
  chunks.push(indentText(block.blockText, indent));
  closeScopes(chunks, block.scopes, indent);
  chunks.push('');
}

function closeScopes(chunks, scopes = [], indent) {
  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    indent -= 2;
    chunks.push(`${spaces(indent)}}`);
  }
}

function atRuleBlockChangeDetails(change) {
  const block = change.after ?? change.before;
  return { kind: change.kind, atRuleName: block?.atRuleName, conditionText: block?.conditionText, rawTextHash: change.after?.rawTextHash };
}

function sameAtRuleBlockChange(left, right) { return (left.after?.rawTextHash ?? '') === (right.after?.rawTextHash ?? '') && left.kind === right.kind; }
function atRuleOccurrenceKey(record, counts, prefix = 'at-rule') {
  if (record.kind !== 'at-rule') return undefined;
  const baseKey = `${prefix}:${[...(record.scopes ?? []), record.atRuleName, record.conditionText].join('::')}`;
  const count = (counts.get(baseKey) ?? 0) + 1;
  counts.set(baseKey, count);
  return count === 1 ? baseKey : `${baseKey}#${count}`;
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function spaces(count) { return ' '.repeat(Math.max(0, count)); }
function indentText(text, indent) { return String(text ?? '').split('\n').map((line) => line ? `${spaces(indent)}${line}` : line).join('\n'); }

const ScopeAtRules = new Set(['media', 'supports', 'container', 'layer', 'scope']);

export { applyAtRuleBlockChanges, atRuleBlockEntry, atRuleBlockOverlapConflicts, atRuleOccurrenceKey, changedAtRuleBlocks, renderAtRuleBlock, renderAtRuleStatement };

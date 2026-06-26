function safeMergeCssSource(input = {}, context = {}) {
  const parseSheet = context.parseCssSemanticSheet;
  const hash = context.hashSemanticValue;
  const id = String(input.id ?? 'css_safe_merge');
  const sourcePath = input.sourcePath;
  const base = input.baseSourceText;
  const worker = input.workerSourceText ?? base;
  const head = input.headSourceText ?? base;
  if (typeof base !== 'string' || typeof worker !== 'string' || typeof head !== 'string') return blocked(id, sourcePath, 'css-source-text-missing');
  if (worker === head) return merged(id, sourcePath, worker, 'worker-head-identical', hash);
  if (worker === base) return merged(id, sourcePath, head, 'worker-unchanged', hash);
  if (head === base) return merged(id, sourcePath, worker, 'head-unchanged', hash);
  const sheets = {
    base: parseSheet(base, { sourcePath }),
    worker: parseSheet(worker, { sourcePath }),
    head: parseSheet(head, { sourcePath })
  };
  const indexes = Object.fromEntries(Object.entries(sheets).map(([name, sheet]) => [name, declarationIndex(sheet)]));
  const changed = {
    worker: changedDeclarations(indexes.base, indexes.worker, 'worker'),
    head: changedDeclarations(indexes.base, indexes.head, 'head')
  };
  const proofConflicts = proofGapConflicts(id, sourcePath, changed, indexes);
  const overlapConflicts = overlapDeclarationConflicts(id, sourcePath, changed.worker, changed.head);
  const conflicts = [...proofConflicts, ...overlapConflicts];
  if (conflicts.length) return blocked(id, sourcePath, 'css-semantic-merge-conflict', conflicts);
  const mergedIndex = applyDeclarationChanges(applyDeclarationChanges(indexes.base, changed.head), changed.worker);
  return merged(id, sourcePath, renderDeclarationIndex(mergedIndex), 'semantic-declaration-merge', hash, {
    baseSheetHash: sheets.base.sheetHash,
    workerSheetHash: sheets.worker.sheetHash,
    headSheetHash: sheets.head.sheetHash,
    workerChangedDeclarations: changed.worker.length,
    headChangedDeclarations: changed.head.length
  });
}

function declarationIndex(sheet) {
  const declarations = new Map();
  const order = [];
  for (const record of sheet.records) {
    if (record.kind !== 'rule') continue;
    const ruleKey = ruleIdentityKey(record);
    for (const declaration of record.declarations ?? []) {
      const entry = {
        key: declaration.cascadeKey,
        ruleKey,
        selectors: record.selectors,
        scopes: record.scopes ?? [],
        property: declaration.property,
        value: declaration.value,
        important: declaration.important,
        declarationHash: declaration.declarationHash,
        proofGaps: proofGapsForDeclaration(record, declaration)
      };
      declarations.set(entry.key, entry);
      order.push(entry.key);
    }
  }
  return { declarations, order: unique(order) };
}

function changedDeclarations(baseIndex, currentIndex, side) {
  const keys = unique([...baseIndex.declarations.keys(), ...currentIndex.declarations.keys()]);
  return keys.flatMap((key) => {
    const before = baseIndex.declarations.get(key);
    const after = currentIndex.declarations.get(key);
    if ((before?.declarationHash ?? '') === (after?.declarationHash ?? '')) return [];
    return [{ side, key, before, after, kind: before && after ? 'update' : before ? 'delete' : 'add' }];
  });
}

function proofGapConflicts(id, sourcePath, changed, indexes) {
  const changedKeys = new Set([...changed.worker, ...changed.head].map((change) => change.key));
  return [...changedKeys].flatMap((key) => {
    const entry = indexes.worker.declarations.get(key) ?? indexes.head.declarations.get(key);
    return (entry?.proofGaps ?? []).map((gap) => conflict(id, sourcePath, 'css-proof-gap-blocked', gap.code, {
      cascadeKey: key,
      proofGap: gap
    }));
  });
}

function overlapDeclarationConflicts(id, sourcePath, workerChanges, headChanges) {
  const headByKey = new Map(headChanges.map((change) => [change.key, change]));
  return workerChanges.flatMap((workerChange) => {
    const headChange = headByKey.get(workerChange.key);
    if (!headChange || sameChange(workerChange, headChange)) return [];
    return [conflict(id, sourcePath, 'css-cascade-declaration-conflict', 'css-cascade-declaration-conflict', {
      cascadeKey: workerChange.key,
      worker: changeDetails(workerChange),
      head: changeDetails(headChange)
    })];
  });
}

function applyDeclarationChanges(index, changes) {
  const declarations = new Map(index.declarations);
  const order = [...index.order];
  for (const change of changes) {
    if (!change.after) declarations.delete(change.key);
    else {
      declarations.set(change.key, change.after);
      if (!order.includes(change.key)) order.push(change.key);
    }
  }
  return { declarations, order: order.filter((key) => declarations.has(key)) };
}

function renderDeclarationIndex(index) {
  const groups = new Map();
  for (const key of index.order) {
    const declaration = index.declarations.get(key);
    if (!declaration || declaration.scopes.length) continue;
    groups.set(declaration.ruleKey, [...(groups.get(declaration.ruleKey) ?? []), declaration]);
  }
  const chunks = [];
  for (const declarations of groups.values()) {
    chunks.push(`${declarations[0].selectors.join(', ')} {`);
    for (const declaration of declarations) chunks.push(`  ${declaration.property}: ${declaration.value};`);
    chunks.push('}', '');
  }
  return `${chunks.join('\n').trimEnd()}\n`;
}

function merged(id, sourcePath, sourceText, operation, hash, extra = {}) {
  return result(id, sourcePath, 'merged', {
    operation,
    mergedSourceText: sourceText,
    mergedSourceHash: hash?.(sourceText),
    conflicts: [],
    ...extra
  });
}

function blocked(id, sourcePath, reasonCode, conflicts = []) {
  return result(id, sourcePath, 'blocked', {
    operation: 'blocked',
    conflicts: conflicts.length ? conflicts : [conflict(id, sourcePath, reasonCode, reasonCode)]
  });
}

function result(id, sourcePath, status, body) {
  return {
    kind: 'frontier.lang.cssSafeMerge',
    version: 1,
    id,
    sourcePath,
    status,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    ...body,
    admission: {
      status: status === 'merged' ? 'auto-merge-candidate' : 'blocked',
      action: status === 'merged' ? 'apply-css' : 'human-review',
      reviewRequired: status !== 'merged',
      reasonCodes: unique((body.conflicts ?? []).map((item) => item.details.reasonCode))
    }
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function sameChange(left, right) { return (left.after?.declarationHash ?? '') === (right.after?.declarationHash ?? '') && left.kind === right.kind; }
function changeDetails(change) { return { kind: change.kind, property: change.after?.property ?? change.before?.property, value: change.after?.value, beforeValue: change.before?.value }; }
function ruleIdentityKey(record) { return [...(record.scopes ?? []), record.selectors.join(',')].join('::'); }
function proofGapsForDeclaration(record, declaration) {
  return (record.proofGaps ?? []).filter((gap) => gap.code !== 'css-shorthand-expansion-unproved' || gap.summary.includes(` ${declaration.property} `));
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export { safeMergeCssSource };

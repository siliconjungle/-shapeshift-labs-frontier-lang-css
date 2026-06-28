function planOrderedDuplicateCascadeMerge(id, sourcePath, indexes, hash) {
  const keys = unique(Object.values(indexes).flatMap((index) => (index.duplicateCascadeKeyGroups ?? []).map((group) => group.cascadeKey)));
  const conflicts = [];
  const evidence = [];
  const mergedEntriesByCascadeKey = new Map();
  const suppressedDuplicateConflictKeys = new Set();
  for (const cascadeKey of keys) {
    const groups = Object.fromEntries(Object.entries(indexes).map(([side, index]) => [side, duplicateGroup(index, cascadeKey)]));
    if (!groups.base || !groups.worker || !groups.head || !sameOccurrenceCount(groups)) continue;
    const shapeConflict = occurrenceShapeConflict(id, sourcePath, cascadeKey, groups);
    if (shapeConflict) {
      conflicts.push(shapeConflict);
      continue;
    }
    suppressedDuplicateConflictKeys.add(cascadeKey);
    const merged = mergeStableOccurrences(id, sourcePath, cascadeKey, groups);
    conflicts.push(...merged.conflicts);
    if (merged.conflicts.length) continue;
    mergedEntriesByCascadeKey.set(cascadeKey, merged.entries);
    evidence.push(orderedOccurrenceEvidence(sourcePath, cascadeKey, indexes, groups, merged.entries, hash));
  }
  return { conflicts, evidence, mergedEntriesByCascadeKey, suppressedDuplicateConflictKeys };
}

function duplicateCascadeKeyConflictsForIndexes(id, sourcePath, indexes, suppressedDuplicateConflictKeys = new Set()) {
  return Object.entries(indexes).flatMap(([side, index]) => (index.duplicateCascadeKeyGroups ?? [])
    .filter((group) => !suppressedDuplicateConflictKeys.has(group.cascadeKey) && !suppressedDuplicateConflictKeys.has(`${side}#${group.cascadeKey}`))
    .map((group) => conflict(id, sourcePath, side, group)));
}

function applyOrderedDuplicateCascadeMerge(index, plan) {
  return plan?.mergedEntriesByCascadeKey?.size ? { ...index, orderedDuplicateCascadeEntriesByKey: plan.mergedEntriesByCascadeKey } : index;
}

function duplicateGroup(index, cascadeKey) {
  return (index.duplicateCascadeKeyGroups ?? []).find((group) => group.cascadeKey === cascadeKey);
}

function sameOccurrenceCount(groups) {
  return groups.base.count === groups.worker.count && groups.base.count === groups.head.count;
}

function occurrenceShapeConflict(id, sourcePath, cascadeKey, groups) {
  for (let index = 0; index < groups.base.entries.length; index += 1) {
    const base = groups.base.entries[index];
    if (!sameOccurrenceShape(base, groups.worker.entries[index]) || !sameOccurrenceShape(base, groups.head.entries[index])) {
      return orderConflict(id, sourcePath, 'css-duplicate-cascade-key-order-unproved', {
        cascadeKey,
        cascadeOccurrenceIndex: index,
        base: duplicateCascadeDeclarationDetails(base),
        worker: duplicateCascadeDeclarationDetails(groups.worker.entries[index]),
        head: duplicateCascadeDeclarationDetails(groups.head.entries[index])
      });
    }
  }
  return undefined;
}

function sameOccurrenceShape(left, right) {
  return Boolean(left && right) &&
    left.ruleKey === right.ruleKey &&
    left.property === right.property &&
    left.important === right.important &&
    left.declarationOrdinal === right.declarationOrdinal &&
    left.cascadeOccurrenceIndex === right.cascadeOccurrenceIndex &&
    sameList(left.selectors, right.selectors) &&
    sameList(left.scopes, right.scopes);
}

function mergeStableOccurrences(id, sourcePath, cascadeKey, groups) {
  const conflicts = [];
  const entries = [];
  for (let index = 0; index < groups.base.entries.length; index += 1) {
    const base = groups.base.entries[index], worker = groups.worker.entries[index], head = groups.head.entries[index];
    const workerChanged = base.declarationHash !== worker.declarationHash, headChanged = base.declarationHash !== head.declarationHash;
    if (workerChanged && headChanged && worker.declarationHash !== head.declarationHash) {
      conflicts.push(orderConflict(id, sourcePath, 'css-ordered-cascade-occurrence-conflict', {
        cascadeKey,
        cascadeOccurrenceIndex: index,
        base: duplicateCascadeDeclarationDetails(base),
        worker: duplicateCascadeDeclarationDetails(worker),
        head: duplicateCascadeDeclarationDetails(head)
      }));
      continue;
    }
    entries.push({ ...(headChanged ? head : workerChanged ? worker : base), cascadeOccurrenceIndex: index, cascadeOccurrenceKey: `${cascadeKey}#${index}` });
  }
  return { conflicts, entries };
}

function orderedOccurrenceEvidence(sourcePath, cascadeKey, indexes, groups, mergedEntries, hash) {
  const record = compactRecord({
    kind: 'frontier.lang.cssOrderedCascadeOccurrenceEvidence',
    version: 1,
    status: 'passed',
    sourcePath,
    cascadeKey,
    occurrenceCount: mergedEntries.length,
    mergePolicy: 'stable-cascade-occurrence-index-disjoint-updates',
    parserBackedDeclarationOrder: true,
    sourceBound: true,
    baseSourceHash: indexes.base.sourceHash,
    workerSourceHash: indexes.worker.sourceHash,
    headSourceHash: indexes.head.sourceHash,
    baseOrderedCascadeGroupHash: orderedCascadeGroupHash(sourcePath, 'base', cascadeKey, groups.base.entries, hash),
    workerOrderedCascadeGroupHash: orderedCascadeGroupHash(sourcePath, 'worker', cascadeKey, groups.worker.entries, hash),
    headOrderedCascadeGroupHash: orderedCascadeGroupHash(sourcePath, 'head', cascadeKey, groups.head.entries, hash),
    mergedOrderedCascadeGroupHash: orderedCascadeGroupHash(sourcePath, 'merged', cascadeKey, mergedEntries, hash),
    baseOccurrences: groups.base.entries.map(duplicateCascadeDeclarationDetails),
    workerOccurrences: groups.worker.entries.map(duplicateCascadeDeclarationDetails),
    headOccurrences: groups.head.entries.map(duplicateCascadeDeclarationDetails),
    mergedOccurrences: mergedEntries.map(duplicateCascadeDeclarationDetails),
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false
  });
  return compactRecord({ ...record, evidenceHash: hash?.(record) });
}

function orderedCascadeGroupHash(sourcePath, side, cascadeKey, entries, hash) {
  return hash?.({ kind: 'frontier.lang.css.orderedCascadeGroup.v1', sourcePath, side, cascadeKey, entries: entries.map(hashableOccurrence) });
}

function hashableOccurrence(entry) {
  return {
    ruleKey: entry.ruleKey,
    selectors: entry.selectors,
    scopes: entry.scopes,
    property: entry.property,
    value: entry.value,
    important: entry.important,
    declarationOrdinal: entry.declarationOrdinal,
    cascadeOccurrenceIndex: entry.cascadeOccurrenceIndex,
    declarationHash: entry.declarationHash
  };
}

function conflict(id, sourcePath, side, group) {
  return {
    code: 'css-duplicate-cascade-key-blocked',
    gateId: 'css-semantic-merge',
    sourcePath,
    details: {
      reasonCode: 'css-duplicate-cascade-key-order-unproved',
      conflictKey: `css#${id}#css-duplicate-cascade-key-order-unproved#${side}#${group.cascadeKey}`,
      side,
      cascadeKey: group.cascadeKey,
      count: group.count,
      declarations: group.entries.map(duplicateCascadeDeclarationDetails),
      proofGap: {
        code: 'css-duplicate-cascade-key-order-unproved',
        status: 'not-claimed',
        summary: 'Duplicate CSS cascade keys require ordered cascade occurrence evidence before semantic merge admission.',
        failClosed: true,
        semanticEquivalenceClaim: false,
        browserCascadeEquivalenceClaim: false
      }
    }
  };
}

function duplicateCascadeDeclarationDetails(entry) {
  if (!entry) return undefined;
  return {
    ruleKey: entry.ruleKey,
    selectors: entry.selectors,
    scopes: entry.scopes,
    property: entry.property,
    value: entry.value,
    important: entry.important,
    cascadeOccurrenceIndex: entry.cascadeOccurrenceIndex,
    cascadeOccurrenceKey: entry.cascadeOccurrenceKey,
    declarationOrdinal: entry.declarationOrdinal,
    declarationHash: entry.declarationHash
  };
}

function orderConflict(id, sourcePath, reasonCode, details) {
  return { code: reasonCode, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? sourcePath ?? 'source'}#${details.cascadeOccurrenceIndex ?? 'occurrence'}`, ...details } };
}

function sameList(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }

export { applyOrderedDuplicateCascadeMerge, duplicateCascadeKeyConflictsForIndexes, planOrderedDuplicateCascadeMerge };

function duplicateCascadeKeyConflictsForIndexes(id, sourcePath, indexes) {
  return Object.entries(indexes).flatMap(([side, index]) => (index.duplicateCascadeKeyGroups ?? [])
    .map((group) => conflict(id, sourcePath, side, group)));
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
  return {
    ruleKey: entry.ruleKey,
    selectors: entry.selectors,
    scopes: entry.scopes,
    property: entry.property,
    value: entry.value,
    important: entry.important,
    declarationOrdinal: entry.declarationOrdinal,
    declarationHash: entry.declarationHash
  };
}

export { duplicateCascadeKeyConflictsForIndexes };

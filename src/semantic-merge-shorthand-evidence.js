function mergeShorthandExpansionEvidence(indexes, changed) {
  const sides = Object.fromEntries(Object.entries(indexes).map(([side, index]) => [side, shorthandExpansionSideEvidence(index)]));
  const changedEntries = [...changed.worker, ...changed.head].flatMap((change) => [change.before, change.after].filter(Boolean));
  const changedShorthands = changedEntries.filter((entry, index, entries) => entry.shorthandExpansion && entries.findIndex((candidate) => candidate.key === entry.key && candidate.declarationHash === entry.declarationHash) === index);
  const expanded = changedShorthands.filter((entry) => entry.shorthandExpansion.status === 'expanded');
  const unsupported = changedShorthands.filter((entry) => entry.shorthandExpansion.status !== 'expanded');
  return {
    kind: 'frontier.lang.cssSafeMergeShorthandExpansionEvidence',
    version: 1,
    shorthandDeclarationCount: Object.values(sides).reduce((sum, side) => sum + side.shorthandDeclarationCount, 0),
    changedShorthandCount: changedShorthands.length,
    expandedChangedShorthandCount: expanded.length,
    unsupportedChangedShorthandCount: unsupported.length,
    deterministicExpansionClaim: changedShorthands.length > 0 && unsupported.length === 0,
    sides,
    changedShorthands: changedShorthands.map((entry) => ({
      cascadeKey: entry.key,
      property: entry.property,
      value: entry.value,
      expansion: entry.shorthandExpansion
    }))
  };
}

function shorthandExpansionSideEvidence(index) {
  const expansions = [...index.declarations.values()].filter((entry) => entry.shorthandExpansion).map((entry) => entry.shorthandExpansion);
  return {
    shorthandDeclarationCount: expansions.length,
    expandedShorthandDeclarations: expansions.filter((entry) => entry.status === 'expanded').length,
    unsupportedShorthandDeclarations: expansions.filter((entry) => entry.status !== 'expanded').length,
    supportedProperties: unique(expansions.filter((entry) => entry.status === 'expanded').map((entry) => entry.property)),
    unsupportedProperties: unique(expansions.filter((entry) => entry.status !== 'expanded').map((entry) => entry.property))
  };
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }

export { mergeShorthandExpansionEvidence };

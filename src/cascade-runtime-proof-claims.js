function cascadeRuntimeProofBroadClaimFields(proof) {
  return broadClaimEntries(proof)
    .filter((entry) => entry.value === true)
    .map((entry) => entry.path);
}

function broadClaimEntries(proof) {
  return [
    ...broadClaimObjectEntries(proof, ''),
    ...broadClaimObjectEntries(proof?.runtimeProofCapsule, 'runtimeProofCapsule'),
    ...broadClaimObjectEntries(proof?.runtimeEvidence, 'runtimeEvidence'),
    ...broadClaimObjectEntries(proof?.browserEvidence, 'browserEvidence'),
    ...broadClaimObjectEntries(proof?.evidence, 'evidence')
  ];
}

function broadClaimObjectEntries(record, prefix) {
  if (!record || typeof record !== 'object') return [];
  return BroadClaimFields
    .filter((field) => Object.hasOwn(record, field))
    .map((field) => ({ path: prefix ? `${prefix}.${field}` : field, value: record[field] }));
}

const BroadClaimFields = Object.freeze([
  'browserRuntimeEquivalenceClaim',
  'browserCascadeEquivalenceClaim',
  'browserRenderEquivalenceClaim',
  'runtimeEquivalenceClaim',
  'renderEquivalenceClaim',
  'semanticEquivalenceClaim',
  'autoMergeClaim'
]);

export { cascadeRuntimeProofBroadClaimFields };

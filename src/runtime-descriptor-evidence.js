function cssRuntimeDescriptorRecords(record) {
  const tokens = record.dependencyTokens ?? {};
  return {
    propertyRegistrations: propertyRegistrationRecords(record, tokens.propertyRegistration),
    propertyRegistrationDescriptors: propertyRegistrationDescriptorRecords(record, tokens.propertyRegistration),
    pageDescriptors: pageDescriptorRecords(record, tokens.pageDescriptors),
    pageMarginDescriptors: pageMarginDescriptorRecords(record, tokens.pageMarginDescriptors)
  };
}

function cssRuntimeDescriptorGraph(records = []) {
  const sets = records.map(cssRuntimeDescriptorRecords);
  const propertyRegistrations = sets.flatMap((set) => set.propertyRegistrations);
  const propertyRegistrationDescriptors = sets.flatMap((set) => set.propertyRegistrationDescriptors);
  const pageDescriptors = sets.flatMap((set) => set.pageDescriptors);
  const pageMarginDescriptors = sets.flatMap((set) => set.pageMarginDescriptors);
  return { propertyRegistrations, propertyRegistrationDescriptors, pageDescriptors, pageMarginDescriptors, count: propertyRegistrations.length + propertyRegistrationDescriptors.length + pageDescriptors.length + pageMarginDescriptors.length };
}

function propertyRegistrationRecords(record, registration) {
  if (!registration?.name) return [];
  return [compactRecord({
    kind: 'property-registration',
    name: registration.name,
    syntax: registration.syntax,
    inherits: registration.inherits,
    initialValue: registration.initialValue,
    descriptorHash: registration.descriptorHash,
    descriptorCount: registration.descriptors?.length ?? 0,
    atRuleHash: record.atRuleHash,
    sourceSpan: record.sourceSpan,
    sourceHash: record.sourceHash
  })];
}

function propertyRegistrationDescriptorRecords(record, registration) {
  return (registration?.descriptors ?? []).map((descriptor) => compactRecord({
    kind: 'property-registration-descriptor',
    name: registration.name,
    descriptorName: descriptor.name,
    value: descriptor.value,
    valueHash: descriptor.valueHash,
    descriptorHash: descriptor.descriptorHash,
    atRuleHash: record.atRuleHash,
    sourceSpan: descriptor.sourceSpan ?? record.sourceSpan,
    sourceHash: record.sourceHash
  }));
}

function pageDescriptorRecords(record, descriptors = []) {
  return descriptors.map((descriptor) => compactRecord({
    kind: 'page-descriptor',
    pageSelector: descriptor.pageSelector,
    property: descriptor.name,
    value: descriptor.value,
    valueHash: descriptor.valueHash,
    descriptorHash: descriptor.descriptorHash,
    atRuleHash: record.atRuleHash,
    sourceSpan: descriptor.sourceSpan ?? record.sourceSpan,
    sourceHash: record.sourceHash
  }));
}

function pageMarginDescriptorRecords(record, descriptors = []) {
  return descriptors.map((descriptor) => compactRecord({
    kind: 'page-margin-descriptor',
    pageSelector: descriptor.pageSelector,
    marginBox: descriptor.marginBox,
    property: descriptor.name,
    value: descriptor.value,
    valueHash: descriptor.valueHash,
    descriptorHash: descriptor.descriptorHash,
    atRuleHash: record.atRuleHash,
    sourceSpan: descriptor.sourceSpan ?? record.sourceSpan,
    sourceHash: record.sourceHash
  }));
}

function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }

export { cssRuntimeDescriptorGraph, cssRuntimeDescriptorRecords };

import { cssRuntimeDescriptorGraph } from './runtime-descriptor-evidence.js';

function createCssDependencyGraphEvidence(records = [], options = {}) {
  const hash = options.hashSemanticValue;
  const definitions = [];
  const references = [];
  const animations = [];
  const keyframes = [];
  const fontFaces = [];
  const fonts = [];
  const assets = [];
  const descriptors = cssRuntimeDescriptorGraph(records);
  for (const record of records) {
    if (record.kind === 'at-rule' && record.atRuleName === 'keyframes') keyframes.push(keyframeDefinition(record));
    if (record.kind === 'at-rule' && record.atRuleName === 'font-face') {
      for (const family of record.dependencyTokens?.fontFamilies ?? []) fontFaces.push(fontFaceDefinition(record, family));
      for (const url of record.dependencyTokens?.urls ?? []) assets.push(assetReference(record, undefined, url, 'font-face-src'));
    }
    for (const declaration of record.declarations ?? []) {
      if (declaration.property?.startsWith('--')) definitions.push(customPropertyDefinition(record, declaration));
      for (const item of cssVarReferences(declaration.value)) references.push(customPropertyReference(record, declaration, item));
      if (declaration.property === 'animation' || declaration.property === 'animation-name') {
        for (const name of animationNames(declaration.value)) animations.push(animationReference(record, declaration, name));
      }
      if (declaration.property === 'font' || declaration.property === 'font-family') {
        for (const family of fontFamilyNames(declaration.value)) fonts.push(fontReference(record, declaration, family));
      }
      for (const url of cssUrlReferences(declaration.value)) assets.push(assetReference(record, declaration, url, 'declaration-url'));
    }
  }
  const keyframeNames = new Set(keyframes.map((entry) => entry.name));
  const fontNames = new Set(fontFaces.map((entry) => entry.family));
  const linkedAnimations = animations.map((entry) => ({ ...entry, targetDefined: keyframeNames.has(entry.name) }));
  const linkedFonts = fonts.map((entry) => ({ ...entry, targetDefined: fontNames.has(entry.family) }));
  const dependencySurfaceCount = definitions.length + references.length + linkedAnimations.length + keyframes.length + fontFaces.length + linkedFonts.length + assets.length + descriptors.count;
  const graphHash = dependencySurfaceCount ? hash?.({
    kind: 'frontier.lang.css.dependencyGraph.v1',
    definitions,
    references,
    animations: linkedAnimations,
    keyframes,
    fontFaces,
    fonts: linkedFonts,
    assets,
    propertyRegistrations: descriptors.propertyRegistrations,
    propertyRegistrationDescriptors: descriptors.propertyRegistrationDescriptors,
    pageDescriptors: descriptors.pageDescriptors,
    pageMarginDescriptors: descriptors.pageMarginDescriptors
  }) : undefined;
  return compactRecord({
    kind: 'frontier.lang.cssDependencyGraphEvidence',
    version: 1,
    sourcePath: options.sourcePath,
    sourceHash: options.sourceHash,
    hasDependencySurface: dependencySurfaceCount > 0,
    dependencySurfaceCount,
    dependencyGraphHashPresent: Boolean(graphHash),
    cssDependencyGraphHashPresent: Boolean(graphHash),
    dependencyGraphHash: graphHash,
    cssDependencyGraphHash: graphHash,
    customPropertyDefinitions: definitions.length,
    customPropertyReferences: references.length,
    varReferences: references.length,
    varFallbackReferences: references.filter((entry) => entry.hasFallback).length,
    keyframeDefinitions: keyframes.length,
    animationNameLinks: linkedAnimations.length,
    keyframeLinks: linkedAnimations.filter((entry) => entry.targetDefined).length,
    fontFaceDefinitions: fontFaces.length,
    fontFaceLinks: linkedFonts.length,
    urlAssetReferences: assets.length,
    propertyRegistrations: descriptors.propertyRegistrations.length,
    propertyRegistrationDescriptors: descriptors.propertyRegistrationDescriptors.length,
    pageDescriptors: descriptors.pageDescriptors.length,
    pageMarginDescriptors: descriptors.pageMarginDescriptors.length,
    records: { customPropertyDefinitions: definitions, customPropertyReferences: references, keyframes, animationNameLinks: linkedAnimations, fontFaces, fontFaceLinks: linkedFonts, urlAssetReferences: assets, propertyRegistrations: descriptors.propertyRegistrations, propertyRegistrationDescriptors: descriptors.propertyRegistrationDescriptors, pageDescriptors: descriptors.pageDescriptors, pageMarginDescriptors: descriptors.pageMarginDescriptors },
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false
  });
}

function mergeCssDependencyGraphEvidence(sheets, changed = {}) {
  const sides = Object.fromEntries(Object.entries(sheets).map(([side, sheet]) => [side, sheet.dependencyGraphEvidence ?? emptyGraphEvidence(sheet)]));
  const sideValues = Object.values(sides);
  const hasDependencySurface = sideValues.some((side) => side.hasDependencySurface === true);
  const changedDependencySurfaces = changedDependencyGraphSurfaces(sides, changed);
  return {
    kind: 'frontier.lang.cssSafeMergeDependencyGraphEvidence',
    version: 1,
    hasDependencySurface,
    dependencySurfaceCount: Math.max(0, ...sideValues.map((side) => side.dependencySurfaceCount ?? 0)),
    dependencyGraphHashPresent: hasDependencySurface && sideValues.every((side) => side.hasDependencySurface !== true || side.dependencyGraphHashPresent === true),
    cssDependencyGraphHashPresent: hasDependencySurface && sideValues.every((side) => side.hasDependencySurface !== true || side.cssDependencyGraphHashPresent === true),
    propertyRegistrations: maxSideNumber(sideValues, 'propertyRegistrations'), propertyRegistrationDescriptors: maxSideNumber(sideValues, 'propertyRegistrationDescriptors'), pageDescriptors: maxSideNumber(sideValues, 'pageDescriptors'), pageMarginDescriptors: maxSideNumber(sideValues, 'pageMarginDescriptors'),
    changedDependencySurfaceCount: changedDependencySurfaces.length,
    changedDependencySurfaces,
    sides,
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false
  };
}

function admitCssDependencyGraphProofs({ id, sourcePath, input, dependencyGraphEvidence, binding, hash }) {
  const proofs = dependencyGraphProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [];
  for (const change of dependencyGraphEvidence.changedDependencySurfaces ?? []) {
    const proof = proofs.find((candidate) => isDependencyGraphProofForChange(candidate, change, sourcePath, dependencyGraphEvidence, binding, hash));
    if (proof) admitted.push(dependencyGraphProofRecord(proof, change, sourcePath, dependencyGraphEvidence, binding, hash));
    else conflicts.push(conflict(id, sourcePath, 'css-dependency-graph-proof-blocked', change.reasonCode, change));
  }
  return { proofs: admitted, conflicts };
}

function changedDependencyGraphSurfaces(sides, changed) {
  return Object.entries(changed).flatMap(([side, changes]) => (changes ?? []).flatMap((change) => {
    const cascadeKey = change.after?.key ?? change.before?.key;
    if (!cascadeKey) return [];
    const before = dependencyRecordsForKey(sides.base, cascadeKey);
    const after = dependencyRecordsForKey(sides[side], cascadeKey);
    if (!before.length && !after.length) return [];
    return [{
      side,
      cascadeKey,
      reasonCode: 'css-dependency-graph-proof-unproved',
      changeKind: change.kind,
      before: dependencyRecordSummary(before),
      after: dependencyRecordSummary(after)
    }];
  }));
}

function dependencySurfaceRecords(evidence) {
  const records = evidence.records ?? {};
  return [
    ...(records.customPropertyDefinitions ?? []),
    ...(records.customPropertyReferences ?? []),
    ...(records.animationNameLinks ?? []),
    ...(records.fontFaceLinks ?? []),
    ...(records.urlAssetReferences ?? [])
  ];
}

function dependencyRecordsForKey(evidence, cascadeKey) {
  return dependencySurfaceRecords(evidence).filter((entry) => entry.cascadeKey === cascadeKey);
}

function dependencyRecordSummary(records) {
  return {
    dependencyKinds: unique(records.map((entry) => entry.kind)),
    names: unique(records.map((entry) => entry.name ?? entry.family ?? entry.url)),
    properties: unique(records.map((entry) => entry.property)),
    declarationHashes: unique(records.map((entry) => entry.declarationHash))
  };
}

function dependencyGraphProofCandidates(input = {}, sourcePath) {
  return [
    input.cssDependencyGraphProof,
    input.cssDependencyGraphProofs,
    input.cssDependencyGraphProofsByPath?.[sourcePath],
    input.cssSourceBoundDependencyGraphProof,
    input.cssSourceBoundDependencyGraphProofs,
    input.cssSourceBoundDependencyGraphProofsByPath?.[sourcePath],
    input.dependencyGraphProof,
    input.dependencyGraphProofs,
    input.dependencyGraphProofsByPath?.[sourcePath],
    input.sourceBoundDependencyGraphProof,
    input.sourceBoundDependencyGraphProofs,
    input.sourceBoundDependencyGraphProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isDependencyGraphProofForChange(proof, change, sourcePath, evidence, binding, hash) {
  return Boolean(proof && typeof proof === 'object') &&
    DependencyGraphProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.reasonCode, proof.reasonCodes, change.reasonCode) &&
    proofCoversValue(proof.side, proof.sides, change.side) &&
    proofCoversValue(proof.cascadeKey ?? proof.dependencyKey, proof.cascadeKeys ?? proof.dependencyKeys, change.cascadeKey) &&
    proofSourceMatches(proof, 'base', binding.base, hash) &&
    proofSourceMatches(proof, 'worker', binding.worker, hash) &&
    proofSourceMatches(proof, 'head', binding.head, hash) &&
    proofSourceMatches(proof, 'output', binding.output, hash) &&
    dependencyGraphHashMatches(proof, 'base', evidence.sides?.base) &&
    dependencyGraphHashMatches(proof, 'worker', evidence.sides?.worker) &&
    dependencyGraphHashMatches(proof, 'head', evidence.sides?.head);
}

function dependencyGraphHashMatches(proof, role, sideEvidence) {
  const graphHash = sideEvidence?.dependencyGraphHash;
  if (!graphHash) return true;
  return proof[`${role}DependencyGraphHash`] === graphHash ||
    proof[`${role}CssDependencyGraphHash`] === graphHash ||
    proof.dependencyGraphHashes?.[role] === graphHash ||
    proof.cssDependencyGraphHashes?.[role] === graphHash;
}

function proofSourceMatches(proof, role, sourceText, hash) {
  if (typeof sourceText !== 'string') return false;
  const sourceHash = hash?.(sourceText);
  const textFields = role === 'output' ? ['outputSourceText', 'mergedSourceText'] : [`${role}SourceText`];
  const hashFields = role === 'output' ? ['outputSourceHash', 'mergedSourceHash'] : [`${role}SourceHash`];
  const aliases = role === 'output' ? ['output', 'merged'] : [role];
  return textFields.some((field) => proof[field] === sourceText) ||
    aliases.some((alias) => proof.sourceTexts?.[alias] === sourceText || proof.sources?.[alias] === sourceText) ||
    hashFields.some((field) => sourceHash !== undefined && proof[field] === sourceHash) ||
    aliases.some((alias) => sourceHash !== undefined && (proof.sourceHashes?.[alias] === sourceHash || proof.hashes?.[alias] === sourceHash));
}

function dependencyGraphProofRecord(proof, change, sourcePath, evidence, binding, hash) {
  return {
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'css-dependency-graph-source-bound',
    reasonCode: change.reasonCode,
    side: change.side,
    cascadeKey: change.cascadeKey,
    sourcePath,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output),
    baseDependencyGraphHash: evidence.sides?.base?.dependencyGraphHash,
    workerDependencyGraphHash: evidence.sides?.worker?.dependencyGraphHash,
    headDependencyGraphHash: evidence.sides?.head?.dependencyGraphHash
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${details.cascadeKey ?? sourcePath ?? 'source'}`, ...details } };
}

function customPropertyDefinition(record, declaration) {
  return baseDependencyRecord(record, declaration, { kind: 'custom-property-definition', name: declaration.property, valueHash: declaration.valueHash });
}

function customPropertyReference(record, declaration, item) {
  return baseDependencyRecord(record, declaration, { kind: 'custom-property-reference', name: item.name, fallbackHash: item.fallbackHash, hasFallback: item.hasFallback });
}

function animationReference(record, declaration, name) {
  return baseDependencyRecord(record, declaration, { kind: 'animation-name-link', name });
}

function fontReference(record, declaration, family) {
  return baseDependencyRecord(record, declaration, { kind: 'font-face-link', family });
}

function assetReference(record, declaration, url, sourceKind) {
  return baseDependencyRecord(record, declaration, { kind: 'url-asset-reference', url, sourceKind });
}

function keyframeDefinition(record) {
  return { kind: 'keyframes-definition', name: firstCssIdent(record.conditionText), atRuleHash: record.atRuleHash, sourceSpan: record.sourceSpan, sourceHash: record.sourceHash };
}

function fontFaceDefinition(record, family) {
  return { kind: 'font-face-definition', family, atRuleHash: record.atRuleHash, sourceSpan: record.sourceSpan, sourceHash: record.sourceHash };
}

function baseDependencyRecord(record, declaration, extra) {
  return compactRecord({
    ...extra,
    cascadeKey: declaration?.cascadeKey,
    property: declaration?.property,
    declarationHash: declaration?.declarationHash,
    ruleHash: record.ruleHash,
    selectors: record.selectors,
    scopes: record.scopes ?? [],
    sourceSpan: declaration?.sourceSpan ?? record.sourceSpan,
    sourceHash: record.sourceHash
  });
}

function cssVarReferences(value) {
  return [...String(value ?? '').matchAll(/\bvar\(\s*(--[-_A-Za-z][\w-]*)(?:\s*,\s*([^)]*))?\)/g)].map((match) => ({
    name: match[1],
    hasFallback: match[2] !== undefined,
    fallbackHash: match[2] === undefined ? undefined : stableTextHash(match[2].trim())
  }));
}

function cssUrlReferences(value) {
  return [...String(value ?? '').matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g)]
    .map((match) => (match[1] ?? match[2] ?? match[3] ?? '').trim())
    .filter(Boolean);
}

function animationNames(value) {
  const normalized = String(value ?? '').replace(/\bvar\(\s*--[-_A-Za-z][\w-]*(?:\s*,\s*([^)]*))?\)/g, (_, fallback) => fallback ?? '');
  return unique(normalized.split(/[\s,]+/).map((part) => part.trim().replace(/[()]+$/g, '')).filter((part) => part && !AnimationKeywords.has(part) && !/^[\d.]+m?s$/.test(part)));
}

function fontFamilyNames(value) {
  return unique(String(value ?? '').split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).filter((part) => part && !FontKeywords.has(part) && !/^[\d.]+/.test(part)));
}

function firstCssIdent(value) { return /^[-_A-Za-z][\w-]*/.exec(String(value ?? '').trim())?.[0]; }

function emptyGraphEvidence(sheet) {
  return { kind: 'frontier.lang.cssDependencyGraphEvidence', version: 1, sourceHash: sheet.sourceHash, hasDependencySurface: false, dependencySurfaceCount: 0, dependencyGraphHashPresent: false, cssDependencyGraphHashPresent: false, semanticEquivalenceClaim: false };
}

function stableTextHash(text) { let hash = 2166136261; for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); } return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`; }

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }
function maxSideNumber(sides, field) { return Math.max(0, ...sides.map((side) => side?.[field] ?? 0)); }
function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }

const AnimationKeywords = new Set(['none', 'initial', 'inherit', 'unset', 'revert', 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'infinite', 'alternate', 'forwards', 'backwards', 'both', 'normal', 'reverse', 'running', 'paused']);
const FontKeywords = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'initial', 'unset', 'revert']);
const DependencyGraphProofKinds = new Set(['css-dependency-graph-proof', 'css-source-bound-dependency-graph-proof']);

export { admitCssDependencyGraphProofs, createCssDependencyGraphEvidence, mergeCssDependencyGraphEvidence };

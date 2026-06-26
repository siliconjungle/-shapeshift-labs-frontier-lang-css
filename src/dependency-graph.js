function createCssDependencyGraphEvidence(records = [], options = {}) {
  const hash = options.hashSemanticValue;
  const definitions = [];
  const references = [];
  const animations = [];
  const keyframes = [];
  const fontFaces = [];
  const fonts = [];
  const assets = [];
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
  const dependencySurfaceCount = definitions.length + references.length + linkedAnimations.length + keyframes.length + fontFaces.length + linkedFonts.length + assets.length;
  const graphHash = dependencySurfaceCount ? hash?.({
    kind: 'frontier.lang.css.dependencyGraph.v1',
    definitions,
    references,
    animations: linkedAnimations,
    keyframes,
    fontFaces,
    fonts: linkedFonts,
    assets
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
    records: { customPropertyDefinitions: definitions, customPropertyReferences: references, keyframes, animationNameLinks: linkedAnimations, fontFaces, fontFaceLinks: linkedFonts, urlAssetReferences: assets },
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false
  });
}

function mergeCssDependencyGraphEvidence(sheets, changed = {}) {
  const sides = Object.fromEntries(Object.entries(sheets).map(([side, sheet]) => [side, sheet.dependencyGraphEvidence ?? emptyGraphEvidence(sheet)]));
  const sideValues = Object.values(sides);
  const hasDependencySurface = sideValues.some((side) => side.hasDependencySurface === true);
  const changedKeys = new Set([...(changed.worker ?? []), ...(changed.head ?? [])].flatMap((change) => [change.before?.key, change.after?.key].filter(Boolean)));
  const dependencyKeys = new Set(sideValues.flatMap(dependencySurfaceKeys));
  return {
    kind: 'frontier.lang.cssSafeMergeDependencyGraphEvidence',
    version: 1,
    hasDependencySurface,
    dependencySurfaceCount: Math.max(0, ...sideValues.map((side) => side.dependencySurfaceCount ?? 0)),
    dependencyGraphHashPresent: hasDependencySurface && sideValues.every((side) => side.hasDependencySurface !== true || side.dependencyGraphHashPresent === true),
    cssDependencyGraphHashPresent: hasDependencySurface && sideValues.every((side) => side.hasDependencySurface !== true || side.cssDependencyGraphHashPresent === true),
    changedDependencySurfaceCount: [...changedKeys].filter((key) => dependencyKeys.has(key)).length,
    sides,
    browserCascadeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false
  };
}

function dependencySurfaceKeys(evidence) {
  const records = evidence.records ?? {};
  return [
    ...(records.customPropertyDefinitions ?? []),
    ...(records.customPropertyReferences ?? []),
    ...(records.animationNameLinks ?? []),
    ...(records.fontFaceLinks ?? []),
    ...(records.urlAssetReferences ?? [])
  ].map((entry) => entry.cascadeKey).filter(Boolean);
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

function firstCssIdent(value) {
  return /^[-_A-Za-z][\w-]*/.exec(String(value ?? '').trim())?.[0];
}

function emptyGraphEvidence(sheet) {
  return { kind: 'frontier.lang.cssDependencyGraphEvidence', version: 1, sourceHash: sheet.sourceHash, hasDependencySurface: false, dependencySurfaceCount: 0, dependencyGraphHashPresent: false, cssDependencyGraphHashPresent: false, semanticEquivalenceClaim: false };
}

function stableTextHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }

const AnimationKeywords = new Set(['none', 'initial', 'inherit', 'unset', 'revert', 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'infinite', 'alternate', 'forwards', 'backwards', 'both', 'normal', 'reverse', 'running', 'paused']);
const FontKeywords = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'initial', 'unset', 'revert']);

export { createCssDependencyGraphEvidence, mergeCssDependencyGraphEvidence };

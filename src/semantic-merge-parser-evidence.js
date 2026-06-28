function mergeParserEvidence(sheets) {
  const entries = Object.entries(sheets).map(([side, sheet]) => [side, sheetParserEvidence(sheet)]);
  return {
    kind: 'frontier.lang.cssSafeMergeParserEvidence',
    version: 1,
    parserNames: unique(entries.map(([, evidence]) => evidence.parserName)),
    sourceCodeLocationInfo: entries.every(([, evidence]) => evidence.sourceCodeLocationInfo === true),
    parserBackedSourceSpans: entries.every(([, evidence]) => evidence.parserBackedSourceSpans === true),
    parserBackedDeclarationSpans: entries.every(([, evidence]) => evidence.parserBackedDeclarationSpans === true),
    parserBackedTriviaHashes: entries.every(([, evidence]) => evidence.parserBackedTriviaHashes === true),
    sourceHashPresent: entries.every(([, evidence]) => typeof evidence.sourceHash === 'string'),
    sourceHashes: sideMap(entries, 'sourceHash'),
    sourceTextHashes: sideMap(entries, 'sourceTextHash'),
    scopedCascadeGraphHashPresent: entries.every(([, evidence]) => evidence.scopedCascadeGraphHashPresent === true),
    scopedCascadeGraphShapeHashPresent: entries.every(([, evidence]) => evidence.scopedCascadeGraphShapeHashPresent === true),
    parseErrors: sumEvidence(entries, 'parseErrors'),
    sourceSpanRecordCount: sumEvidence(entries, 'sourceSpanRecordCount'),
    sourceSpanMissingRecordCount: sumEvidence(entries, 'sourceSpanMissingRecordCount'),
    declarationSpanCount: sumEvidence(entries, 'declarationSpanCount'),
    declarationSpanMissingCount: sumEvidence(entries, 'declarationSpanMissingCount'),
    triviaHashRecordCount: sumEvidence(entries, 'triviaHashRecordCount'),
    triviaHashMissingRecordCount: sumEvidence(entries, 'triviaHashMissingRecordCount'),
    sides: Object.fromEntries(entries)
  };
}

function sheetParserEvidence(sheet) {
  const records = sheet.records ?? [];
  const declarations = records.flatMap((record) => record.declarations ?? []);
  const sourceSpanRecordCount = records.filter(hasParserBackedSourceSpan).length;
  const declarationSpanCount = declarations.filter(hasParserBackedDeclarationSpan).length;
  const triviaHashRecordCount = records.filter(hasParserBackedTriviaHash).length;
  return {
    parserName: sheet.parser?.name ?? 'unknown',
    ...sourceHashAliases(sheet.sourceHash),
    sourceCodeLocationInfo: sheet.parser?.sourceCodeLocationInfo === true,
    parserBackedSourceSpans: records.length > 0 && sourceSpanRecordCount === records.length,
    parserBackedDeclarationSpans: declarations.length > 0 && declarationSpanCount === declarations.length,
    parserBackedTriviaHashes: records.length > 0 && triviaHashRecordCount === records.length,
    scopedCascadeGraphHashPresent: records.every((record) => !(record.scopes?.length) || Boolean(record.scopedCascadeGraphHash)),
    scopedCascadeGraphShapeHashPresent: records.every((record) => !(record.scopes?.length) || Boolean(record.scopedCascadeGraphHash && record.scopedCascadeGraphShapeKey)),
    scopedCascadeGraphShapeKeys: unique(records.filter((record) => record.scopes?.length).map((record) => record.scopedCascadeGraphShapeKey)).length,
    parseErrors: sheet.parser?.parseErrors?.length ?? 0,
    recordCount: records.length,
    declarationCount: declarations.length,
    sourceSpanRecordCount,
    sourceSpanMissingRecordCount: records.length - sourceSpanRecordCount,
    declarationSpanCount,
    declarationSpanMissingCount: declarations.length - declarationSpanCount,
    triviaHashRecordCount,
    triviaHashMissingRecordCount: records.length - triviaHashRecordCount
  };
}

function sideMap(entries, key) { return Object.fromEntries(entries.map(([side, evidence]) => [side, evidence[key]]).filter(([, value]) => typeof value === 'string')); }
function sourceHashAliases(sourceHash) { return { sourceHash, sourceTextHash: sourceHash, evidenceSourceHash: sourceHash, sideSourceHash: sourceHash }; }
function hasParserBackedSourceSpan(record) { return record.parser === 'postcss' && record.sourceSpan?.startOffset !== undefined && record.sourceSpan?.endOffset !== undefined; }
function hasParserBackedDeclarationSpan(declaration) { return declaration.sourceSpan?.startOffset !== undefined && declaration.sourceSpan?.endOffset !== undefined; }
function hasParserBackedTriviaHash(record) { return record.parser === 'postcss' && typeof record.rawTextHash === 'string' && record.rawTextHash.length > 0; }
function sumEvidence(entries, key) { return entries.reduce((sum, [, evidence]) => sum + (evidence[key] ?? 0), 0); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export { mergeParserEvidence };

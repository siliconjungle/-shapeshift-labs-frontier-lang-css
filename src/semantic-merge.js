import { cssModuleContractChanges, sheetOptions, unsupportedSourceShapeChanges } from './semantic-merge-css-modules.js';
import { admitCssModuleContractProofs } from './semantic-merge-css-module-proofs.js';
import { admitCascadeRuntimeProofs } from './semantic-merge-cascade-runtime.js';
import { admitCssDependencyGraphProofs, mergeCssDependencyGraphEvidence } from './dependency-graph.js';
import { mergeSelectorTargetEvidence, planSelectorTargetRebase } from './semantic-merge-selector-targets.js';
import { applyAtRuleBlockChanges, atRuleBlockEntry, atRuleBlockOverlapConflicts, atRuleOccurrenceKey, changedAtRuleBlocks, renderAtRuleBlock, renderAtRuleStatement } from './semantic-merge-at-rules.js';
import { declarationsOverlapByCssProperty, deterministicShorthandExpansion, shorthandGroupForProperty } from './semantic-merge-shorthand.js';
import { mergeShorthandExpansionEvidence } from './semantic-merge-shorthand-evidence.js';
import { duplicateCascadeKeyConflictsForIndexes } from './semantic-merge-duplicate-cascade.js';
import { blockedMergeCandidate } from './semantic-merge-blocked-candidate.js';

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
  const sheets = {
    base: parseSheet(base, sheetOptions(input, 'base', sourcePath)),
    worker: parseSheet(worker, sheetOptions(input, 'worker', sourcePath)),
    head: parseSheet(head, sheetOptions(input, 'head', sourcePath))
  };
  const indexes = Object.fromEntries(Object.entries(sheets).map(([name, sheet]) => [name, declarationIndex(sheet, hash)]));
  const changed = {
    worker: changedDeclarations(indexes.base, indexes.worker, 'worker'),
    head: changedDeclarations(indexes.base, indexes.head, 'head')
  };
  const blockChanges = {
    worker: changedAtRuleBlocks(indexes.base, indexes.worker, 'worker'),
    head: changedAtRuleBlocks(indexes.base, indexes.head, 'head')
  };
  const moduleChanges = cssModuleContractChanges(sheets, hash);
  const proofConflicts = proofGapConflicts(id, sourcePath, changed, indexes);
  const parserConflicts = parserErrorConflicts(id, sourcePath, sheets);
  const duplicateCascadeKeyConflicts = duplicateCascadeKeyConflictsForIndexes(id, sourcePath, indexes);
  const overlapConflicts = [
    ...overlapDeclarationConflicts(id, sourcePath, changed.worker, changed.head),
    ...shorthandOverlapConflicts(id, sourcePath, changed.worker, changed.head),
    ...atRuleBlockOverlapConflicts(id, sourcePath, blockChanges.worker, blockChanges.head, conflict)
  ];
  const parserEvidence = mergeParserEvidence(sheets);
  const shorthandExpansionEvidence = mergeShorthandExpansionEvidence(indexes, changed);
  const dependencyGraphEvidence = mergeCssDependencyGraphEvidence(sheets, changed);
  const selectorTargetPlan = planSelectorTargetRebase(id, sourcePath, mergeSelectorTargetEvidence(sheets, changed), changed, { ...input, sourceBinding: { base, worker, head }, hashSemanticValue: hash });
  const shapeChanges = unsupportedSourceShapeChanges(sheets, changed, hash);
  const mergedIndex = applyAtRuleBlockChanges(applyAtRuleBlockChanges(applyDeclarationChanges(applyDeclarationChanges(indexes.base, selectorTargetPlan.changed.head), selectorTargetPlan.changed.worker), blockChanges.head), blockChanges.worker);
  const mergedSourceText = renderDeclarationIndex(mergedIndex);
  const cascadeRuntimeAdmission = admitCascadeRuntimeProofs({
    id,
    sourcePath,
    input,
    sourceShapeChanges: shapeChanges,
    binding: { base, worker, head, output: mergedSourceText },
    hash
  });
  const dependencyGraphAdmission = admitCssDependencyGraphProofs({ id, sourcePath, input, dependencyGraphEvidence, binding: { base, worker, head, output: mergedSourceText }, hash });
  const cssModuleAdmission = admitCssModuleContractProofs({ id, sourcePath, input, moduleChanges, binding: { base, worker, head, output: mergedSourceText }, hash });
  const conflicts = [...parserConflicts, ...duplicateCascadeKeyConflicts, ...proofConflicts, ...overlapConflicts, ...cssModuleAdmission.conflicts, ...cascadeRuntimeAdmission.conflicts, ...dependencyGraphAdmission.conflicts, ...selectorTargetPlan.conflicts];
  if (conflicts.length) return blocked(id, sourcePath, 'css-semantic-merge-conflict', conflicts, { parserEvidence, shorthandExpansionEvidence, dependencyGraphEvidence, selectorTargetEvidence: selectorTargetPlan.evidence, cssModuleContractProofs: cssModuleAdmission.proofs, cascadeRuntimeProofs: cascadeRuntimeAdmission.proofs, dependencyGraphProofs: dependencyGraphAdmission.proofs, ...blockedMergeCandidate(input, mergedSourceText, hash) });
  return merged(id, sourcePath, mergedSourceText, 'semantic-declaration-merge', hash, {
    baseSheetHash: sheets.base.sheetHash,
    workerSheetHash: sheets.worker.sheetHash,
    headSheetHash: sheets.head.sheetHash,
    workerChangedDeclarations: changed.worker.length,
    headChangedDeclarations: changed.head.length,
    workerChangedCssModuleContracts: moduleChanges.worker.length,
    headChangedCssModuleContracts: moduleChanges.head.length,
    parserEvidence,
    shorthandExpansionEvidence,
    dependencyGraphEvidence,
    selectorTargetEvidence: selectorTargetPlan.evidence,
    cssModuleContractProofs: cssModuleAdmission.proofs,
    cascadeRuntimeProofs: cascadeRuntimeAdmission.proofs,
    dependencyGraphProofs: dependencyGraphAdmission.proofs,
    browserCascadeEquivalenceClaim: cascadeRuntimeAdmission.proofs.length > 0
  });
}

function declarationIndex(sheet, hash) {
  const declarations = new Map();
  const order = [];
  const statements = [];
  const atRuleBlocks = new Map();
  const atRuleBlockOrder = [];
  const atRuleOccurrences = new Map();
  const declarationOccurrences = new Map();
  for (const record of sheet.records) {
    const block = atRuleBlockEntry(record, atRuleOccurrenceKey(record, atRuleOccurrences));
    if (block) {
      atRuleBlocks.set(block.key, block);
      atRuleBlockOrder.push(block.key);
    }
    if (record.kind === 'at-rule-statement') statements.push({ key: record.atRuleHash, scopes: record.scopes ?? [], statementText: record.statementText, atRuleName: record.atRuleName, conditionText: record.conditionText });
    if (record.kind !== 'rule') continue;
    const ruleKey = ruleIdentityKey(record);
    for (const declaration of record.declarations ?? []) {
      const entry = {
        key: declaration.cascadeKey,
        ruleKey,
        selectors: record.selectors,
        scopes: record.scopes ?? [], specificity: record.specificity,
        property: declaration.property,
        value: declaration.value,
        important: declaration.important,
        declarationOrdinal: declaration.ordinal,
        declarationHash: declaration.declarationHash,
        shorthandExpansion: deterministicShorthandExpansion(declaration.property, declaration.value, hash),
        selectorTargetGraphHash: record.selectorTargetGraphHash,
        proofGaps: proofGapsForDeclaration(record, declaration)
      };
      declarationOccurrences.set(entry.key, [...(declarationOccurrences.get(entry.key) ?? []), entry]);
      declarations.set(entry.key, entry);
      order.push(entry.key);
    }
  }
  const duplicateCascadeKeyGroups = [...declarationOccurrences.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([cascadeKey, entries]) => ({ cascadeKey, count: entries.length, entries }));
  return { declarations, order: unique(order), statements, atRuleBlocks, atRuleBlockOrder: unique(atRuleBlockOrder), duplicateCascadeKeyGroups };
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
    return (entry?.proofGaps ?? [])
      .filter((gap) => !canAdmitProofGap(gap, entry, changed, indexes))
      .map((gap) => conflict(id, sourcePath, 'css-proof-gap-blocked', gap.code, {
      cascadeKey: key,
      property: entry.property,
      shorthandExpansion: entry.shorthandExpansion,
      proofGap: gap
    }));
  });
}

function parserErrorConflicts(id, sourcePath, sheets) {
  return Object.entries(sheets).flatMap(([side, sheet]) => (sheet.proofGaps ?? [])
    .filter((gap) => gap.code === 'css-parser-error')
    .map((gap) => conflict(id, sourcePath, 'css-parser-error-blocked', gap.code, { side, proofGap: gap })));
}

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
    scopedCascadeGraphHashPresent: entries.every(([, evidence]) => evidence.scopedCascadeGraphHashPresent === true),
    parseErrors: entries.reduce((sum, [, evidence]) => sum + evidence.parseErrors, 0),
    sides: Object.fromEntries(entries)
  };
}

function sheetParserEvidence(sheet) {
  const records = sheet.records ?? [];
  const declarations = records.flatMap((record) => record.declarations ?? []);
  return {
    parserName: sheet.parser?.name ?? 'unknown',
    sourceCodeLocationInfo: sheet.parser?.sourceCodeLocationInfo === true,
    parserBackedSourceSpans: records.some((record) => record.parser === 'postcss' && record.sourceSpan?.startOffset !== undefined),
    parserBackedDeclarationSpans: declarations.some((declaration) => declaration.sourceSpan?.startOffset !== undefined),
    parserBackedTriviaHashes: records.some((record) => record.parser === 'postcss' && typeof record.rawTextHash === 'string'),
    scopedCascadeGraphHashPresent: records.every((record) => !(record.scopes?.length) || Boolean(record.scopedCascadeGraphHash)),
    parseErrors: sheet.parser?.parseErrors?.length ?? 0,
    recordCount: records.length,
    declarationCount: declarations.length
  };
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

function shorthandOverlapConflicts(id, sourcePath, workerChanges, headChanges) {
  return workerChanges.flatMap((workerChange) => headChanges
    .filter((headChange) => workerChange.key !== headChange.key && declarationsOverlapByShorthandGroup(workerChange.after ?? workerChange.before, headChange.after ?? headChange.before))
    .map((headChange) => conflict(id, sourcePath, 'css-shorthand-longhand-conflict', 'css-shorthand-longhand-conflict', {
      worker: changeDetails(workerChange),
      head: changeDetails(headChange)
    })));
}

function canAdmitProofGap(gap, entry, changed, indexes) {
  if (gap.code !== 'css-shorthand-expansion-unproved' || !entry) return false;
  const group = shorthandGroupForProperty(entry.property);
  if (!group || entry.shorthandExpansion?.status !== 'expanded' || hasRelatedExistingDeclaration(entry, indexes)) return false;
  const oppositeChanges = [...changed.worker, ...changed.head].filter((change) => change.key !== entry.key);
  return !oppositeChanges.some((change) => declarationsOverlapByShorthandGroup(entry, change.after ?? change.before));
}

function hasRelatedExistingDeclaration(entry, indexes) {
  return Object.values(indexes).some((index) => [...index.declarations.values()].some((candidate) => candidate.key !== entry.key && declarationsOverlapByShorthandGroup(entry, candidate)));
}

function declarationsOverlapByShorthandGroup(left, right) {
  if (!left || !right || left.ruleKey !== right.ruleKey) return false;
  return declarationsOverlapByCssProperty(left.property, right.property);
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
  return { ...index, declarations, order: order.filter((key) => declarations.has(key)), statements: index.statements ?? [] };
}

function renderDeclarationIndex(index) {
  const groups = new Map();
  for (const key of index.order) {
    const declaration = index.declarations.get(key);
    if (!declaration) continue;
    groups.set(declaration.ruleKey, [...(groups.get(declaration.ruleKey) ?? []), declaration]);
  }
  const chunks = [];
  for (const statement of index.statements ?? []) renderAtRuleStatement(chunks, statement);
  for (const key of index.atRuleBlockOrder ?? []) renderAtRuleBlock(chunks, index.atRuleBlocks.get(key));
  for (const declarations of groups.values()) renderDeclarationGroup(chunks, declarations);
  return `${chunks.join('\n').trimEnd()}\n`;
}

function renderDeclarationGroup(chunks, declarations) {
  const first = declarations[0];
  let indent = 0;
  for (const scope of first.scopes) {
    chunks.push(`${spaces(indent)}${scope} {`);
    indent += 2;
  }
  chunks.push(`${spaces(indent)}${first.selectors.join(', ')} {`);
  for (const declaration of declarations) chunks.push(`${spaces(indent + 2)}${declaration.property}: ${declaration.value};`);
  chunks.push(`${spaces(indent)}}`);
  for (let index = first.scopes.length - 1; index >= 0; index -= 1) {
    indent -= 2;
    chunks.push(`${spaces(indent)}}`);
  }
  chunks.push('');
}

function merged(id, sourcePath, sourceText, operation, hash, extra = {}) {
  return result(id, sourcePath, 'merged', { operation, mergedSourceText: sourceText, mergedSourceHash: hash?.(sourceText), conflicts: [], ...extra });
}

function blocked(id, sourcePath, reasonCode, conflicts = [], extra = {}) {
  return result(id, sourcePath, 'blocked', { operation: 'blocked', conflicts: conflicts.length ? conflicts : [conflict(id, sourcePath, reasonCode, reasonCode)], ...extra });
}

function result(id, sourcePath, status, body) {
  const browserCascadeEquivalenceClaim = status === 'merged' && body.browserCascadeEquivalenceClaim === true;
  return {
    kind: 'frontier.lang.cssSafeMerge',
    version: 1,
    id,
    sourcePath,
    status,
    ...body,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserCascadeEquivalenceClaim,
    browserRenderEquivalenceClaim: false,
    admission: {
      status: status === 'merged' ? 'auto-merge-candidate' : 'blocked',
      action: status === 'merged' ? 'apply-css' : 'human-review',
      reviewRequired: status !== 'merged',
      reasonCodes: unique((body.conflicts ?? []).map((item) => item.details.reasonCode)),
      browserCascadeEquivalenceClaim: browserCascadeEquivalenceClaim || undefined,
      cssCascadeRuntimeProofs: body.cascadeRuntimeProofs?.length ? body.cascadeRuntimeProofs : undefined, cssDependencyGraphProofs: body.dependencyGraphProofs?.length ? body.dependencyGraphProofs : undefined, cssModuleContractProofs: body.cssModuleContractProofs?.length ? body.cssModuleContractProofs : undefined
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
function spaces(count) { return ' '.repeat(Math.max(0, count)); }

export { safeMergeCssSource };

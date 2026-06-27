import { atRuleOccurrenceKey } from './semantic-merge-at-rules.js';

function sheetOptions(input, side, sourcePath) {
  const prefix = side === 'base' ? 'base' : side === 'worker' ? 'worker' : 'head';
  return {
    sourcePath,
    cssModule: input.cssModule,
    cssModules: input.cssModules,
    generatedClassNameMap: input[`${prefix}GeneratedClassNameMap`] ?? input.generatedClassNameMap,
    generatedClassNameMapHash: input[`${prefix}GeneratedClassNameMapHash`] ?? input.generatedClassNameMapHash,
    jsTsUseSiteGraphHash: input[`${prefix}JsTsUseSiteGraphHash`] ?? input.jsTsUseSiteGraphHash,
    cssModuleCompositionGraphHash: input[`${prefix}CssModuleCompositionGraphHash`] ?? input.cssModuleCompositionGraphHash,
    icssGraphHash: input[`${prefix}IcssGraphHash`] ?? input.icssGraphHash,
    scopedCascadeGraphHash: input[`${prefix}ScopedCascadeGraphHash`] ?? input.scopedCascadeGraphHash,
    scopedCascadeGraphHashesByShapeKey: input[`${prefix}ScopedCascadeGraphHashesByShapeKey`] ?? input[`${prefix}CssScopedCascadeGraphHashesByShapeKey`] ?? input.scopedCascadeGraphHashesByShapeKey ?? input.cssScopedCascadeGraphHashesByShapeKey,
    selectorTargetGraphHash: input[`${prefix}SelectorTargetGraphHash`] ?? input.selectorTargetGraphHash
  };
}

function cssModuleContractChanges(sheets, hash) {
  const indexes = {
    base: cssModuleContractIndex(sheets.base, hash),
    worker: cssModuleContractIndex(sheets.worker, hash),
    head: cssModuleContractIndex(sheets.head, hash)
  };
  return {
    worker: changedContracts(indexes.base, indexes.worker, 'worker', sheets.worker),
    head: changedContracts(indexes.base, indexes.head, 'head', sheets.head)
  };
}

function cssModuleContractIndex(sheet, hash) {
  const contracts = new Map();
  const cssModules = sheet.cssModules;
  if (!cssModules) return { contracts, proofGaps: [], moduleHash: undefined };
  for (const entry of cssModules.exports ?? []) {
    const contractHash = hash?.({ kind: 'frontier.lang.css.module.export.contract.v1', name: entry.name, generatedName: entry.generatedName });
    contracts.set(`export:${entry.name}`, {
      ...contractEvidence(cssModules),
      key: `export:${entry.name}`,
      contractKind: 'css-module-export',
      name: entry.name,
      hash: contractHash ?? entry.exportHash,
      requiredProofGapCodes: ['css-module-generated-class-map-unproved', 'css-module-generated-class-map-incomplete', 'css-module-js-ts-use-site-graph-unproved']
    });
  }
  for (const entry of cssModules.compositions ?? []) {
    const key = ['composition', entry.localName, entry.sourceKind, entry.source ?? 'local'].join(':');
    contracts.set(key, {
      ...contractEvidence(cssModules),
      key,
      contractKind: 'css-module-composition',
      name: entry.localName,
      hash: entry.compositionHash,
      requiredProofGapCodes: ['css-module-composition-resolution-unproved']
    });
  }
  for (const entry of cssModules.icssImports ?? []) {
    const key = ['icss-import', entry.source, entry.importedName].join(':');
    contracts.set(key, {
      ...contractEvidence(cssModules),
      key,
      contractKind: 'icss-import',
      name: entry.localName,
      hash: entry.importHash,
      requiredProofGapCodes: ['css-module-icss-graph-unproved']
    });
  }
  for (const entry of cssModules.icssExports ?? []) {
    const key = `icss-export:${entry.name}`;
    contracts.set(key, {
      ...contractEvidence(cssModules),
      key,
      contractKind: 'icss-export',
      name: entry.name,
      hash: entry.exportHash,
      requiredProofGapCodes: ['css-module-icss-graph-unproved']
    });
  }
  return { contracts, proofGaps: cssModules.proofGaps ?? [], moduleHash: cssModules.moduleHash };
}

function contractEvidence(cssModules) {
  return {
    moduleHash: cssModules.moduleHash,
    generatedClassNameMapHash: cssModules.generatedClassNameMapHash,
    jsTsUseSiteGraphHash: cssModules.jsTsUseSiteGraphHash,
    cssModuleCompositionGraphHash: cssModules.cssModuleCompositionGraphHash,
    icssGraphHash: cssModules.icssGraphHash
  };
}

function changedContracts(baseIndex, currentIndex, side, sheet) {
  const keys = unique([...baseIndex.contracts.keys(), ...currentIndex.contracts.keys()]);
  return keys.flatMap((key) => {
    const before = baseIndex.contracts.get(key);
    const after = currentIndex.contracts.get(key);
    if ((before?.hash ?? '') === (after?.hash ?? '')) return [];
    return [{
      side,
      key,
      before,
      after,
      proofGaps: uniqueProofGaps([...(baseIndex.proofGaps ?? []), ...(currentIndex.proofGaps ?? [])]),
      sheetHash: sheet.sheetHash,
      kind: before && after ? 'update' : before ? 'delete' : 'add'
    }];
  });
}

function cssModuleContractConflicts(id, sourcePath, changes) {
  return [
    ...cssModuleContractProofConflicts(id, sourcePath, changes.worker),
    ...cssModuleContractProofConflicts(id, sourcePath, changes.head),
    ...cssModuleOverlapConflicts(id, sourcePath, changes.worker, changes.head)
  ];
}

function cssModuleContractProofConflicts(id, sourcePath, changes) {
  return changes.flatMap((change) => {
    const contract = change.after ?? change.before;
    const requiredCodes = contract?.requiredProofGapCodes ?? [];
    return (change.proofGaps ?? [])
      .filter((gap) => requiredCodes.includes(gap.code))
      .map((gap) => conflict(id, sourcePath, 'css-module-proof-gap-blocked', gap.code, {
        contractKey: change.key,
        contractKind: contract.contractKind,
        side: change.side,
        changeKind: change.kind,
        proofGap: gap
      }));
  });
}

function cssModuleOverlapConflicts(id, sourcePath, workerChanges, headChanges) {
  const headByKey = new Map(headChanges.map((change) => [change.key, change]));
  return workerChanges.flatMap((workerChange) => {
    const headChange = headByKey.get(workerChange.key);
    if (!headChange || sameContractChange(workerChange, headChange)) return [];
    const contract = workerChange.after ?? workerChange.before ?? headChange.after ?? headChange.before;
    return [conflict(id, sourcePath, 'css-module-contract-conflict', 'css-module-contract-conflict', {
      contractKey: workerChange.key,
      contractKind: contract?.contractKind,
      worker: contractChangeDetails(workerChange),
      head: contractChangeDetails(headChange)
    })];
  });
}

function unsupportedSourceShapeConflicts(id, sourcePath, sheets, declarationChanges, hash) {
  return unsupportedSourceShapeChanges(sheets, declarationChanges, hash)
    .map((change) => conflict(id, sourcePath, 'css-source-shape-unsupported', change.reasonCode, change));
}

function unsupportedSourceShapeChanges(sheets, declarationChanges, hash) {
  return [
    ...unsupportedSourceShapeChangesForSide(sheets.base, sheets.worker, declarationChanges.worker, 'worker', hash),
    ...unsupportedSourceShapeChangesForSide(sheets.base, sheets.head, declarationChanges.head, 'head', hash)
  ];
}

function unsupportedSourceShapeChangesForSide(baseSheet, currentSheet, declarationChanges, side, hash) {
  const baseShape = sourceShapeIndex(baseSheet, hash);
  const currentShape = sourceShapeIndex(currentSheet, hash);
  const keys = unique([...baseShape.keys(), ...currentShape.keys()]);
  const changedDeclarationRuleKeys = new Set(declarationChanges.map((change) => (change.after ?? change.before)?.ruleKey));
  return keys.flatMap((key) => {
    const before = baseShape.get(key);
    const after = currentShape.get(key);
    if ((before?.hash ?? '') === (after?.hash ?? '')) return [];
    if (before?.representedByDeclarations || after?.representedByDeclarations) return [];
    if (changedDeclarationRuleKeys.has(before?.ruleKey) || changedDeclarationRuleKeys.has(after?.ruleKey)) return [];
    return [{
      side,
      reasonCode: sourceShapeChangeReason(before, after),
      shapeKey: key,
      before: sourceShapeDetails(before),
      after: sourceShapeDetails(after)
    }];
  });
}

function sourceShapeIndex(sheet, hash) {
  const result = new Map();
  const atRuleOccurrences = new Map();
  for (const record of sheet.records ?? []) {
    if (record.kind === 'rule') {
      const ruleKey = ruleIdentityKey(record);
      const declarations = record.declarations ?? [];
      const exportName = sheet.cssModules?.exports?.find((entry) => (entry.ruleHashes ?? []).includes(record.ruleHash))?.name;
      result.set(`rule:${ruleKey}`, {
        kind: 'rule',
        ruleKey,
        selectors: record.selectors,
        representedByDeclarations: declarations.length > 0,
        contractKey: exportName ? `export:${exportName}` : undefined,
        hash: hash?.({ kind: 'frontier.lang.css.sourceShape.rule.v1', ruleKey, declarations: declarations.length, exportName, ruleHash: record.ruleHash })
      });
    }
    if (record.kind === 'at-rule') {
      const shapeKey = atRuleOccurrenceKey(record, atRuleOccurrences);
      const opaqueHash = isOpaqueAtRuleBlock(record) ? record.rawTextHash : undefined;
      result.set(shapeKey, {
        kind: 'at-rule',
        atRuleName: record.atRuleName,
        conditionText: record.conditionText,
        rawTextHash: opaqueHash,
        representedByDeclarations: false,
        unsupportedReasonCode: atRuleUnsupportedReasonCode(record),
        hash: opaqueHash ?? record.atRuleHash
      });
    }
    if (record.kind === 'at-rule-statement') {
      const shapeKey = `at-rule-statement:${[...(record.scopes ?? []), record.atRuleName, record.conditionText].join('::')}`;
      result.set(shapeKey, {
        kind: 'at-rule-statement',
        atRuleName: record.atRuleName,
        conditionText: record.conditionText,
        statementText: record.statementText,
        representedByDeclarations: false,
        unsupportedReasonCode: atRuleStatementUnsupportedReasonCode(record),
        hash: record.atRuleHash
      });
    }
  }
  return result;
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  const conflictTarget = details.cascadeKey ?? details.contractKey ?? details.shapeKey ?? sourcePath ?? 'source';
  return { code, gateId: 'css-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `css#${id}#${reasonCode}#${conflictTarget}`, ...details } };
}

function sameContractChange(left, right) { return (left.after?.hash ?? '') === (right.after?.hash ?? '') && left.kind === right.kind; }
function contractChangeDetails(change) { return { kind: change.kind, contractKind: (change.after ?? change.before)?.contractKind, name: (change.after ?? change.before)?.name, hash: change.after?.hash }; }
function sourceShapeDetails(shape) { return shape ? { kind: shape.kind, selectors: shape.selectors, atRuleName: shape.atRuleName, conditionText: shape.conditionText, statementText: shape.statementText, rawTextHash: shape.rawTextHash, representedByDeclarations: shape.representedByDeclarations } : undefined; }
function sourceShapeChangeReason(before, after) {
  if (!before && after?.kind === 'at-rule') return 'css-atrule-new-scope-unsupported';
  if (before?.kind === 'at-rule' || after?.kind === 'at-rule') return after?.unsupportedReasonCode ?? before?.unsupportedReasonCode ?? 'css-atrule-condition-edit-unsupported';
  if (before?.kind === 'at-rule-statement' || after?.kind === 'at-rule-statement') return after?.unsupportedReasonCode ?? before?.unsupportedReasonCode ?? 'css-atrule-statement-unsupported';
  return 'css-source-shape-unsupported';
}
function atRuleUnsupportedReasonCode(record) {
  if (RuntimeAtRules.has(record.atRuleName)) return `css-${record.atRuleName}-runtime-equivalence-unproved`;
  return record.atRuleName === 'layer' ? 'css-layer-name-edit-unsupported' : 'css-atrule-condition-edit-unsupported';
}
function atRuleStatementUnsupportedReasonCode(record) { return record.atRuleName === 'layer' ? 'css-layer-order-statement-unsupported' : 'css-atrule-statement-unsupported'; }
function isOpaqueAtRuleBlock(record) { return record.kind === 'at-rule' && !ScopeAtRules.has(record.atRuleName) && typeof record.rawTextHash === 'string'; }
function ruleIdentityKey(record) { return [...(record.scopes ?? []), record.selectors.join(',')].join('::'); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function uniqueProofGaps(values) {
  const byCode = new Map();
  for (const value of values) if (value?.code && !byCode.has(value.code)) byCode.set(value.code, value);
  return [...byCode.values()];
}

export { cssModuleContractChanges, cssModuleContractConflicts, sheetOptions, unsupportedSourceShapeChanges, unsupportedSourceShapeConflicts };

const RuntimeAtRules = new Set(['keyframes', 'font-face', 'page', 'property']);
const ScopeAtRules = new Set(['media', 'supports', 'container', 'layer', 'scope']);

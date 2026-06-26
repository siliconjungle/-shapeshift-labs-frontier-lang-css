import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface CssProjectionOptions {
  readonly banner?: string;
  readonly sourceMapId?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly cssModule?: boolean;
  readonly cssModules?: boolean;
  readonly generatedClassNameMap?: Readonly<Record<string, string>>;
  readonly generatedClassNameMapHash?: string;
  readonly jsTsUseSiteGraphHash?: string;
  readonly cssModuleCompositionGraphHash?: string;
  readonly icssGraphHash?: string;
  readonly targetPath?: string;
  readonly semanticIndexId?: string;
  readonly sourceSpansBySemanticNodeId?: Readonly<Record<string, CssSourceSpan>>;
  readonly evidence?: readonly CssProjectionEvidenceRecord[];
}

export interface CssProjectionEvidenceRecord {
  readonly id: string;
  readonly kind?: string;
  readonly summary?: string;
  readonly [key: string]: unknown;
}

export interface CssSourceSpan {
  readonly path?: string;
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface CssSourceRef {
  readonly semanticNodeId: string;
  readonly semanticNodeKind?: string;
  readonly semanticNodeName?: string;
  readonly regionIds?: readonly string[];
}

export interface CssAstDeclaration {
  readonly property: string;
  readonly value: string;
}

export interface CssAstRule {
  readonly kind: 'rule';
  readonly selector: string;
  readonly declarations: readonly CssAstDeclaration[];
  readonly sourceRef?: CssSourceRef;
}

export interface CssAstStylesheet {
  readonly kind: 'css.stylesheet';
  readonly banner: string;
  readonly rules: readonly CssAstRule[];
}

export interface CssSourceMapMapping {
  readonly id: string;
  readonly semanticNodeId: string;
  readonly sourceSpan?: CssSourceSpan;
  readonly generatedSpan: CssSourceSpan & { readonly targetPath?: string; readonly generatedName?: string };
  readonly target?: { readonly language: 'css'; readonly [key: string]: unknown };
  readonly generatedName?: string;
  readonly precision: 'rule-block';
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CssSourceMap {
  readonly kind: 'frontier.lang.sourceMap';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: { readonly language: 'css'; readonly [key: string]: unknown };
  readonly targetPath?: string;
  readonly semanticIndexId?: string;
  readonly mappings: readonly CssSourceMapMapping[];
  readonly evidence: readonly CssProjectionEvidenceRecord[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CssProjectionResult {
  readonly code: string;
  readonly sourceMap: CssSourceMap;
}

export interface CssProjectionWithAstResult extends CssProjectionResult {
  readonly ast: CssAstStylesheet;
}

export interface CssSemanticProofGap {
  readonly code: string;
  readonly status: 'not-claimed' | string;
  readonly summary: string;
  readonly failClosed: true;
  readonly semanticEquivalenceClaim: false;
}

export interface CssSemanticDeclaration {
  readonly property: string;
  readonly rawProperty?: string;
  readonly value: string;
  readonly important: boolean;
  readonly valueHash: string;
  readonly ordinal: number;
  readonly cascadeKey: string;
  readonly declarationHash: string;
}

export interface CssSemanticRecord {
  readonly kind: 'rule' | 'at-rule' | string;
  readonly selectors?: readonly string[];
  readonly selectorHash?: string;
  readonly specificity?: readonly (readonly number[])[];
  readonly scopes?: readonly string[];
  readonly declarations?: readonly CssSemanticDeclaration[];
  readonly customProperties?: readonly string[];
  readonly atRuleName?: string;
  readonly conditionText?: string;
  readonly scopeKey?: string;
  readonly sourceSpan: CssSourceSpan;
  readonly sourceHash: string;
  readonly ruleHash?: string;
  readonly atRuleHash?: string;
  readonly proofGaps?: readonly CssSemanticProofGap[];
}

export interface CssModuleExportRecord {
  readonly kind: 'css-module-export';
  readonly name: string;
  readonly localName: string;
  readonly selectors: readonly string[];
  readonly ruleHashes: readonly string[];
  readonly sourceSpans: readonly CssSourceSpan[];
  readonly generatedName?: string;
  readonly exportHash: string;
}

export interface CssModuleCompositionRecord {
  readonly kind: 'css-module-composition';
  readonly localName: string;
  readonly names: readonly string[];
  readonly source?: string;
  readonly sourceKind: 'local' | 'global' | 'file' | string;
  readonly selectorHash?: string;
  readonly declarationHash?: string;
  readonly compositionHash: string;
}

export interface CssModuleIcssImportRecord {
  readonly kind: 'icss-import';
  readonly source: string;
  readonly importedName: string;
  readonly localName: string;
  readonly declarationHash?: string;
  readonly importHash: string;
}

export interface CssModuleIcssExportRecord {
  readonly kind: 'icss-export';
  readonly name: string;
  readonly value: string;
  readonly declarationHash?: string;
  readonly exportHash: string;
}

export interface CssModuleEvidence {
  readonly kind: 'frontier.lang.cssModuleEvidence';
  readonly version: 1;
  readonly sourceHash: string;
  readonly moduleHash: string;
  readonly mode: 'css-modules';
  readonly exports: readonly CssModuleExportRecord[];
  readonly compositions: readonly CssModuleCompositionRecord[];
  readonly icssImports: readonly CssModuleIcssImportRecord[];
  readonly icssExports: readonly CssModuleIcssExportRecord[];
  readonly generatedClassNameMapHash?: string;
  readonly jsTsUseSiteGraphHash?: string;
  readonly cssModuleCompositionGraphHash?: string;
  readonly icssGraphHash?: string;
  readonly proofGaps: readonly CssSemanticProofGap[];
}

export interface CssSemanticSheet {
  readonly kind: 'frontier.lang.cssSemanticSheet';
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly records: readonly CssSemanticRecord[];
  readonly cssModules?: CssModuleEvidence;
  readonly sheetHash: string;
  readonly summary: Readonly<Record<string, number>>;
  readonly proofGaps: readonly CssSemanticProofGap[];
}

export interface CssSemanticMergeEvidence {
  readonly kind: 'frontier.lang.cssSemanticMergeEvidence';
  readonly version: 1;
  readonly status: 'ready' | 'needs-review' | string;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly sheetHash: string;
  readonly records: readonly CssSemanticRecord[];
  readonly cssModules?: CssModuleEvidence;
  readonly proofGaps: readonly CssSemanticProofGap[];
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly cssModuleGeneratedNameEquivalenceClaim: false;
  readonly cssModuleUseSiteEquivalenceClaim: false;
  readonly browserCascadeEquivalenceClaim: false;
  readonly browserRenderEquivalenceClaim: false;
}

export interface CssSafeMergeConflict {
  readonly code: string;
  readonly gateId: 'css-semantic-merge' | string;
  readonly sourcePath?: string;
  readonly details: Readonly<Record<string, unknown>> & { readonly reasonCode: string; readonly conflictKey: string };
}

export interface CssSafeMergeAdmission {
  readonly status: 'auto-merge-candidate' | 'blocked' | string;
  readonly action: 'apply-css' | 'human-review' | string;
  readonly reviewRequired: boolean;
  readonly reasonCodes: readonly string[];
}

export interface CssSafeMergeResult {
  readonly kind: 'frontier.lang.cssSafeMerge';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly status: 'merged' | 'blocked' | string;
  readonly operation: string;
  readonly mergedSourceText?: string;
  readonly mergedSourceHash?: string;
  readonly conflicts: readonly CssSafeMergeConflict[];
  readonly admission: CssSafeMergeAdmission;
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly baseSheetHash?: string;
  readonly workerSheetHash?: string;
  readonly headSheetHash?: string;
  readonly workerChangedDeclarations?: number;
  readonly headChangedDeclarations?: number;
}

export interface CssSafeMergeInput {
  readonly id?: string;
  readonly sourcePath?: string;
  readonly baseSourceText?: string;
  readonly workerSourceText?: string;
  readonly headSourceText?: string;
}

export declare function toCssAst(document: FrontierLangDocument, options?: CssProjectionOptions): CssAstStylesheet;
export declare function renderCssAst(ast: CssAstStylesheet): string;
export declare function renderCssAstWithSourceMap(ast: CssAstStylesheet, options?: CssProjectionOptions): CssProjectionResult;
export declare function emitCss(document: FrontierLangDocument, options?: CssProjectionOptions): string;
export declare function emitCssWithSourceMap(document: FrontierLangDocument, options?: CssProjectionOptions): CssProjectionWithAstResult;
export declare function parseCssSemanticSheet(sourceText: string, options?: CssProjectionOptions): CssSemanticSheet;
export declare function createCssSemanticMergeEvidence(sourceText: string, options?: CssProjectionOptions): CssSemanticMergeEvidence;
export declare function safeMergeCssSource(input?: CssSafeMergeInput): CssSafeMergeResult;

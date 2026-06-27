export interface CssSelectorTargetProof {
  readonly id?: string; readonly kind: 'css-selector-target-proof' | 'css-source-bound-selector-target-proof' | 'css-selector-target-rebase-proof' | 'css-source-bound-selector-target-rebase-proof' | string;
  readonly status: 'passed' | string; readonly proofLevel?: string; readonly sourcePath?: string; readonly reasonCode?: string; readonly reasonCodes?: readonly string[];
  readonly side?: string; readonly sides?: readonly string[]; readonly moveSide?: string; readonly moveSides?: readonly string[]; readonly selectorMoveSide?: string; readonly selectorMoveSides?: readonly string[];
  readonly rebasedSide?: string; readonly rebasedSides?: readonly string[];
  readonly fromRuleKey?: string; readonly toRuleKey?: string; readonly fromSelectors?: readonly string[]; readonly toSelectors?: readonly string[];
  readonly fromSpecificity?: readonly (readonly number[])[]; readonly toSpecificity?: readonly (readonly number[])[];
  readonly selectorTargetGraphHash?: string; readonly graphHash?: string; readonly beforeSelectorTargetGraphHash?: string; readonly afterSelectorTargetGraphHash?: string;
  readonly selectorTargetGraphHashes?: Readonly<Record<string, string>>; readonly graphHashes?: Readonly<Record<string, string>>;
  readonly baseSelectorTargetGraphHash?: string; readonly workerSelectorTargetGraphHash?: string; readonly headSelectorTargetGraphHash?: string;
  readonly baseSourceText?: string; readonly workerSourceText?: string; readonly headSourceText?: string;
  readonly baseSourceHash?: string; readonly workerSourceHash?: string; readonly headSourceHash?: string;
  readonly sourceTexts?: Readonly<Record<string, string>>; readonly sourceHashes?: Readonly<Record<string, string>>;
  readonly sources?: Readonly<Record<string, string>>; readonly hashes?: Readonly<Record<string, string>>;
}

export interface CssSafeMergeSelectorTargetEvidence {
  readonly kind: 'frontier.lang.cssSafeMergeSelectorTargetEvidence'; readonly version: 1; readonly selectorTargetGraphHashPresent: boolean; readonly parserBackedRuleSpans: boolean;
  readonly selectorMoveCount: number; readonly workerSelectorMoves: number; readonly headSelectorMoves: number;
  readonly sides: Readonly<Record<string, CssSafeMergeSelectorTargetSideEvidence>>;
  readonly moves: Readonly<Record<'worker' | 'head', readonly CssSafeMergeSelectorMove[]>>;
  readonly rebasedChangeCount?: number; readonly rebaseProofs?: readonly CssSafeMergeSelectorTargetRebaseProof[];
}

export interface CssSafeMergeSelectorTargetSideEvidence {
  readonly ruleCount: number; readonly selectorCount: number; readonly declarationCount: number; readonly scopedRuleCount: number;
  readonly selectorTargetGraphHashPresent: boolean; readonly parserBackedRuleSpans: boolean; readonly selectorSpecificityRecords: number;
}

export interface CssSafeMergeSelectorMove {
  readonly side: string; readonly property: string; readonly beforeRuleKey: string; readonly afterRuleKey: string;
  readonly beforeSelectors?: readonly string[]; readonly afterSelectors?: readonly string[]; readonly beforeScopes?: readonly string[]; readonly afterScopes?: readonly string[];
  readonly beforeSpecificity?: readonly (readonly number[])[]; readonly afterSpecificity?: readonly (readonly number[])[]; readonly specificityInvariant: boolean; readonly declarationHash: string; readonly beforeSelectorTargetGraphHash?: string; readonly afterSelectorTargetGraphHash?: string; readonly selectorTargetGraphHashPresent: boolean;
}

export interface CssSafeMergeSelectorTargetRebaseProof {
  readonly id?: string; readonly kind: 'css-selector-target-rebase'; readonly proofKind?: string; readonly status?: 'passed' | string; readonly proofLevel?: string;
  readonly side: string; readonly moveSide?: string; readonly fromRuleKey: string; readonly toRuleKey: string; readonly fromSelectors?: readonly string[]; readonly toSelectors?: readonly string[];
  readonly property: string; readonly cascadeKey: string; readonly selectorTargetGraphHash?: string; readonly beforeSelectorTargetGraphHash?: string; readonly afterSelectorTargetGraphHash?: string;
  readonly specificityInvariant: true; readonly beforeSpecificity?: readonly (readonly number[])[]; readonly afterSpecificity?: readonly (readonly number[])[];
  readonly baseSourceHash?: string; readonly workerSourceHash?: string; readonly headSourceHash?: string;
}

export interface CssSelectorTargetEquivalence {
  readonly sourcePath?: string; readonly fromRuleKey?: string; readonly toRuleKey?: string; readonly fromSelectors?: readonly string[]; readonly toSelectors?: readonly string[]; readonly fromSpecificity?: readonly (readonly number[])[]; readonly toSpecificity?: readonly (readonly number[])[]; readonly graphHash?: string;
}

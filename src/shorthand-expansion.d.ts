export interface CssShorthandLonghandExpansion {
  readonly property: string;
  readonly value: string;
}

export interface CssShorthandExpansionEvidence {
  readonly kind: 'frontier.lang.cssShorthandExpansionEvidence';
  readonly version: 1;
  readonly property: string;
  readonly value: string;
  readonly group?: string;
  readonly status: 'expanded' | 'unsupported' | string;
  readonly deterministic: boolean;
  readonly reasonCode?: string;
  readonly longhands?: readonly CssShorthandLonghandExpansion[];
  readonly expansionHash?: string;
}

export interface CssSafeMergeShorthandExpansionEvidence {
  readonly kind: 'frontier.lang.cssSafeMergeShorthandExpansionEvidence';
  readonly version: 1;
  readonly shorthandDeclarationCount: number;
  readonly changedShorthandCount: number;
  readonly expandedChangedShorthandCount: number;
  readonly unsupportedChangedShorthandCount: number;
  readonly deterministicExpansionClaim: boolean;
  readonly sides: Readonly<Record<string, CssSafeMergeShorthandExpansionSideEvidence>>;
  readonly changedShorthands: readonly CssSafeMergeChangedShorthandExpansion[];
}

export interface CssSafeMergeShorthandExpansionSideEvidence {
  readonly shorthandDeclarationCount: number;
  readonly expandedShorthandDeclarations: number;
  readonly unsupportedShorthandDeclarations: number;
  readonly supportedProperties: readonly string[];
  readonly unsupportedProperties: readonly string[];
}

export interface CssSafeMergeChangedShorthandExpansion {
  readonly cascadeKey: string;
  readonly property: string;
  readonly value: string;
  readonly expansion: CssShorthandExpansionEvidence;
}

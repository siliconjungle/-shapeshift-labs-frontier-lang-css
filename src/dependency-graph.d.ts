import type { CssSourceSpan } from './index.js';

export interface CssDependencyGraphRecord {
  readonly kind: string;
  readonly cascadeKey?: string;
  readonly property?: string;
  readonly name?: string;
  readonly family?: string;
  readonly url?: string;
  readonly sourceKind?: string;
  readonly hasFallback?: boolean;
  readonly fallbackHash?: string;
  readonly targetDefined?: boolean;
  readonly descriptorName?: string; readonly descriptorCount?: number; readonly descriptorHash?: string;
  readonly value?: string; readonly valueHash?: string; readonly syntax?: string; readonly inherits?: string; readonly initialValue?: string;
  readonly pageSelector?: string; readonly marginBox?: string;
  readonly declarationHash?: string;
  readonly ruleHash?: string;
  readonly atRuleHash?: string;
  readonly selectors?: readonly string[];
  readonly scopes?: readonly string[];
  readonly sourceSpan?: CssSourceSpan;
  readonly sourceHash?: string;
}

export interface CssDependencyGraphRecordSets {
  readonly customPropertyDefinitions?: readonly CssDependencyGraphRecord[];
  readonly customPropertyReferences?: readonly CssDependencyGraphRecord[];
  readonly keyframes?: readonly CssDependencyGraphRecord[];
  readonly animationNameLinks?: readonly CssDependencyGraphRecord[];
  readonly fontFaces?: readonly CssDependencyGraphRecord[];
  readonly fontFaceLinks?: readonly CssDependencyGraphRecord[];
  readonly urlAssetReferences?: readonly CssDependencyGraphRecord[];
  readonly propertyRegistrations?: readonly CssDependencyGraphRecord[];
  readonly propertyRegistrationDescriptors?: readonly CssDependencyGraphRecord[];
  readonly pageDescriptors?: readonly CssDependencyGraphRecord[];
  readonly pageMarginDescriptors?: readonly CssDependencyGraphRecord[];
}

export interface CssDependencyGraphChange {
  readonly side: 'worker' | 'head' | string;
  readonly cascadeKey: string;
  readonly reasonCode: 'css-dependency-graph-proof-unproved' | string;
  readonly changeKind?: string;
  readonly before?: Readonly<Record<string, unknown>>;
  readonly after?: Readonly<Record<string, unknown>>;
}

export interface CssDependencyGraphEvidence {
  readonly kind: 'frontier.lang.cssDependencyGraphEvidence' | 'frontier.lang.cssSafeMergeDependencyGraphEvidence' | string;
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly hasDependencySurface: boolean;
  readonly dependencySurfaceCount: number;
  readonly dependencyGraphHashPresent: boolean;
  readonly cssDependencyGraphHashPresent?: boolean;
  readonly dependencyGraphHash?: string;
  readonly cssDependencyGraphHash?: string;
  readonly changedDependencySurfaceCount?: number;
  readonly changedDependencySurfaces?: readonly CssDependencyGraphChange[];
  readonly customPropertyDefinitions?: number;
  readonly customPropertyReferences?: number;
  readonly varReferences?: number;
  readonly varFallbackReferences?: number;
  readonly keyframeDefinitions?: number;
  readonly animationNameLinks?: number;
  readonly keyframeLinks?: number;
  readonly fontFaceDefinitions?: number;
  readonly fontFaceLinks?: number;
  readonly urlAssetReferences?: number;
  readonly propertyRegistrations?: number;
  readonly propertyRegistrationDescriptors?: number;
  readonly pageDescriptors?: number;
  readonly pageMarginDescriptors?: number;
  readonly records?: CssDependencyGraphRecordSets;
  readonly sides?: Readonly<Record<string, CssDependencyGraphEvidence>>;
  readonly browserCascadeEquivalenceClaim?: false;
  readonly browserRenderEquivalenceClaim?: false;
  readonly semanticEquivalenceClaim: false;
}

export interface CssDependencyGraphProof {
  readonly id?: string;
  readonly kind: 'css-dependency-graph-proof' | 'css-source-bound-dependency-graph-proof' | string;
  readonly status: 'passed' | string;
  readonly proofLevel?: string;
  readonly sourcePath?: string;
  readonly reasonCode?: string; readonly reasonCodes?: readonly string[];
  readonly side?: 'worker' | 'head' | string; readonly sides?: readonly string[];
  readonly cascadeKey?: string; readonly cascadeKeys?: readonly string[];
  readonly dependencyKey?: string; readonly dependencyKeys?: readonly string[];
  readonly baseSourceText?: string; readonly workerSourceText?: string; readonly headSourceText?: string; readonly outputSourceText?: string; readonly mergedSourceText?: string;
  readonly baseSourceHash?: string; readonly workerSourceHash?: string; readonly headSourceHash?: string; readonly outputSourceHash?: string; readonly mergedSourceHash?: string;
  readonly sourceTexts?: Readonly<Record<string, string>>; readonly sources?: Readonly<Record<string, string>>;
  readonly sourceHashes?: Readonly<Record<string, string>>; readonly hashes?: Readonly<Record<string, string>>;
  readonly baseDependencyGraphHash?: string; readonly workerDependencyGraphHash?: string; readonly headDependencyGraphHash?: string;
  readonly baseCssDependencyGraphHash?: string; readonly workerCssDependencyGraphHash?: string; readonly headCssDependencyGraphHash?: string;
  readonly dependencyGraphHashes?: Readonly<Record<string, string>>;
  readonly cssDependencyGraphHashes?: Readonly<Record<string, string>>;
}

export interface CssDependencyGraphProofRecord {
  readonly id?: string;
  readonly kind: string;
  readonly status: 'passed';
  readonly proofLevel: string;
  readonly reasonCode: string;
  readonly side: string;
  readonly cascadeKey: string;
  readonly sourcePath?: string;
  readonly baseSourceHash?: string; readonly workerSourceHash?: string; readonly headSourceHash?: string; readonly outputSourceHash?: string;
  readonly baseDependencyGraphHash?: string; readonly workerDependencyGraphHash?: string; readonly headDependencyGraphHash?: string;
}

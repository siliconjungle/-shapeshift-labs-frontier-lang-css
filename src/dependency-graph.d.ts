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
  readonly records?: CssDependencyGraphRecordSets;
  readonly sides?: Readonly<Record<string, CssDependencyGraphEvidence>>;
  readonly browserCascadeEquivalenceClaim?: false;
  readonly browserRenderEquivalenceClaim?: false;
  readonly semanticEquivalenceClaim: false;
}

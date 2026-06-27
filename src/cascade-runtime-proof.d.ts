export interface CssCascadeRuntimeProof {
  readonly id?: string;
  readonly kind: 'css-cascade-runtime-proof' | 'css-source-bound-cascade-runtime-proof' | string;
  readonly status: 'passed' | string;
  readonly proofLevel?: string;
  readonly sourcePath?: string;
  readonly reasonCode?: string;
  readonly reasonCodes?: readonly string[];
  readonly side?: 'worker' | 'head' | string;
  readonly sides?: readonly string[];
  readonly shapeKey?: string;
  readonly shapeKeys?: readonly string[];
  readonly baseSourceText?: string; readonly workerSourceText?: string; readonly headSourceText?: string; readonly outputSourceText?: string; readonly mergedSourceText?: string;
  readonly baseSourceHash?: string; readonly workerSourceHash?: string; readonly headSourceHash?: string; readonly outputSourceHash?: string; readonly mergedSourceHash?: string;
  readonly sourceTexts?: Readonly<Record<string, string>>;
  readonly sources?: Readonly<Record<string, string>>;
  readonly sourceHashes?: Readonly<Record<string, string>>;
  readonly hashes?: Readonly<Record<string, string>>;
  readonly runtimeCommand?: string; readonly browserCommand?: string; readonly command?: string; readonly commandId?: string; readonly probeCommand?: string;
  readonly runtimeProbeId?: string; readonly browserProbeId?: string; readonly probeId?: string;
  readonly runtimeEvidenceHash?: string; readonly browserEvidenceHash?: string; readonly evidenceHash?: string; readonly cascadeEvidenceHash?: string; readonly renderEvidenceHash?: string;
  readonly runtimeSignals?: readonly string[] | Readonly<Record<string, boolean>>;
  readonly browserSignals?: readonly string[] | Readonly<Record<string, boolean>>;
  readonly evidenceSignals?: readonly string[] | Readonly<Record<string, boolean>>;
  readonly probeSignals?: readonly string[] | Readonly<Record<string, boolean>>;
  readonly probe?: CssCascadeRuntimeProofEvidenceRef;
  readonly evidence?: CssCascadeRuntimeProofEvidenceRef;
  readonly runtimeEvidence?: CssCascadeRuntimeProofEvidenceRef;
  readonly browserEvidence?: CssCascadeRuntimeProofEvidenceRef;
  readonly runtimeEvidenceBound?: boolean;
  readonly browserCascadeEquivalenceClaim?: boolean;
  readonly browserRenderEquivalenceClaim?: boolean;
  readonly semanticEquivalenceClaim?: boolean;
  readonly autoMergeClaim?: boolean;
}

export interface CssCascadeRuntimeProofEvidenceRef {
  readonly id?: string;
  readonly command?: string;
  readonly commandId?: string;
  readonly probeId?: string;
  readonly hash?: string;
  readonly evidenceHash?: string;
  readonly signals?: readonly string[] | Readonly<Record<string, boolean>>;
}

export interface CssCascadeRuntimeProofInput extends Partial<CssCascadeRuntimeProof> {
  readonly base?: string;
  readonly worker?: string;
  readonly head?: string;
  readonly output?: string;
  readonly merged?: string;
}

export interface CssCascadeRuntimeProofRecord {
  readonly id?: string;
  readonly kind: string;
  readonly status: 'passed';
  readonly proofLevel: string;
  readonly reasonCode: string;
  readonly side: string;
  readonly shapeKey: string;
  readonly sourcePath?: string;
  readonly baseSourceHash?: string;
  readonly workerSourceHash?: string;
  readonly headSourceHash?: string;
  readonly outputSourceHash?: string;
  readonly runtimeCommand?: string;
  readonly runtimeProbeId?: string;
  readonly runtimeEvidenceHash: string;
  readonly runtimeSignals: readonly string[];
  readonly requiredRuntimeSignals: readonly string[];
  readonly runtimeEvidenceBound: true;
  readonly browserCascadeEquivalenceClaim: true;
  readonly browserRenderEquivalenceClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly autoMergeClaim: false;
}

export declare function createCssCascadeRuntimeProof(input?: CssCascadeRuntimeProofInput): CssCascadeRuntimeProof;

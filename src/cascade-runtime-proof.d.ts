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
}

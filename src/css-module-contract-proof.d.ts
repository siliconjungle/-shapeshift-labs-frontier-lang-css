export interface CssModuleContractProof {
  readonly id?: string;
  readonly kind: 'css-source-bound-module-contract-proof' | 'css-module-contract-proof' | 'css-source-bound-css-module-contract-proof' | string;
  readonly status: 'passed' | string;
  readonly sourcePath: string;
  readonly side?: string;
  readonly sides?: readonly string[];
  readonly changeKind?: string;
  readonly changeKinds?: readonly string[];
  readonly contractKey?: string;
  readonly contractKeys?: readonly string[];
  readonly contractKind?: string;
  readonly contractKinds?: readonly string[];
  readonly baseSourceText?: string;
  readonly workerSourceText?: string;
  readonly headSourceText?: string;
  readonly outputSourceText?: string;
  readonly mergedSourceText?: string;
  readonly baseSourceHash?: string;
  readonly workerSourceHash?: string;
  readonly headSourceHash?: string;
  readonly outputSourceHash?: string;
  readonly mergedSourceHash?: string;
  readonly sourceTexts?: Readonly<Record<string,string>>;
  readonly sourceHashes?: Readonly<Record<string,string>>;
  readonly sources?: Readonly<Record<string,string>>;
  readonly hashes?: Readonly<Record<string,string>>;
  readonly moduleHash?: string;
  readonly generatedClassNameMapHash?: string;
  readonly jsTsUseSiteGraphHash?: string;
  readonly cssModuleCompositionGraphHash?: string;
  readonly icssGraphHash?: string;
  readonly contractGraphHashes?: Readonly<Record<string,string>>;
  readonly cssModuleGraphHashes?: Readonly<Record<string,string>>;
  readonly proofLevel?: string;
}

export interface CssModuleContractProofRecord {
  readonly id?: string;
  readonly kind: string;
  readonly status: 'passed';
  readonly proofLevel: string;
  readonly sourcePath?: string;
  readonly side: string;
  readonly changeKind: string;
  readonly contractKey: string;
  readonly contractKind: string;
  readonly baseSourceHash?: string;
  readonly workerSourceHash?: string;
  readonly headSourceHash?: string;
  readonly outputSourceHash?: string;
  readonly moduleHash?: string;
  readonly generatedClassNameMapHash?: string;
  readonly jsTsUseSiteGraphHash?: string;
  readonly cssModuleCompositionGraphHash?: string;
  readonly icssGraphHash?: string;
}

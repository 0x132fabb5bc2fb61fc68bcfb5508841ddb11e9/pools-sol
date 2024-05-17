interface Poseidon {
  (input: [bigint] | [string, number] | [string] | [string, string] | [string, number, number]): string;
}

interface ProofInput {
  root: string;
  subsetRoot: string;
  nullifier: string;
  assetMetadata: string;
  withdrawMetadata: string;
  secret: string;
  path: string;
  mainProof: string[];
  subsetProof: string[];
}

export type Proof = {
  pi_a: [string, string, string];
  pi_b: [
    [string, string],
    [string, string],
    [string, string],
  ];
  pi_c: [string, string, string];
  protocol: 'groth16';
  curve: 'bn128';
}

interface GenerateProof {
  (options: {
    input: ProofInput;
    wasmFileName: string;
    zkeyFileName: string;
  }): Promise<{
    proof: Proof;
    publicSignals: string[];
  }>
}

interface VerifyProof {
  (options: {
    proof: Proof;
    publicSignals: string[];
    verifierJson: object;
  }): Promise<boolean>;
}

declare interface AccessList {
  new(opts: {
    treeType: string;
    subsetString: string;
  }): AccessList
  path(p: number): Promise<{
    pathRoot: string;
    pathElements: string[];
  }>;
  allow(n: number): void;
}

declare interface MerkleTree {
  new(opts: {
    hasher: Poseidon;
    leaves: string[];
    baseString: string;
  }): MerkleTree;
  insert(element: string): Promise<void>
  root: string;
  path(p: number): Promise<{
    pathRoot: string;
    pathElements: string[];
  }>;
}

export interface Lib {
  poseidon: Poseidon;
  AccessList: AccessList;
  MerkleTree: MerkleTree;
  generateProof: GenerateProof;
  verifyProof: VerifyProof;
}

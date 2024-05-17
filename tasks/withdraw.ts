import { HardhatRuntimeEnvironment } from "hardhat/types"
import type { PrivacyPool, ERC20 } from "../artifacts/types";
import * as l from '../lib/'
import { Lib } from "../types"
import { DepositEvent } from "../artifacts/types/contracts/PrivacyPool";
import { BigNumberish, ethers } from "ethers";

import VERIFIER_JSON from "../circuits/out/withdraw_from_subset_verifier.json"
import { exteriorHdPath, flattenProof, generateKeys, hashMod } from "./utils";

const WASM_FNAME = "./circuits/out/withdraw_from_subset_js/withdraw_from_subset.wasm";
const ZKEY_FNAME = "./circuits/out/withdraw_from_subset_final.zkey";

const lib = l as Lib

type Input = {
  pool: string;
  noteIndex?: number;
  commitmentPath: number;
  deployTxHash: string;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  const { secret } = generateKeys(hre, exteriorHdPath(args.noteIndex || 0))
  // const noteWallet = hre.ethers.Wallet.fromPhrase(process.env.NOTE_WALLET_MNEMONIC as string)
  // const note = noteWallet.deriveChild(args.noteIndex || 0)
  const pool = await hre.ethers.getContractAt('contracts/PrivacyPool.sol:PrivacyPool', args.pool) as unknown as PrivacyPool
  const [asset, denomination, assetMetadata] = await Promise.all([
    pool.asset(),
    pool.denomination(),
    pool.assetMetadata(),
  ])
  const tx = await hre.ethers.provider.getTransaction(args.deployTxHash)
  let start = BigInt(tx!.blockNumber!)
  const latest = await hre.ethers.provider.getBlock('latest')
  const de = pool.filters.Deposit()
  let fullScanned = false
  let allLogs: DepositEvent.Log[] = []
  do {
    const end = start + 1000n
    const logs = await pool.queryFilter(
      de, hre.ethers.toBeHex(start), hre.ethers.toBeHex(end),
    ) as DepositEvent.Log[]
    fullScanned = BigInt(latest!.number) < end
    start = end
    allLogs = allLogs.concat(logs)
  } while (!fullScanned);
  const depositEntries = allLogs.map((log) => [log.args.leafIndex, log.args] as const)
  const depositMap = new Map<bigint, DepositEvent.OutputObject>(depositEntries)
  const sortedDeposits = [...depositMap.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1)
  const leaves = sortedDeposits.map(([, deposit]) => deposit.leaf)
  const depositTree = new lib.MerkleTree({
    hasher: lib.poseidon,
    leaves,
    baseString: 'empty',
  })
  const emptyBlocklist = new lib.AccessList({
    treeType: 'blocklist',
    subsetString: '',
  })
  emptyBlocklist.allow(leaves.length - 1)
  // const root = await pool.getLatestRoot()
  // const depositRoot = hre.ethers.toBeHex(depositTree.root, 32)
  // console.log('remote %o', root)
  // console.log('local  %o', depositRoot)
  const [recipient] = await hre.ethers.getSigners()
  const withdrawData = {
    accessType: 0,
    bitLength: 1,
    subsetData: '0x00',
    recipient: await recipient.getAddress(),
    refund: 0,
    relayer: hre.ethers.ZeroAddress,
    fee: 0,
    deadline: 0,
  } as const

  const withdrawalKeys: (keyof typeof withdrawData)[] = [
    'recipient',
    'refund',
    'relayer',
    'fee',
    'deadline',
    'accessType',
    'bitLength',
    'subsetData',
  ]
  const withdrawMetadata = hashMod(
    ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint8', 'uint24', 'bytes'],
    withdrawalKeys.map((k) => withdrawData[k]),
  )
  const nullifier = lib.poseidon([ethers.toBeHex(secret, 32), 1, args.commitmentPath])
  const {
    pathElements: mainProof,
    pathRoot: root,
  } = await depositTree.path(+args.commitmentPath)
  const {
    pathElements: subsetProof,
    pathRoot: subsetRoot,
  } = await emptyBlocklist.path(+args.commitmentPath)

  const input = {
    root: BigInt(root).toString(),
    subsetRoot: BigInt(subsetRoot).toString(),
    nullifier: BigInt(nullifier).toString(),
    assetMetadata: BigInt(assetMetadata).toString(),
    withdrawMetadata: BigInt(withdrawMetadata).toString(),
    secret: secret.toString(),
    path: args.commitmentPath.toString(),
    mainProof: mainProof.map((p) => BigInt(p).toString()),
    subsetProof: subsetProof.map((p) => BigInt(p).toString()),
  }
  const {
    proof,
    publicSignals,
  } = await lib.generateProof({
    input,
    wasmFileName: WASM_FNAME,
    zkeyFileName: ZKEY_FNAME,
  })
  if (!await lib.verifyProof({
    proof, publicSignals,
    verifierJson: VERIFIER_JSON,
  })) {
    throw new Error('verification failed')
  }
  const flatProof = flattenProof(proof)
  const p = {
    flatProof,
    root: hre.ethers.toBeHex(root, 32),
    subsetRoot: hre.ethers.toBeHex(subsetRoot, 32),
    nullifier: hre.ethers.toBeHex(nullifier, 32),
    accessType: withdrawData.accessType,
    bitLength: withdrawData.bitLength,
    subsetData: withdrawData.subsetData,
    recipient: withdrawData.recipient,
    relayer: withdrawData.relayer,
    refund: withdrawData.refund,
    fee: withdrawData.fee,
    deadline: withdrawData.deadline,
  } as PrivacyPool.WithdrawalProofStruct
  await pool.verifyWithdrawal(p)
  console.log('verification passed')
}

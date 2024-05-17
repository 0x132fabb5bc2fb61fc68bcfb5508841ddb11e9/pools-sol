import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers } from "ethers"
import * as l from '../lib'
import type { Proof, Lib } from "../types"

const lib = l as Lib

const coinType = 9777

export const interiorHdPath = (index: number) => {
  return `m/44'/${coinType}'/0'/0/${index}`
}

export const exteriorHdPath = (index: number) => {
  return `m/44'/${coinType}'/0'/1/${index}`
}

export const generateKeys = (hre: HardhatRuntimeEnvironment, path: string) => {
  const noteWallet = hre.ethers.HDNodeWallet.fromMnemonic(
    hre.ethers.Mnemonic.fromPhrase(process.env.NOTE_WALLET_MNEMONIC as string),
    path,
  )
  const secret = toFE(noteWallet.privateKey)
  const commitment = lib.poseidon([secret])
  return {
    secret,
    commitment: ethers.toBeHex(`0x${BigInt(commitment.toString()).toString(16)}`, 32),
  }
}

const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

export function hashMod(types: string[], values: any[]): bigint {
  return toFE(ethers.keccak256(ethers.solidityPackedKeccak256(types, values)));
}

// // returns keccak256(data) % snark_scalar_value
export function toFE(value: ethers.BigNumberish): bigint {
  return BigInt(value) % P;
}

// Flatten proof from three variables into one for solidity calldata.
export const flattenProof = (proof: Proof) => {
  return [
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1]
  ];
}

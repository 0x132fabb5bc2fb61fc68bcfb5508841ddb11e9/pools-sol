import { HardhatRuntimeEnvironment } from "hardhat/types"
import type { ERC20 } from "../artifacts/types";
import * as l from '../lib/'
import { Lib } from "../types"
import { LogDescription } from "ethers";
import { DepositEvent, PrivacyPool } from "../artifacts/types/contracts/PrivacyPool";
import { exteriorHdPath, generateKeys } from "./utils";

const lib = l as Lib

type Input = {
  pool: string;
  noteIndex?: number;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  const pool = await hre.ethers.getContractAt('contracts/PrivacyPool.sol:PrivacyPool', args.pool) as unknown as PrivacyPool
  const [asset, denomination, assetMetadata] = await Promise.all([
    pool.asset(),
    pool.denomination(),
    pool.assetMetadata(),
  ])
  const isNative = asset === await pool.NATIVE()
  const value = isNative ? denomination : 0n
  if (!isNative) {
    const erc20 = await hre.ethers.getContractAt('IERC20', asset) as ERC20
    const tx = await erc20.approve(pool, denomination)
    await tx.wait()
  }
  const { secret, commitment } = generateKeys(hre, exteriorHdPath(args.noteIndex || 0))
  const commitmentBytes = hre.ethers.toBeHex(commitment, 32)
  const tx = await pool.deposit(commitmentBytes, {
    value,
  })
  const receipt = await tx.wait()
  const logs = receipt!.logs.map((log) => {
    try {
      return pool.interface.parseLog(log)
    } catch (err) {
      return null
    }
  }).filter((l): l is LogDescription => !!l)
  const deposit = logs.find((l) => l.name === 'Deposit') as unknown as DepositEvent.LogDescription
  console.log('using secret %o@%o', hre.ethers.toBeHex(secret, 32), deposit.args.leafIndex)
  return [tx.hash, secret, deposit.args.leafIndex]
}

import { HardhatRuntimeEnvironment } from "hardhat/types";
import type { PrivacyPool, PrivacyPoolFactory } from '../artifacts/types'

type Input = {
  factory: string;
  token: string;
  power: string;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  const poolFactory = await hre.ethers.getContractAt('contracts/PrivacyPoolFactory.sol:PrivacyPoolFactory', args.factory) as unknown as PrivacyPoolFactory
  const token = args.token === hre.ethers.ZeroAddress
    ? await poolFactory.NATIVE()
    : args.token
  let length = await poolFactory.poolGroupLength(token, args.power)
  let deployTxHash: null | string = null
  if (length === 0n) {
    const tx = await poolFactory.createPool(token, args.power)
    await tx.wait()
    deployTxHash = tx.hash
  }
  length = await poolFactory.poolGroupLength(token, args.power)
  const index = length - 1n
  const latest = await poolFactory.poolGroups(token, args.power, index)
  const pp = await hre.ethers.getContractAt('contracts/PrivacyPool.sol:PrivacyPool', latest) as unknown as PrivacyPool
  return [await pp.getAddress(), deployTxHash]
}

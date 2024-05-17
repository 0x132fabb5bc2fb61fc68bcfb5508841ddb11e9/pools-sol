import { HardhatRuntimeEnvironment } from "hardhat/types"
import type { PrivacyPoolFactory__factory } from "../artifacts/types";

type Input = {
  poseidon: string;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  const PrivacyPoolFactory = await hre.ethers.getContractFactory('contracts/PrivacyPoolFactory.sol:PrivacyPoolFactory') as unknown as PrivacyPoolFactory__factory
  const poolFactory = await PrivacyPoolFactory.deploy(args.poseidon)
  const tx = poolFactory.deploymentTransaction()
  await tx!.wait()
  return poolFactory
}

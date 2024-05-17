import { HardhatRuntimeEnvironment } from "hardhat/types"
import { poseidonContract } from "circomlibjs"

type Input = {
  poseidon?: string;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  // poseidon hash function evm contract
  const abi = poseidonContract.generateABI(2)
  const bytecode = poseidonContract.createCode(2)
  const [signer] = await hre.ethers.getSigners()
  const Poseidon = new hre.ethers.ContractFactory(abi, bytecode, signer)
  if (args.poseidon) {
    const deployedBytes = await hre.ethers.provider.getCode(args.poseidon)
    if (!bytecode.includes(deployedBytes.slice(2))) {
      throw new Error('expected different bytes at deployed poseidon')
    }
    return Poseidon.attach(args.poseidon)
  }
  const poseidon = await Poseidon.deploy()
  const tx = poseidon.deploymentTransaction()
  await tx!.wait()
  return poseidon
}

import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers } from "ethers";

type Input = {
  poseidon: string;
  checkIo: boolean;
  power: number;
}

export const main = async (args: Input, hre: HardhatRuntimeEnvironment) => {
  const poseidon: ethers.Contract = await hre.run('deploy:poseidon', {
    poseidon: args.poseidon,
  })
  // double check the bytecode
  await hre.run('deploy:poseidon', {
    poseidon: await poseidon.getAddress(),
  })
  const factory = await hre.run('deploy:factory', {
    poseidon: await poseidon.getAddress(),
  })
  if (args.checkIo) {
    const [pool, deployTxHash] = await hre.run('create-or-get-pool', {
      factory: await factory.getAddress(),
      token: hre.ethers.ZeroAddress,
      power: args.power,
    }) as [string, string]
    type Deposit = [string, string, bigint]
    const d0 = await hre.run('deposit', {
      pool,
    }) as Deposit
    const d1 = await hre.run('deposit', {
      pool,
    }) as Deposit
    const rd = Math.random() < 0.5 ? d0 : d1
    const [, , leafIndex] = rd
    await hre.run('withdraw', {
      pool,
      commitmentPath: Number(leafIndex),
      deployTxHash,
    })
  }
}

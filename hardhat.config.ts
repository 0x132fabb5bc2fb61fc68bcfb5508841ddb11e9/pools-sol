import dotenv from 'dotenv'
dotenv.config()
import { task } from 'hardhat/config'

import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import '@typechain/hardhat'
import { ethers } from 'ethers'
import { main as deploy } from './tasks/deploy'
import { main as deployFactory } from './tasks/deploy-factory'
import { main as deployPoseidon } from './tasks/deploy-poseidon'
import { main as createOrGetPool } from './tasks/create-or-get-pool'
import { main as deposit } from './tasks/deposit'
import { main as withdraw } from './tasks/withdraw'
import { int } from 'hardhat/internal/core/params/argumentTypes'

const {
    ETHERSCAN_API,
    HARDHAT_NODE_LOGGING_ENABLED,
    PRIVATE_KEY,
} = process.env

Error.stackTraceLimit = Infinity

const accounts = [PRIVATE_KEY || ethers.ZeroHash]

task('deploy', 'deploys all contracts')
    .setAction(deploy)
    .addOptionalParam('poseidon', 'the previously deployed poseidon lib')
    .addFlag('checkIo', 'checks that deposits and a withdraw can occur')
    .addOptionalParam('power', 'the power of 10 to use during pool deposit if `checkIo` is true', 18, int)

task('deploy:poseidon', 'deploys the poseidon lib')
    .setAction(deployPoseidon)
    .addOptionalParam('poseidon', 'an address to check the current bytes against to ensure that they match')

task('deploy:factory', 'deploys the factory contract')
    .setAction(deployFactory)
    .addOptionalParam('poseidon', 'what poseidon deployment should be used for the factory')

task('create-or-get-pool', 'creates or gets the latest pool')
    .setAction(createOrGetPool)
    .addParam('factory', 'the address of the factory to create against')
    .addParam('power', 'the power of 10 to use during pool creation', 18, int)
    .addParam('token', 'the token to create or get a pool for', ethers.ZeroAddress)

task('deposit', 'deposits tokens into a given pool')
    .setAction(deposit)
    .addParam('pool', 'the address of the pool to deposit into')
    .addOptionalParam('noteIndex', 'the note wallet index to derive a key from', 0, int)

task('withdraw', 'withdraws tokens from a given pool')
    .setAction(withdraw)
    .addParam('pool', 'the address of the pool to deposit into')
    .addOptionalParam('noteIndex', 'the note wallet index to derive a key from', 0, int)
    .addParam('commitmentPath', 'path to the commitment in the pool', 0, int)
    .addParam('deployTxHash', 'the deploy tx hash to gather all relevant data')

export default {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            loggingEnabled: HARDHAT_NODE_LOGGING_ENABLED === 'true' ? true : false,
            gasPrice: 875000000,
            accounts: {
                accountsBalance: ethers.parseEther((100_000_000_000).toString()).toString(),
                count: 20,
            },
        },
        sepolia: {
            accounts,
            url: 'https://ethereum-sepolia.publicnode.com',
        },
        ethereum: {
            accounts,
            url: 'https://ethereum-rpc.publicnode.com',
        },
    },
    typechain: {
        outDir: 'artifacts/types',
        target: 'ethers-v6',
    },
    mocha: {
        timeout: 120_000,
    },
    solidity: {
        compilers: [
            {
                version: '0.8.24',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1048576 * 2
                    }
                }
            }
        ]
    },
    gasReporter: {
        currency: 'USD',
        token: 'ETH',
        enabled: true,
        gasPrice: 100,
    },
    etherscan: {
        apiKey: ETHERSCAN_API,
        customChains: [
            {
                network: 'sepolia',
                chainId: 11155111,
                urls: {
                    apiURL: 'https://sepolia.etherscan.io/api',
                    browserURL: 'https://sepolia.etherscan.io',
                },
            },
        ],
    },
}


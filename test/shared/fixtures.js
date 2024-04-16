const { setNextBlockTimestamp } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time")
const { ethers } = require("hardhat")
const { poseidonContract: poseidonCon } = require("circomlibjs")
const { setBalance, setStorageAt } = require("@nomicfoundation/hardhat-network-helpers")
const { AVG_BLOCK_TIME, HACKER_RATIO, N_DEPOSITS, POOL_TYPE, NATIVE } = require("./constants")
const { padLeftHash, shuffleArray } = require("./utils")
const { poseidon, MerkleTree, AccessList, utils } = require("../../lib/index");
const { deploy, deployBytes } = require('../../scripts/hardhat.utils');

async function deployPoseidonContract() {
    return await deployBytes(
        "Poseidon",
        poseidonCon.generateABI(2),
        poseidonCon.createCode(2)
    );
}

async function deployAsset(poolType) {
    return poolType === POOL_TYPE.Native ? null : await deploy("Token", [ethers.utils.parseEther("10000")]);
}

function initializeAssetAddress(poolType, asset) {
    return poolType === POOL_TYPE.Native ? NATIVE : asset.address;
}

function deployedFixture(poolType) {
    return async function fixtureFunc() {
        // Deployment and initialization
        const poseidonContract = await deployPoseidonContract();
        const signers = await ethers.getSigners();
        const asset = await deployAsset(poolType);
        const power = 18
        const assetAddress = initializeAssetAddress(poolType, asset);
        const privacyPoolFactory = await deploy("PrivacyPoolFactory", [poseidonContract.address])
        const tx = await privacyPoolFactory.createPool(assetAddress, power)
        await tx.wait()
        const privacyPoolAddress = await privacyPoolFactory.poolGroups(assetAddress, power, 0)
        const privacyPool = await ethers.getContractAt('PrivacyPool', privacyPoolAddress)
        const denomination = ethers.utils.parseUnits("1", power).toBigInt();
        const assetMetadata = utils.hashMod(["address", "uint"], [assetAddress, denomination]);

        // random secrets and commitments
        const secrets = utils.unsafeRandomLeaves(N_DEPOSITS);
        const rawCommitments = new Array(N_DEPOSITS);
        const commitments = new Array(N_DEPOSITS);
        secrets.forEach((secret, i) => {
            rawCommitments[i] = poseidon([secret]);
            commitments[i] = poseidon([rawCommitments[i], assetMetadata]);
        });

        // Divide signers into good and bad
        const goodSignersEnd = Math.floor((1 - HACKER_RATIO) * signers.length);
        const goodSigners = signers.slice(0, goodSignersEnd);
        const badSigners = signers.slice(goodSignersEnd);

        // Create deposit tree
        const depositTree = new MerkleTree({
            hasher: poseidon,
            levels: 20,
            baseString: "empty"
        });

        // Create multi-deposit tree
        const multiDepositTree = new MerkleTree({
            hasher: poseidon,
            levels: 20,
            baseString: "empty"
        });

        // Create empty and hacker blocklists
        const emptyBlocklist = new AccessList({ treeType: "blocklist", subsetString: "" });
        emptyBlocklist.allow(N_DEPOSITS - 1);
        const hackerBlocklist = new AccessList({ treeType: "blocklist", subsetString: "" });
        hackerBlocklist.allow(N_DEPOSITS - 1);

        // Create recipients and withdrawal order
        const recipients = new Array(N_DEPOSITS);
        const withdrawalOrder = new Array(N_DEPOSITS);
        for (let i = 0; i < N_DEPOSITS; i++) {
            recipients[i] = ethers.Wallet.createRandom();
            withdrawalOrder[i] = i;
        }
        shuffleArray(withdrawalOrder);

        // Create and fund a relayer address
        const relayer = ethers.Wallet.createRandom().connect(ethers.provider);
        await setBalance(relayer.address, ethers.utils.parseEther("1000000"));

        return {
            asset,
            assetAddress,
            assetMetadata,
            badSigners,
            commitments,
            denomination,
            depositTree,
            emptyBlocklist,
            goodSigners,
            hackerBlocklist,
            multiDepositTree,
            poseidonContract,
            privacyPool,
            privacyPoolFactory,
            rawCommitments,
            recipients,
            relayer,
            secrets,
            signers,
            withdrawalOrder,
        };
    };
}

function deployedFixtureSameCommitment(poolType) {
    return async function fixtureFunc() {
        // Deployment and initialization
        const poseidonContract = await deployPoseidonContract();
        const signersAll = await ethers.getSigners();
        const signers = (new Array(N_DEPOSITS)).fill(signersAll[0])
        const asset = await deployAsset(poolType);
        const assetAddress = initializeAssetAddress(poolType, asset);
        const denomination = ethers.utils.parseEther("1").toBigInt();
        const privacyPool = await deploy("PrivacyPool", [poseidonContract.address, assetAddress, denomination]);
        const assetMetadata = utils.hashMod(["address", "uint"], [assetAddress, denomination]);

        // random secrets and commitments
        const secrets = utils.unsafeRandomLeaves(N_DEPOSITS);
        const rawCommitments = new Array(N_DEPOSITS);
        const commitments = new Array(N_DEPOSITS);
        secrets.forEach((secret, i) => {
            rawCommitments[i] = poseidon([secret]);
            commitments[i] = poseidon([rawCommitments[i], assetMetadata]);
        });

        const goodSigners = signers;

        // Create deposit tree
        const depositTree = new MerkleTree({
            hasher: poseidon,
            levels: 20,
            baseString: "empty"
        });

        // Create multi-deposit tree
        const multiDepositTree = new MerkleTree({
            hasher: poseidon,
            levels: 20,
            baseString: "empty"
        });

        // Create empty and hacker blocklists
        const emptyBlocklist = new AccessList({ treeType: "blocklist", subsetString: "" });
        emptyBlocklist.allow(N_DEPOSITS);
        const hackerBlocklist = new AccessList({ treeType: "blocklist", subsetString: "" });

        // Create recipients and withdrawal order
        const recipients = new Array(N_DEPOSITS);
        const withdrawalOrder = new Array(N_DEPOSITS);
        for (let i = 0; i < N_DEPOSITS; i++) {
            recipients[i] = ethers.Wallet.createRandom();
            withdrawalOrder[i] = i;
        }
        shuffleArray(withdrawalOrder);

        // Create and fund a relayer address
        const relayer = ethers.Wallet.createRandom().connect(ethers.provider);
        await setBalance(relayer.address, ethers.utils.parseEther("1000000"));

        return {
            asset,
            assetAddress,
            assetMetadata,
            badSigners: [],
            commitments,
            denomination,
            depositTree,
            emptyBlocklist,
            goodSigners,
            hackerBlocklist,
            multiDepositTree,
            poseidonContract,
            privacyPool,
            rawCommitments,
            recipients,
            relayer,
            secrets,
            signers,
            withdrawalOrder,
        };
    };
}

function deployedAndDepositedFixture(poolType) {
    const deployedFx = deployedFixture(poolType);
    return async function fixtureFunc() {
        const {
            asset,
            assetAddress,
            assetMetadata,
            badSigners,
            commitments,
            denomination,
            depositTree,
            emptyBlocklist,
            goodSigners,
            hackerBlocklist,
            multiDepositTree,
            poseidonContract,
            privacyPool,
            rawCommitments,
            recipients,
            relayer,
            secrets,
            signers,
            withdrawalOrder,
        } = await deployedFx();

        // Deposit funds and update fixture
        const latest = await privacyPool.provider.getBlock('latest');
        let timestamp = latest.timestamp;
        for (let i = 0; i < N_DEPOSITS; i++) {
            const signerIndex = i % signers.length;
            if (signerIndex >= goodSigners.length) {
                hackerBlocklist.block(i);
            }
            const signer = signers[signerIndex];

            let value = 0n;
            if (!asset) {
                value = denomination;
            } else {
                await asset.transfer(signer.address, denomination);
                await asset.connect(signer).approve(privacyPool.address, denomination);
            }
            timestamp += AVG_BLOCK_TIME;
            await setNextBlockTimestamp(timestamp);

            await privacyPool.connect(signer).deposit(padLeftHash(rawCommitments[i]), { value });
            await depositTree.insert(commitments[i]);
        }

        // Return updated fixture data
        return {
            asset,
            assetAddress,
            assetMetadata,
            badSigners,
            commitments,
            denomination,
            depositTree,
            emptyBlocklist,
            goodSigners,
            hackerBlocklist,
            multiDepositTree,
            poseidonContract,
            privacyPool,
            rawCommitments,
            recipients,
            relayer,
            secrets,
            signers,
            withdrawalOrder,
        };
    };
}

async function fillStorage(privacyPoolAddress) {
    return await setStorageAt(
        privacyPoolAddress,
        1,
        2n ** 20n, // 1048576
    )
}

module.exports = {
    deployAsset,
    fillStorage,
    deployedFixture,
    deployedAndDepositedFixture,
    deployedFixtureSameCommitment,
};

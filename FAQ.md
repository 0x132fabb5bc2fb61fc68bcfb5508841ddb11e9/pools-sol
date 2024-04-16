## FAQ

What is the exact difference between Tornado and Privacy Pools?

- Tornado uses unique secrets generated by the user during it's deposit and withdrawal. This makes reusing the same commitments impossible without loss of funds. Privacy Pools uses commitment + deposit leaf path during withdraw to ensure a simple user experience.

- Tornado uses a governance token to manage relayers. In Privacy Pools, anyone can be a relayer and the market price of privacy is determined by the participants.

- Privacy Pools allows you to generate Proof of Innocence (PoI), in order to differentiate withdrawals from deposits that one may wish to disassociate from. The data used to generate a proof can be published OnChain, during withdrawal, as well.

## User Stories

- Addresses are able to deposit tokens and withdraw funds to a different wallet without creating a direct OnChain link between the wallets.

- Any address can run the withdrawal for another address and not risk the `recipient` of the funds being changed since the `recipient` address is constrained to a single input in the zk proof.

- Multiple deposits can be initiated with a method call, saving gas and providing a better experience for depositors.

- A withdrawal proof (generated by the depositor) can contain a tip or `fee`, to pay to a `feeReciever` upon execution, as named by the caller of the withdraw method.

- A gas `refund` can be provided to any user, which is useful for fresh addresses that do not have any gas to start transacting.

- A `relayer` can also be named, constraining the ability of other addresses to execute withdrawals to only the address named. Using the zero address allows any address to be sender.

### Factory

The Factory contract is responsible for the creation and management of privacy pool instances. Key functionalities include:

- **Creation of New Pools:** The factory enables the creation of new privacy pool instances for a specified asset with a denomination of a given `power`. This power input is constrained from 0-77 (inclusive) to represent the factor of 10 to be used in the uint representation of the denomination. Assets can either be ERC20 tokens or native blockchain assets.

- **Deployment of New Pools upon Limitation:** If the maximum tree within a privacy pool instance is reached (2^20), the Factory allows the deployment of a new pool instance with the same power value, ensuring scalability and continuous service.

### Privacy Pools

#### Deposit

- Deposts can be made by anyone.

- **Asset Deposit:**
  - **Function Input:** The deposit method takes a hash of a secret as a commmitment. This commitment is then hashed with the asset metadata and saved in the on chain list / tree.
  - **Expected Effect**: Tokens (both native and ERC20) are deposited into the contract and held until a valid proof and contract level constraint inputs are provided.

#### Withdraw

- Withdrawals are allowed to be executed by anyone, given the appropriate contract constraints.
- Anonymity sets come from OnChain deposits. Lists for suggested exclusion come from a combination of off and on chain resources.
- PoI subsets can be generated for any combination of deposits.

- **Asset Withdraw:**
  - **Function Input:** To generate a withdrawal, a user would need to have the original secret and the set of deposit commitments from their deposit to the current state. They then need to use the poseidon hashing function to show that their deposit exists within that set. These hashing functions and patterns are available within the lib folder.
    - **Fee**: The fee works by providing an amount, less than or equal to the amount being withdrawn, that can be paid to a fee recipient. This fee is uses to incent relayers and sequencers to execute function calls for withdrawers.
    - **Relayer**: The relayer property is a constraint for the contract to disallow even valid proofs from being executed by an address if that address is not named in the proof.
    - **Refund (ERC20 only)**: Refunds are a means of adding native tokens to the recipient's address. They allow fresh addresses to have native tokens to use after receiving their ERC20 tokens, which cannot be used to pay for gas. Funds are transferred from withdraw callers and would, presumably, be encouraged by the proof originator including a fee in their proof to pay, at a reasonable rate, for the native tokens.

### Additional Concepts

- **Deadline:** Withdrawals allow a deadline to be set to constrain the speed of execution, ex: a user may wish to withdraw, and provide a certain fee, but only if the withdrawal is executed within the next 5 minutes. They could provide a fee the has a deadline of t+300 and a lower fee message at the same time so that at least one message would be available to execute for relayers/sequencers at any given time.

- **Nonstandard ERC20 tokens: fee on transfer, rebase, etc**:. - Fee on transfer is not supported unless the token whitelists the pool to not take a fee during its transfer. Rebase tokens are not supported as they would not be guaranteed to provide sufficient balances to the pool.

### Anonymity Sets

The mechanism are particularly relevant in contexts where privacy tools are essential for security but face challenges due to misuse by malicious actors. Here’s how it works:

### Deposit
1. **Generate a Commitment:** The user starts by generating a cryptographic commitment from a secure, random secret. This commitment represents their deposit without revealing any specific details about it.
2. **Approve and Deposit:**
   - If depositing an ERC20 token, the user first calls the `approve` function on the ERC20 token contract, granting the privacy pool contract permission to handle their tokens.
   - The user then calls the `deposit` function on the privacy pool contract with their commitment. The contract updates its Merkle tree of deposits, including the new commitment, and assigns a unique index to the user's deposit, representing its path in the tree.

### Wait
- **Anonymity Set Formation:** The user waits for the anonymity set to grow, which means more users are waiting to make deposits. This period is critical for ensuring the user's transaction blends with others, enhancing privacy.
- **Exclusion of Illicit Funds:** If any deposits are identified as originating from hackers or sanctioned addresses, these can be excluded from the withdrawal anonymity set. This exclusion is crucial for maintaining the pool's integrity and ensuring that withdrawals are not tainted by association with illicit funds.

### Withdraw
- **Choosing an Anonymity Set:** Upon deciding to withdraw, the user generates a proof of inclusion within a subset of deposits that only includes legitimate funds. This subset is crucial for demonstrating compliance without sacrificing privacy. The user can choose this subset based on community-curated lists or analyses identifying clean funds.

- **Interaction with Relayers:** A third-party relayer can either be named as a filter, or be publicly available to run, and anyone can submit the withdrawal transaction to the blockchain. A relayer is responsible for ensuring compliance by verifying the legitimacy of the user-provided subset proof. A user can also execute their own withdrawal from a different address and does not need to rely on third parties.

- **Subset Proofs:** The key to the PoI system is the generation of subset proofs, which allow users to prove their deposit belongs to a clean subset without revealing their specific deposit. These subsets can be dynamically formed and chosen based on the latest information about illicit funds, enabling the community to adapt and exclude hackers' deposits. Only the subset provided at withdrawal time is available for on chain writing, but any number of proofs can be generated afterward if new information emerges or the user is required to generated proofs for other subsets.

### Key Points
- **Dynamic Anonymity Sets:** The user is not fixed to the anonymity set present at the time of deposit. As the community identifies and excludes illicit funds, users can choose from updated subsets that reflect these changes, ensuring their withdrawal is not associated with tainted funds.

### Understanding Anonymity Sets

An **anonymity set** is a group of potential signers (or depositors, in the case of a privacy pool) that could plausibly be the originator of a transaction. The larger the set, the greater the privacy, as it becomes increasingly difficult to determine which member of the set actually initiated the transaction.

### Withdrawal Process with Anonymity Sets

1. **Deposit Phase:**
   - Users deposit funds into the privacy pool by generating and sending a cryptographic commitment. This commitment is added to the pool's Merkle tree, which aggregates all commitments so that any individual can be proven to be part of the tree without revealing which one it is.

2. **Formation of Anonymity Sets:**
   - As more addresses make deposits, the size of the anonymity set (represented by the Merkle tree) grows. Each address's deposit becomes just one of many possible sources for a withdrawal.

3. **Withdrawal with Anonymity Subset:**
   - When a user wants to withdraw, they don't simply prove their deposit is part of the overall pool; they can choose a subset of the entire pool that excludes known illicit funds or includes known safe funds.
   - This is achieved by generating a zero-knowledge proof that demonstrates two things:
        a. The user’s deposit is part of the pool (and thus, they have the right to withdraw).
        b. The deposit is also part of a specified **subset** of all deposits that excludes any tainted by association with illicit activities.

### Creating and Using Anonymity Subsets

- **Subset Definition:** Anonymity subsets are defined based on certain criteria, such as excluding deposits linked to known hacks or illicit sources. This can be done through community governance, where lists of clean deposits are maintained.
- **Withdrawal Using Subsets:**
   - At withdrawal, a user selects a subset that does not include illicit funds. They generate a zero-knowledge proof showing their deposit is part of this clean subset.
   - This proof is submitted to the smart contract, which verifies it against the subset’s Merkle root (a cryptographic summary of the subset) stored on-chain. If the proof is valid, the withdrawal is processed.

**subset Merkle root** - where is it use in the code? how does it work? how is it managed? updated? where does the smart contract need it?

### Withdrawal Process and On-Chain Verification

1. **Proof Submission:** When a user decides to withdraw, they generate a zero-knowledge proof that demonstrates two things:
   - Their deposit exists within the pool and has yet to be spent.
   - Their withdrawal is part of a user defined deposit subset, which can associate and dissociate from other deposits.

2. **On-Chain Verification:** The user submits this proof to the smart contract on the Ethereum blockchain. The contract then performs several checks:
   - It verifies the zero-knowledge proof to ensure the withdrawal's validity and the subset's legitimacy.
   - It checks that the subset root provided by the user matches one of the approved subset roots. While this can represent clean subsets free of illicit funds to addresses that utilize this feature, the subset root is not verified against any on chain data and is useful for distributed storage and OffChain reference only.

3. **Transfer Execution:** If the proof passes all checks, the smart contract executes the transfer, sending the withdrawn amount to the specified recipient. The contract code automates and enforces these constraints, ensuring that only valid withdrawals are processed.

### Role of Relayers

Relayers might be mentioned or implied in systems where there's a need to help users submit transactions without requiring them to spend their own ETH for gas fees, thereby enhancing privacy or usability. In such cases, relayers receive the user's transaction data (including zero-knowledge proofs and withdrawal requests), submit it to the blockchain on their behalf, and get reimbursed for gas costs plus a fee. However, the critical parts of verifying the legitimacy of a withdrawal and executing the transfer are conducted by the smart contract on-chain.

### Off-Chain Proof

How would a user generate an off-chain proof that he used a specific set? What identifies a "legitimate anonymity set"? How long is such a set "legitimate"? Which part of such a proof is public? Which part of such a proof is private? (provide a script to generate such a proof?)

### Files
```
pools-sol
├── contracts
│   ├── IncrementalMerkleTree.sol
│   ├── PrivacyPool.sol
│   ├── PrivacyPoolFactory.sol
│   └── verifiers
│       └── ProofLib.sol
└── circuits
    ├── withdraw_from_subset.circom
    └── verifier_templates
        └── withdraw_from_subset_verifier_template.sol
```

#### PrivacyPool.sol
The PrivacyPool implementation as described above.

### PrivacyPoolFactory.sol
The factory implementation as described above.

#### ProofLib.sol
ProofLib provides essential functions for implementing and verifying zk-SNARKs (zero-knowledge succinct non-interactive arguments of knowledge) in smart contracts. It includes operations for elliptic curve arithmetic (addition, scalar multiplication, and negation) and pairing checks, critical for constructing and validating zero-knowledge proofs. 

### IncrementalMerkleTree.sol
IncrementalMerkleTree is a Merkle Tree optimized for append-only operations. It leverages a cryptographic hash function, Poseidon, for efficient and secure hashing of tree elements, implemented through the IPoseidon interface. The contract maintains a Merkle tree with a fixed number of levels (LEVELS) and a history of root hashes to support proofs of inclusion for elements added to the tree. It optimizes gas usage by hardcoding values for zero nodes at each level of the tree and implements an insert function to add new leaves while updating the tree's root hash efficiently.

#### withdraw_from_subset.circom
This Circom file defines a circuit for a privacy-preserving withdrawal from a subset using Merkle proofs, optimized for zk-SNARKs. It includes templates for hashing two nodes together (`Hash2Nodes`), a dual multiplexer (`DualMux`), and a circuit (`DoubleMerkleProof`) to verify both a leaf's inclusion in a Merkle tree and its membership in a specified subset. Additionally, it features a `CommitmentNullifierHasher` template for generating a commitment and a nullifier from a secret and metadata. The main component, `WithdrawFromSubset`, combines these functionalities to allow a user to prove they own a leaf in a Merkle tree and that the leaf meets certain conditions, without revealing the leaf's value, ensuring both withdrawal validity and privacy.

#### withdraw_from_subset_verifier_template.sol
This Solidity code defines a `WithdrawFromSubsetVerifier` smart contract that integrates with a cryptographic proof library (`ProofLib`) to verify zero-knowledge proofs (zk-SNARKs) related to a withdrawal operation from a subset. It leverages the `ProofLib` library for operations on elliptic curve points and zk-SNARK proof verification. The contract includes a placeholder for the `withdrawFromSubsetVerifyingKey` function, which should return the verifying key for the zk-SNARK proof, and an `_verifyWithdrawFromSubsetProof` function that takes the flattened proof and various public inputs as parameters. This function checks if any of the public inputs exceed the defined scalar field limit, constructs the proof and verifying key elements from the inputs, computes a dynamic element of the verifying key based on the public inputs, and finally uses a pairing-based verification function to validate the proof against the constructed verifying key elements. This contract facilitates the verification of proofs that ensure a specific withdrawal action is valid without revealing specific details about the withdrawal.
# Smart Contract - Dual Asset Lending Protocol

This directory contains the Clarity smart contracts for the dual-asset lending protocol built on Stacks.

## Project Overview

This lending protocol allows users to:
- **Lenders**: Deposit STX tokens to earn yield from interest payments
- **Borrowers**: Supply sBTC as collateral to borrow STX tokens
- **Liquidators**: Liquidate undercollateralized positions to maintain protocol health

## Technology Stack

- **Clarity 4**: Smart contract language for Stacks (latest version)
- **Clarinet**: Development and testing framework
- **Vitest**: Testing framework for contract tests
- **TypeScript**: For writing test files
- **@stacks/clarinet-sdk**: SDK for interacting with Clarinet simnet
- **@stacks/transactions**: For building Clarity values in tests (Cl.bool, Cl.uint, etc.)

## Clarity 4 Features

This project uses **Clarity 4**, which was activated at Bitcoin block 923222 (November 2025). We leverage the following Clarity 4 features:

### 1. `stacks-block-time` - Direct Block Timestamp Access
- **Used in**: Time-based interest calculations, loan expiration logic
- **Benefit**: Simplifies code by replacing helper functions with direct timestamp access
- **Location**: `lending-pool.clar` - Interest accrual and debt calculations

### 2. `contract-hash?` - On-Chain Contract Verification
- **Used in**: Verifying oracle, sBTC token, and Bitflow DEX contracts before interactions
- **Benefit**: Ensures we're interacting with the correct contract implementations
- **Location**: 
  - Oracle verification in `get-sbtc-stx-price`
  - sBTC verification in `borrow-stx` and `repay`
  - Bitflow verification in `liquidate`

### 3. `restrict-assets?` - Post-Condition Asset Protection
- **Used in**: All external contract calls to prevent unexpected asset movements
- **Benefit**: Automatic rollback if external contracts move assets beyond allowed limits
- **Location**: Wrapped around all `contract-call?` invocations

### 4. `to-ascii?` - Value to String Conversion (Future)
- **Planned for**: Enhanced error messages and debugging
- **Status**: Optional enhancement for better UX

### 5. `secp256r1-verify` - Passkey Integration (Future)
- **Planned for**: Hardware wallet and biometric authentication
- **Status**: Future enhancement for admin functions

For detailed implementation information, see [CLARITY4-IMPLEMENTATION-PLAN.md](./CLARITY4-IMPLEMENTATION-PLAN.md).

## Project Structure

```
smart-contract/
├── contracts/              # Clarity smart contract files
│   ├── lending-pool.clar  # Main lending pool contract
│   └── mock-oracle.clar   # Mock oracle for price feeds
├── tests/                  # Test files for contracts
│   ├── lending-pool.test.ts
│   └── mock-oracle.test.ts
├── settings/               # Network configuration files
│   ├── Devnet.toml        # Local development settings
│   └── Testnet.toml       # Testnet deployment settings
├── deployments/            # Deployment plans (generated)
├── Clarinet.toml          # Clarinet configuration
├── package.json           # Node.js dependencies
└── README.md             # This file
```

## Prerequisites

Before you begin, ensure you have:

- **Clarinet** installed - [Installation Guide](https://docs.hiro.so/clarinet/getting-started)
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/en/download)
- **Git** for version control

## Setup Instructions

### 1. Initialize Clarinet Project

If starting fresh, initialize a new Clarinet project:

```bash
clarinet new stacks-lending-pool
cd stacks-lending-pool
```

### 2. Add Contract Requirements

Add the required contract dependencies:

```bash
clarinet requirements add SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
clarinet requirements add SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.token-stx-v-1-2
clarinet requirements add SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-swap-helper-v-1-3
clarinet requirements add SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-sbtc-stx-v-1-1
```

### 3. Create Contracts

Create the contract files:

```bash
clarinet contract new lending-pool
clarinet contract new mock-oracle
```

### 4. Install Dependencies

Install Node.js dependencies for testing:

```bash
npm install
```

This installs:
- **@stacks/clarinet-sdk**: SDK for Clarinet simnet interactions
- **@stacks/clarinet-sdk-wasm**: WASM bindings for Clarinet
- **@stacks/transactions**: For building Clarity values in tests (Cl.bool, Cl.uint, Cl.principal, etc.)
- **vitest**: Testing framework
- **vitest-environment-clarinet**: Vitest environment for Clarinet tests

### 5. Configure Mainnet Execution Simulation (MXS)

Edit `Clarinet.toml` and update the `[repl.remote_data]` section:

```toml
[repl.remote_data]
enabled = true
api_url = 'https://api.hiro.so'
use_mainnet_wallets = true
```

This enables testing with actual mainnet contracts (like Bitflow DEX) without spending real money.

## Contract Architecture

### Mock Oracle Contract

A simple mock oracle for providing BTC/STX price data during development and testing.

**Key Functions:**
- `initialize`: Set the oracle updater address
- `update-price`: Update the BTC/STX price
- `get-price`: Read the current price
- `get-updater`: Get the updater address

### Lending Pool Contract

The main contract that handles all lending, borrowing, and liquidation logic.

**Key Functions:**

**Lending:**
- `deposit-stx`: Deposit STX to earn yield
- `withdraw-stx`: Withdraw STX + earned interest
- `get-pending-yield`: Check pending yield for a lender

**Borrowing:**
- `borrow-stx`: Borrow STX against sBTC collateral
- `repay`: Repay loan and reclaim collateral
- `get-debt`: Get total debt (principal + interest) for a borrower

**Liquidation:**
- `liquidate`: Liquidate an undercollateralized position

**Helpers:**
- `get-sbtc-stx-price`: Get price from oracle
- `accrue-interest`: Accrue interest for all lenders

## Protocol Parameters

- **LTV Percentage**: 70% - Maximum loan-to-value ratio
- **Interest Rate**: 10% annually
- **Liquidation Threshold**: 100% - When liquidation can be triggered
- **Liquidator Bounty**: 10% of collateral

## Testing

Run the test suite:

```bash
npm run test
```

Or run tests with Clarinet:

```bash
clarinet test
```

## Development Workflow

1. **Write Contracts**: Add your Clarity code in `contracts/`
2. **Write Tests**: Add test cases in `tests/`
3. **Run Tests**: Verify functionality with `npm run test`
4. **Check Syntax**: Validate contract syntax with `clarinet check`
5. **Deploy**: Generate deployment plan and deploy to testnet

## Deployment

### Mainnet Deployed Contracts

The following contracts are deployed on Stacks mainnet:
- Lending Pool (stackslend-v1): SPZYY7560YPR8BY63XNTDX36HBY1G8K0TST365B2.stackslend-v1
- Mock Oracle (mock-oracle-v1): SPZYY7560YPR8BY63XNTDX36HBY1G8K0TST365B2.mock-oracle-v1

### Testnet Deployment

1. Export your wallet mnemonic from your Stacks wallet
2. Update `settings/Testnet.toml` with your deployer account mnemonic
3. Generate deployment plan:
   ```bash
   clarinet deployments generate --testnet --low-cost
   ```
4. Deploy contract:
   ```bash
   clarinet deployment apply -p deployments/default.testnet-plan.yaml
   ```

## Key Concepts

### Interest Accrual

Interest is accrued continuously based on:
- Total borrowed STX
- Time elapsed since last accrual
- Annual interest rate (10%)

### Yield Index

Each lender has a `yield-index` that tracks when they deposited. This ensures:
- Lenders only earn interest on funds they've actually supplied
- New deposits don't retroactively earn interest from before they joined

### Liquidation Process

When a position becomes undercollateralized:
1. Liquidator triggers liquidation
2. 10% of collateral goes to liquidator as bounty
3. Remaining 90% is sold on Bitflow DEX for STX
4. STX from sale is distributed to lenders as yield
5. Borrower's debt is forfeited

## Integration Points

- **sBTC Token**: For collateral deposits
- **Bitflow DEX**: For liquidating collateral (sBTC → STX swaps)
- **Mock Oracle**: For price feeds (replace with Pyth in production)

## Resources

- [Clarity Documentation](https://docs.hiro.so/clarity)
- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [Stacks Documentation](https://docs.stacks.co)
- [Bitflow DEX](https://bitflow.finance)

## Contributing

When contributing to the smart contracts:

1. Create a feature branch
2. Write tests for your changes
3. Ensure all tests pass
4. Update documentation as needed
5. Submit a pull request

## License

[Add your license here]

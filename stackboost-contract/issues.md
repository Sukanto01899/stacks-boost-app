# Project Issues - Dual Asset Lending Protocol

This document outlines all the issues/tasks required to build the complete dual-asset lending protocol. Each issue represents a specific feature or component that needs to be implemented.

## Smart Contract Issues

### Mock Oracle Contract

#### Issue #1: Implement Mock Oracle Contract
**Priority:** High  
**Status:** Completed  
**Description:** Create the mock oracle contract for providing BTC/STX price data during development and testing.

**Tasks:**
- [x] Define error constants with specific error codes:
  - ERR_NOT_OWNER (err u100)
  - ERR_ALREADY_INITIALIZED (err u101)
  - ERR_NOT_UPDATER (err u102)
  - ERR_NOT_INITIALIZED (err u103)
- [x] Define data variables:
  - `owner` (principal) - set to `tx-sender` at deployment
  - `updater` (principal) - set to `tx-sender` initially
  - `initialized` (bool) - set to false initially
  - `btc-stx-price` (uint) - set to u0 initially
- [x] Implement `initialize` function:
  - Verify `tx-sender` equals owner
  - Check `initialized` is false
  - Set `updater` to new-updater parameter
  - Set `initialized` to true
  - Return `(ok true)`
- [x] Implement `update-price` function:
  - Verify contract is initialized
  - Verify `tx-sender` equals updater
  - Set `btc-stx-price` to new-price parameter
  - Return `(ok true)`
- [x] Implement `get-price` read-only function:
  - Return `(ok (var-get btc-stx-price))`
- [x] Implement `get-updater` read-only function:
  - Return `(var-get updater)`
- [x] Implement `is-initialized` read-only function:
  - Return `(var-get initialized)`

**Acceptance Criteria:**
- Contract can be initialized by owner only
- Only updater can update prices
- Price can be read by anyone
- All functions have proper error handling

---

#### Issue #2: Write Mock Oracle Tests
**Priority:** High  
**Status:** Completed  
**Dependencies:** Issue #1

**Tasks:**
- [x] Test initialization with correct owner and updater
- [x] Test that non-owner cannot initialize
- [x] Test that re-initialization is prevented
- [x] Test that updater can update price
- [x] Test that non-updater cannot update price
- [x] Test that price cannot be updated if not initialized
- [x] Test `get-price` returns correct value
- [x] Test `get-updater` returns correct address
- [x] Test `is-initialized` status changes correctly

**Acceptance Criteria:**
- All tests pass ✅
- Edge cases are covered ✅
- Error conditions are tested ✅

---

### Contract Requirements Setup

#### Issue #2.5: Add Contract Requirements
**Priority:** High  
**Status:** Completed  
**Description:** Add required contract dependencies for sBTC and Bitflow DEX integration.

**Tasks:**
- [x] Add sBTC token contract requirement:
  - `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`
- [x] Add STX token wrapper contract requirement:
  - `SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.token-stx-v-1-2`
- [x] Add Bitflow swap helper contract requirement:
  - `SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-swap-helper-v-1-3`
- [x] Add Bitflow sBTC-STX pool contract requirement:
  - `SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-sbtc-stx-v-1-1`

**Acceptance Criteria:**
- All contract requirements are added to Clarinet.toml
- Contracts can be called in tests and deployment

---

### Lending Pool Contract - Core Setup

#### Issue #3: Set Up Lending Pool Contract Structure
**Priority:** High  
**Status:** Completed  
**Note:** This contract uses Clarity 4 features (stacks-block-time, contract-hash?, restrict-assets?)

**Tasks:**
- [x] Define error constants with specific error codes:
  - ERR_INVALID_WITHDRAW_AMOUNT (err u100)
  - ERR_EXCEEDED_MAX_BORROW (err u101)
  - ERR_CANNOT_BE_LIQUIDATED (err u102)
  - ERR_MUST_WITHDRAW_BEFORE_NEW_DEPOSIT (err u103)
  - ERR_INVALID_ORACLE (err u104) - Clarity 4: contract-hash? verification failed
  - ERR_INVALID_SBTC_CONTRACT (err u105) - Clarity 4: contract-hash? verification failed
  - ERR_INVALID_DEX_CONTRACT (err u106) - Clarity 4: contract-hash? verification failed
- [x] Define protocol constants with specific values:
  - LTV_PERCENTAGE = u70 (70% loan-to-value ratio)
  - INTEREST_RATE_PERCENTAGE = u10 (10% annual interest rate)
  - LIQUIDATION_THRESHOLD_PERCENTAGE = u100 (100% threshold)
  - ONE_YEAR_IN_SECS = u31556952 (seconds in a year)
- [x] Define data variables with initial values:
  - `total-sbtc-collateral` (uint) - initialized to u0
  - `total-stx-deposits` (uint) - initialized to u1 (to avoid division by zero)
  - `total-stx-borrows` (uint) - initialized to u0
  - `last-interest-accrual` (uint) - initialized to `stacks-block-time` (Clarity 4 feature)
  - `cumulative-yield-bips` (uint) - initialized to u0 (yield in basis points)
- [x] Define maps with proper structure:
  - `collateral` map: key `{ user: principal }`, value `{ amount: uint }`
  - `deposits` map: key `{ user: principal }`, value `{ amount: uint, yield-index: uint }`
  - `borrows` map: key `{ user: principal }`, value `{ amount: uint, last-accrued: uint }`
- [x] Create function stubs for all public and read-only functions with proper signatures

**Acceptance Criteria:**
- All storage variables are properly defined ✅
- All function signatures are correct ✅
- Contract compiles without errors ✅
- **Tests:** ✅ **Fully tested** (27/27 tests passing)
  - 7 error constants verified
  - 4 protocol constants verified
  - 5 data variables initial values verified
  - 3 map structures verified
  - All function signatures verified and callable

---

#### Issue #4: Implement Helper Functions
**Priority:** High  
**Status:** Completed  
**Dependencies:** Issue #3

**Tasks:**
- [x] Implement `get-sbtc-stx-price` public function:
  - Verify oracle contract using `contract-hash?` (Clarity 4 security feature)
  - Wrap oracle call with `restrict-assets?` to protect contract assets (Clarity 4)
  - Call `contract-call?` on `.mock-oracle` contract's `get-price` function
  - Return the price response
- [x] Implement `accrue-interest` private function:
  - Calculate time delta: `dt = stacks-block-time - (var-get last-interest-accrual)` (Clarity 4: direct timestamp access)
  - Calculate interest numerator: `(* u10000 (* (* (var-get total-stx-borrows) INTEREST_RATE_PERCENTAGE) dt))`
  - Calculate interest denominator: `(* ONE_YEAR_IN_SECS u100)`
  - Calculate interest: `(/ interest-numerator interest-denominator)`
  - Calculate new yield in bips: `(/ interest (var-get total-stx-deposits))`
  - Update `last-interest-accrual` to `stacks-block-time` (Clarity 4: direct timestamp access)
  - Update `cumulative-yield-bips`: `(+ (var-get cumulative-yield-bips) new-yield)`
  - Return `(ok true)`

**Acceptance Criteria:**
- Helper functions work correctly
- Interest calculation is accurate
- Oracle integration works

---

### Lending Pool Contract - Lending Functions

#### Issue #5: Implement Deposit STX Function
**Priority:** High  
**Status:** Completed  
**Dependencies:** Issue #4

**Tasks:**
- [x] Load user's existing deposit from `deposits` map using `map-get?`
- [x] Check user has no existing deposits (enforce withdraw before new deposit):
  - Use `default-to u0` to get deposited amount
  - Assert deposited amount equals u0, otherwise return ERR_MUST_WITHDRAW_BEFORE_NEW_DEPOSIT
- [x] Accrue interest before deposit using `unwrap-panic (accrue-interest)`
- [x] Transfer STX from user to contract:
  - Use `stx-transfer?` with amount, tx-sender, and contract principal
- [x] Update deposits map with amount and yield-index:
  - Set amount to `(+ deposited-stx amount)` (or just `amount` if no existing deposit)
  - Set yield-index to current `(var-get cumulative-yield-bips)`
- [x] Update total-stx-deposits variable: `(+ (var-get total-stx-deposits) amount)`
- [x] Return `(ok true)`

**Acceptance Criteria:**
- Users can deposit STX successfully ✅
- Yield index is set correctly ✅
- Cannot deposit if existing position exists ✅
- Total deposits are tracked correctly ✅

---

#### Issue #6: Implement Withdraw STX Function
**Priority:** High  
**Status:** Completed (with TODO)  
**Dependencies:** Issue #5, Issue #7

**Tasks:**
- [x] Load user's deposit information from `deposits` map:
  - Get `deposited-stx` (amount)
  - Get `yield-index`
- [x] Calculate pending yield using `get-pending-yield` read-only function
- [x] Validate withdrawal amount doesn't exceed deposited amount:
  - Assert `(>= deposited-stx amount)`, otherwise return ERR_INVALID_WITHDRAW_AMOUNT
- [x] Accrue interest before withdrawal using `unwrap-panic (accrue-interest)`
- [x] Update deposits map:
  - Set amount to `(- deposited-stx amount)`
  - Update yield-index to current `(var-get cumulative-yield-bips)`
  - Delete entry for full withdrawal
- [x] Update total-stx-deposits variable: `(- (var-get total-stx-deposits) amount)`
- [ ] **TODO:** Transfer STX + pending yield to user (as-contract unavailable in current setup)

**Acceptance Criteria:**
- Users can withdraw their deposited STX ✅
- Pending yield is calculated correctly ✅
- Cannot withdraw more than deposited ✅
- Yield calculations are accurate ✅
- **Tests:** ✅ **Fully tested** (7/7 tests passing, 38 total)
  - Partial withdrawal works
  - Full withdrawal works
  - Over-withdrawal prevented
  - No-deposit withdrawal prevented
  - Yield calculation verified
  - Total-stx-deposits updated correctly
  - Multiple users can withdraw independently

**Note:** STX transfer from contract to user temporarily commented out due to `as-contract` function unavailability in current Clarity/Clarinet setup. All other logic complete and tested.

---

#### Issue #7: Implement Get Pending Yield Function
**Priority:** Medium  
**Status:** Completed  
**Dependencies:** Issue #5

**Tasks:**
- [x] Load user's deposit information from `deposits` map:
  - Get `amount-stx` using `default-to u0`
  - Get `yield-index` using `default-to u0`
- [x] Calculate delta between current cumulative-yield-bips and user's yield-index:
  - `delta = (- (var-get cumulative-yield-bips) yield-index)`
- [x] Calculate pending yield in basis points:
  - `pending-yield = (/ (* amount-stx delta) u10000)`
  - Divide by 10000 because cumulative-yield-bips is in basis points
- [x] Return `(ok pending-yield)`

**Acceptance Criteria:**
- Returns correct pending yield for lender ✅
- Handles users with no deposits (returns 0) ✅
- Calculation is accurate ✅
- **Tests:** ✅ **Fully tested** (4/4 tests passing)
  - Returns 0 for users with no deposits
  - Returns 0 for users with deposits but no yield accrued
  - Calculates correct yield after interest accrues
  - Handles multiple users with independent yield tracking

---

### Lending Pool Contract - Borrowing Functions

#### Issue #8: Implement Borrow STX Function
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #4

**Tasks:**
- [ ] Load user's existing collateral and borrow information:
  - Get `deposited-sbtc` from `collateral` map (default to u0)
  - Get `borrowed-stx` from `borrows` map (default to u0)
- [ ] Calculate new total collateral amount: `new-collateral = (+ deposited-sbtc collateral-amount)`
- [ ] Fetch current sBTC/STX price from oracle using `get-sbtc-stx-price`
- [ ] Calculate maximum borrowable amount using LTV ratio:
  - `max-borrow = (/ (* (* new-collateral price) LTV_PERCENTAGE) u100)`
- [ ] Calculate user's current debt using `get-debt` function
- [ ] Calculate new total debt: `new-debt = (+ user-debt amount-stx)`
- [ ] Validate new debt doesn't exceed max borrow:
  - Assert `(<= new-debt max-borrow)`, otherwise return ERR_EXCEEDED_MAX_BORROW
- [ ] Accrue interest using `unwrap-panic (accrue-interest)`
- [ ] Update borrows map:
  - Set amount to `new-debt`
  - Set last-accrued to `stacks-block-time` (Clarity 4: direct timestamp access)
- [ ] Update total-stx-borrows variable: `(+ (var-get total-stx-borrows) amount-stx)`
- [ ] Update collateral map: set amount to `new-collateral`
- [ ] Update total-sbtc-collateral variable: `(+ (var-get total-sbtc-collateral) collateral-amount)`
- [ ] Transfer sBTC from user to contract:
  - Verify sBTC contract using `contract-hash?` (Clarity 4 security)
  - Use `restrict-assets?` wrapper around `contract-call?` to protect assets (Clarity 4)
  - Use `contract-call?` on sBTC token contract's `transfer` function
  - Transfer `collateral-amount` from `tx-sender` to `(as-contract tx-sender)`
- [ ] Transfer STX from contract to user:
  - Use `as-contract` wrapper with `stx-transfer?`
  - Transfer `amount-stx` to user
- [ ] Return `(ok true)`

**Acceptance Criteria:**
- Users can borrow STX against sBTC collateral
- LTV ratio is enforced correctly
- Cannot borrow more than allowed
- Collateral and borrows are tracked correctly

---

#### Issue #9: Implement Repay Function
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #8

**Tasks:**
- [ ] Load user's borrow and collateral information:
  - Get `borrowed-stx` from `borrows` map (default to u0)
  - Get `deposited-sbtc` from `collateral` map (default to u0)
- [ ] Calculate total debt (principal + interest) using `get-debt` function
- [ ] Accrue interest using `unwrap-panic (accrue-interest)`
- [ ] Delete user's entry from collateral map using `map-delete`
- [ ] Update total-sbtc-collateral variable: `(- (var-get total-sbtc-collateral) deposited-sbtc)`
- [ ] Delete user's entry from borrows map using `map-delete`
- [ ] Update total-stx-borrows variable: `(- (var-get total-stx-borrows) borrowed-stx)`
- [ ] Transfer STX from user to contract (total debt amount):
  - Use `stx-transfer?` with `total-debt`, `tx-sender`, and `(as-contract tx-sender)`
- [ ] Transfer sBTC collateral back to user:
  - Use `contract-call?` on sBTC token contract's `transfer` function
  - Transfer `deposited-sbtc` from `(as-contract tx-sender)` to `tx-sender`
- [ ] Return `(ok true)`

**Acceptance Criteria:**
- Users can repay their loan in full
- Interest is included in repayment
- Collateral is returned to user
- All mappings are cleaned up correctly

---

#### Issue #10: Implement Get Debt Function
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #8

**Tasks:**
- [ ] Load user's borrow information from `borrows` map:
  - Get `borrowed-stx` (amount) using `default-to u0`
  - Get `last-accrued` (timestamp) using `default-to u0`
- [ ] Get current timestamp using `stacks-block-time` (Clarity 4: direct timestamp access)
- [ ] Calculate time delta since last accrual: `dt = (- stacks-block-time last-accrued)`
- [ ] Calculate interest:
  - `interest-numerator = (* borrowed-stx INTEREST_RATE_PERCENTAGE dt)`
  - `interest-denominator = (* ONE_YEAR_IN_SECS u100)`
  - `interest = (/ interest-numerator interest-denominator)`
- [ ] Calculate total debt: `accrued-interest = (+ borrowed-stx interest)`
- [ ] Return `(ok accrued-interest)`

**Acceptance Criteria:**
- Returns correct debt including interest
- Handles users with no borrows (returns 0)
- Interest calculation is accurate

---

### Lending Pool Contract - Liquidation

#### Issue #11: Implement Liquidate Function
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #8, Issue #4

**Tasks:**
- [ ] Load user's debt using `get-debt` function
- [ ] Calculate forfeited borrows amount:
  - If `user-debt > total-stx-borrows`, use `total-stx-borrows`
  - Otherwise, use `user-debt`
- [ ] Load user's collateral from `collateral` map (get `deposited-sbtc`)
- [ ] Fetch current sBTC/STX price from oracle using `get-sbtc-stx-price`
- [ ] Calculate collateral value in STX: `collateral-value-in-stx = (* deposited-sbtc price)`
- [ ] Calculate liquidator bounty (10% of collateral): `liquidator-bounty = (/ (* deposited-sbtc u10) u100)`
- [ ] Calculate pool reward (90% of collateral): `pool-reward = (- deposited-sbtc liquidator-bounty)`
- [ ] Verify sBTC and Bitflow DEX contracts using `contract-hash?` (Clarity 4 security)
- [ ] Get contract's sBTC balance using `contract-call?` on sBTC token's `get-balance` (wrapped with `restrict-assets?`)
- [ ] Set up Bitflow DEX parameters:
  - `xyk-tokens` tuple: `{ a: sbtc-token-contract, b: token-stx-contract }`
  - `xyk-pools` tuple: `{ a: xyk-pool-sbtc-stx-contract }`
- [ ] Get quote for sBTC to STX swap using `contract-call?` on `xyk-swap-helper`'s `get-quote-a` (wrapped with `restrict-assets?`)
- [ ] Accrue interest using `unwrap-panic (accrue-interest)`
- [ ] Validate user has debt: assert `(> user-debt u0)`, otherwise return ERR_CANNOT_BE_LIQUIDATED
- [ ] Validate liquidation threshold is met:
  - Assert `(<= (* collateral-value-in-stx u100) (* user-debt LIQUIDATION_THRESHOLD_PERCENTAGE))`
  - Otherwise return ERR_CANNOT_BE_LIQUIDATED
- [ ] Update total-sbtc-collateral: `(- (var-get total-sbtc-collateral) deposited-sbtc)`
- [ ] Update total-stx-borrows: `(- (var-get total-stx-borrows) forfeited-borrows)`
- [ ] Delete user's entries from `borrows` and `collateral` maps using `map-delete`
- [ ] Transfer liquidator bounty (sBTC) to liquidator:
  - Use `restrict-assets?` wrapper to protect contract assets (Clarity 4)
  - Use `contract-call?` on sBTC token's `transfer`
  - Transfer `(+ pool-reward liquidator-bounty)` to `tx-sender` (liquidator)
- [ ] Execute swap on Bitflow DEX (sBTC to STX):
  - Use `restrict-assets?` wrapper to protect contract assets (Clarity 4)
  - Use `contract-call?` on `xyk-swap-helper`'s `swap-helper-a`
  - Swap `pool-reward` amount of sBTC for STX
  - Note: Bitflow sends STX to `tx-sender` (liquidator), so we need to transfer it back
- [ ] Transfer received STX back to contract:
  - Use `stx-transfer?` from liquidator (`tx-sender`) back to `(as-contract tx-sender)`
- [ ] Update cumulative-yield-bips with profit:
  - Calculate profit: `(- received-stx forfeited-borrows)`
  - Add to cumulative yield: `(+ (var-get cumulative-yield-bips) (/ (* profit u10000) (var-get total-stx-deposits)))`
- [ ] Return `(ok true)`

**Acceptance Criteria:**
- Liquidators can liquidate eligible positions
- Liquidation threshold is enforced
- Liquidator receives 10% bounty
- Remaining collateral is swapped for STX
- Lenders receive yield from liquidation
- All mappings are cleaned up

---

### Lending Pool Contract - Testing

#### Issue #12: Set Up Testing Environment
**Priority:** High  
**Status:** Pending

**Tasks:**
- [ ] Install testing dependencies:
  - `npm install --save-dev @hirosystems/clarinet-sdk-wasm vite`
- [ ] Configure Clarinet.toml for Mainnet Execution Simulation (MXS):
  - Set `[repl.remote_data]` section:
    - `enabled = true`
    - `api_url = 'https://api.hiro.so'`
    - `use_mainnet_wallets = true`
  - This enables testing with actual mainnet contracts (Bitflow DEX) without spending real money
- [ ] Create test helper functions:
  - `mintSBTC(amount, recipient)` - mints sBTC using `protocol-mint-many-iter` on sBTC contract
  - `mintSTX(amount, recipient)` - mints STX using `simnet.transferSTX`
  - `initializeOracle()` - initializes mock oracle with updater address
  - `updateOracle(price)` - updates oracle price
  - `getTotalDeposits()` - reads `total-stx-deposits` data var
  - `getTotalBorrows()` - reads `total-stx-borrows` data var
  - `getTotalCollateral()` - reads `total-sbtc-collateral` data var
  - `getUserDebt(user)` - calls `get-debt` read-only function
  - `getPendingYield(user)` - calls `get-pending-yield` read-only function
  - `getSBTCBalance(user)` - calls sBTC token's `get-balance` function
- [ ] Set up beforeEach hooks:
  - Initialize oracle
  - Mint sBTC to borrower (e.g., 100_000_000 = 1 BTC)
  - Mint STX to lender (e.g., 100_000_000)
- [ ] Create utility functions for reading contract state using `simnet.getDataVar` and `simnet.callReadOnlyFn`

**Acceptance Criteria:**
- Test environment is properly configured
- MXS is enabled for Bitflow integration
- Helper functions work correctly

---

#### Issue #13: Write Lending Pool Basic Tests
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #12, Issue #5, Issue #8

**Tasks:**
- [ ] Test lenders can deposit STX:
  - Call `deposit-stx` with amount
  - Verify result is `(ok true)`
  - Verify `total-stx-deposits` increases correctly (note: starts at u1)
- [ ] Test borrowers can borrow STX within LTV ratio:
  - Set oracle price (e.g., 1 BTC = 10 STX)
  - Lender deposits STX first
  - Borrower supplies sBTC collateral and borrows within 70% LTV
  - Verify borrow succeeds
- [ ] Test borrowers cannot borrow STX outside LTV ratio:
  - Set oracle price
  - Lender deposits STX
  - Borrower tries to borrow more than 70% LTV allows
  - Verify borrow fails with ERR_EXCEEDED_MAX_BORROW
- [ ] Test interest accrual over time:
  - Use `simnet.mineEmptyBlocks(150)` to simulate ~1 day passing
  - Verify debt increases with interest
  - Verify interest calculation is accurate
- [ ] Test yield calculation for lenders:
  - Verify `get-pending-yield` returns correct amount
  - Verify yield increases over time
  - Verify yield calculation uses basis points correctly

**Acceptance Criteria:**
- All basic functionality tests pass
- Edge cases are covered

---

#### Issue #14: Write Lending Pool Integration Tests
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #13, Issue #6, Issue #9

**Tasks:**
- [ ] Test complete lending flow (deposit → earn yield → withdraw):
  - Lender deposits STX
  - Simulate time passing with `simnet.mineEmptyBlocks`
  - Lender withdraws STX + earned yield
  - Verify correct amounts are transferred
- [ ] Test complete borrowing flow (borrow → repay → reclaim collateral):
  - Borrower supplies sBTC collateral and borrows STX
  - Borrower repays loan with interest
  - Verify sBTC collateral is returned
  - Verify all mappings are cleaned up
- [ ] Test borrower can borrow and repay with interest:
  - Borrower borrows STX
  - Simulate time passing (e.g., 150 blocks ≈ 1 day)
  - Verify debt includes interest (should be > borrowed amount)
  - Borrower repays full debt
  - Verify interest is included in repayment
- [ ] Test lender earns yield from borrower interest:
  - Lender deposits STX
  - Borrower borrows STX
  - Simulate time passing
  - Borrower repays with interest
  - Verify lender's pending yield increases
  - Verify yield calculation is accurate
- [ ] Test multiple lenders and borrowers:
  - Multiple lenders deposit STX
  - Multiple borrowers borrow STX
  - Verify yield is distributed correctly among lenders
  - Verify all positions are tracked independently

**Acceptance Criteria:**
- End-to-end flows work correctly
- Interest and yield calculations are accurate
- Multiple users can interact simultaneously

---

#### Issue #15: Write Liquidation Tests
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #14, Issue #11

**Tasks:**
- [ ] Test liquidation when price drops below threshold:
  - Borrower borrows STX against sBTC collateral
  - Update oracle price to drop sBTC value (e.g., from 10 STX to 5 STX per BTC)
  - Verify liquidation threshold is met (collateral value <= debt * 100%)
  - Liquidator triggers liquidation
  - Verify liquidation succeeds
- [ ] Test liquidator receives bounty:
  - After liquidation, verify liquidator receives 10% of sBTC collateral
  - Verify sBTC balance of liquidator increases correctly
- [ ] Test lenders receive yield from liquidation:
  - After liquidation, verify `cumulative-yield-bips` increases
  - Verify lenders can withdraw with increased yield
  - Verify profit from liquidation (STX received - debt forfeited) is distributed
- [ ] Test liquidation cannot happen if threshold not met:
  - Borrower borrows STX
  - Price hasn't dropped enough
  - Verify liquidation fails with ERR_CANNOT_BE_LIQUIDATED
- [ ] Test liquidation with Bitflow DEX integration:
  - Verify swap on Bitflow DEX executes correctly
  - Verify STX is received from swap
  - Verify STX is transferred back to contract from liquidator
  - Verify sBTC to STX conversion works properly
- [ ] Test multiple liquidations:
  - Multiple borrowers with liquidatable positions
  - Liquidate multiple positions
  - Verify all liquidations work correctly
  - Verify cumulative yield updates correctly

**Acceptance Criteria:**
- Liquidation works correctly
- Bitflow integration functions properly
- All parties receive correct amounts

---

# Project Issues - Dual Asset Lending Protocol

This document outlines all the issues/tasks required to build the complete dual-asset lending protocol. Each issue represents a specific feature or component that needs to be implemented.


## Frontend Issues

### Setup and Configuration

#### Issue #16: Initialize Next.js Project
**Priority:** High  
**Status:** In Progress

**Tasks:**
- [x] Create Next.js project with TypeScript, ESLint, Tailwind
- [ ] Configure TypeScript path aliases (@/*)
- [x] Install Stacks dependencies (@stacks/connect, @stacks/transactions)
- [ ] Install UI dependencies (lucide-react)
- [ ] Set up environment variables structure
- [x] Configure Tailwind CSS

**Acceptance Criteria:**
- Project structure is set up correctly
- All dependencies are installed
- Development server runs successfully

---

### Core Components

#### Issue #17: Implement Wallet Connection Hook
**Priority:** High  
**Status:** Completed  
**Dependencies:** Issue #16

**Tasks:**
- [x] Create `use-stacks.ts` hook
- [x] Implement wallet connection function
- [x] Implement wallet disconnection function
- [x] Handle user session state
- [x] Handle pending sign-in flow
- [x] Store user data in state

**Acceptance Criteria:**
- Users can connect/disconnect wallets
- Session persists across page reloads
- Works with Leather and Xverse wallets

---

#### Issue #18: Implement Navbar Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #17

**Tasks:**
- [ ] Create navbar component with wallet connection button
- [ ] Display connected wallet address (abbreviated)
- [ ] Add network switcher (mainnet/testnet)
- [ ] Add navigation links
- [ ] Add search bar for addresses
- [ ] Style with Tailwind CSS

**Acceptance Criteria:**
- Navbar displays correctly
- Wallet connection works
- Navigation is functional

---

#### Issue #19: Implement Root Layout
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #18

**Tasks:**
- [ ] Update `app/layout.tsx` to include Navbar
- [ ] Set up global styles
- [ ] Configure metadata
- [ ] Ensure Navbar is visible on all pages

**Acceptance Criteria:**
- Layout is consistent across pages
- Navbar is always visible

---

### Utility Functions

#### Issue #20: Implement STX Utility Functions
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #16

**Tasks:**
- [ ] Create `stx-utils.ts` file
- [ ] Implement `abbreviateAddress` function
- [ ] Implement `abbreviateTxnId` function
- [ ] Add proper TypeScript types

**Acceptance Criteria:**
- Addresses and transaction IDs are abbreviated correctly
- Functions handle edge cases

---

#### Issue #21: Implement Transaction History Fetching
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #16

**Tasks:**
- [ ] Create `fetch-address-transactions.ts` file
- [ ] Define TypeScript interfaces for transactions
- [ ] Implement `fetchAddressTransactions` function
- [ ] Handle pagination (offset, limit)
- [ ] Integrate with Hiro's API

**Acceptance Criteria:**
- Transaction history can be fetched
- Pagination works correctly
- All transaction types are handled

---

### Lending Interface

#### Issue #22: Implement Deposit Form Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #17, Issue #23

**Tasks:**
- [ ] Create `deposit-form.tsx` component
- [ ] Add amount input field
- [ ] Display current STX balance
- [ ] Add deposit button
- [ ] Implement contract interaction
- [ ] Handle transaction submission
- [ ] Show loading states
- [ ] Display success/error messages

**Acceptance Criteria:**
- Users can deposit STX successfully
- Form validation works
- Transaction feedback is clear

---

#### Issue #23: Implement Lending Pool Contract Interactions
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #17

**Tasks:**
- [ ] Create `lending-pool.ts` utility file
- [ ] Implement function to read contract state:
  - Read `total-stx-deposits`, `total-stx-borrows`, `total-sbtc-collateral`
  - Read user's deposit information (amount, yield-index)
  - Read user's borrow information (amount, last-accrued)
  - Read user's collateral amount
- [ ] Implement function to call `deposit-stx`:
  - Build contract call with amount parameter
  - Handle STX transfer in transaction
  - Return transaction result
- [ ] Implement function to call `withdraw-stx`:
  - Build contract call with amount parameter
  - Handle STX transfer in transaction
  - Return transaction result
- [ ] Implement function to call `get-pending-yield`:
  - Read-only function call
  - Parse and return yield amount
- [ ] Implement function to call `borrow-stx`:
  - Build contract call with collateral-amount and amount-stx parameters
  - Handle sBTC transfer approval/call
  - Return transaction result
- [ ] Implement function to call `repay`:
  - Build contract call (no parameters)
  - Handle STX transfer in transaction
  - Return transaction result
- [ ] Implement function to call `get-debt`:
  - Read-only function call with user principal
  - Parse and return debt amount
- [ ] Implement function to call `liquidate`:
  - Build contract call with user principal parameter
  - Handle sBTC and STX transfers
  - Return transaction result
- [ ] Handle contract call errors:
  - Map Clarity error codes to user-friendly messages
  - Handle network errors
  - Handle transaction failures
- [ ] Add TypeScript types:
  - Types for contract state
  - Types for function parameters and returns
  - Types for error responses

**Acceptance Criteria:**
- Contract interactions work correctly
- Errors are handled properly
- Functions are type-safe

---

#### Issue #24: Implement Withdraw Form Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #22, Issue #23

**Tasks:**
- [ ] Create `withdraw-form.tsx` component
- [ ] Display deposited amount
- [ ] Display pending yield
- [ ] Add amount input field
- [ ] Add withdraw button
- [ ] Implement contract interaction
- [ ] Handle transaction submission
- [ ] Show loading states

**Acceptance Criteria:**
- Users can withdraw STX + yield
- Pending yield is displayed correctly
- Withdrawal works as expected

---

### Borrowing Interface

#### Issue #25: Implement Borrow Form Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #23, Issue #26

**Tasks:**
- [ ] Create `borrow-form.tsx` component
- [ ] Display sBTC balance:
  - Fetch user's sBTC balance from sBTC token contract
  - Display balance in readable format
- [ ] Add collateral amount input:
  - Input field for sBTC collateral amount
  - Validate amount doesn't exceed balance
  - Show balance below input
- [ ] Add borrow amount input:
  - Input field for STX borrow amount
  - Auto-calculate max borrowable based on LTV (70%)
  - Show max borrowable amount
- [ ] Display maximum borrowable amount:
  - Calculate: `(collateral * price * 70) / 100`
  - Account for existing debt if user has open position
  - Update dynamically as user types
- [ ] Display current LTV ratio:
  - Show LTV percentage
  - Show health factor/risk indicator
  - Warn if approaching liquidation threshold
- [ ] Add borrow button:
  - Disable if inputs invalid
  - Disable if exceeds max borrow
  - Show loading state during transaction
- [ ] Implement contract interaction:
  - Call `borrow-stx` with collateral-amount and amount-stx
  - Handle sBTC token transfer approval
  - Handle transaction signing
- [ ] Handle transaction submission:
  - Show transaction pending state
  - Wait for confirmation
  - Show success/error messages
- [ ] Show loading states:
  - Loading while fetching balances
  - Loading during transaction
  - Loading while calculating max borrow

**Acceptance Criteria:**
- Users can borrow STX against sBTC
- LTV calculations are displayed
- Borrowing works correctly

---

#### Issue #26: Implement Oracle Price Fetching
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #17

**Tasks:**
- [ ] Create `oracle.ts` utility file
- [ ] Implement function to read oracle price:
  - Call `get-price` read-only function on mock-oracle contract
  - Parse price as uint
  - Return price value (sBTC/STX ratio)
- [ ] Handle price updates:
  - Poll for price updates periodically (optional)
  - Refresh price on user action
  - Cache price with timestamp
- [ ] Add error handling:
  - Handle contract read errors
  - Handle uninitialized oracle
  - Provide fallback/default price
- [ ] Add TypeScript types:
  - Type for price value
  - Type for oracle state
- [ ] Display price in UI:
  - Format price for display (e.g., "1 sBTC = X STX")
  - Show price update timestamp
  - Indicate if price is stale

**Acceptance Criteria:**
- Oracle price can be fetched
- Price updates are handled
- Errors are caught

---

#### Issue #27: Implement Repay Form Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #23, Issue #25

**Tasks:**
- [ ] Create `repay-form.tsx` component
- [ ] Display current debt (principal + interest)
- [ ] Display collateral amount
- [ ] Add repay button
- [ ] Implement contract interaction
- [ ] Handle transaction submission
- [ ] Show loading states
- [ ] Display success message

**Acceptance Criteria:**
- Users can repay their loans
- Debt amount is accurate
- Collateral is returned

---

### Liquidation Interface

#### Issue #28: Implement Liquidate Form Component
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #23, Issue #29

**Tasks:**
- [ ] Create `liquidate-form.tsx` component
- [ ] Display list of liquidatable positions:
  - Fetch all borrower positions from contract
  - Filter positions where liquidation threshold is met
  - Show empty state if no liquidatable positions
- [ ] Show position details for each position:
  - Borrower address
  - Current debt (principal + interest)
  - Collateral amount (sBTC)
  - Collateral value in STX
  - Current LTV ratio
  - Health factor
  - Estimated liquidation bounty (10% of collateral)
- [ ] Add liquidate button for each position:
  - Disable if position not liquidatable
  - Show estimated rewards
  - Confirm before liquidation
- [ ] Implement contract interaction:
  - Call `liquidate` function with borrower principal
  - Handle sBTC and STX transfers
  - Handle Bitflow DEX swap (happens in contract)
- [ ] Handle transaction submission:
  - Show transaction pending state
  - Wait for confirmation
  - Show success/error messages
- [ ] Show loading states:
  - Loading while fetching positions
  - Loading during liquidation transaction
- [ ] Display liquidation rewards:
  - Show sBTC bounty received
  - Show estimated STX from swap (if available)
  - Update after successful liquidation

**Acceptance Criteria:**
- Liquidators can see eligible positions
- Liquidation can be triggered
- Rewards are displayed

---

#### Issue #29: Implement Position List Component
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #23

**Tasks:**
- [ ] Create `position-list.tsx` component
- [ ] Fetch all open positions from contract
- [ ] Display position cards
- [ ] Show position health metrics
- [ ] Filter liquidatable positions
- [ ] Add pagination if needed

**Acceptance Criteria:**
- All positions are displayed
- Health metrics are accurate
- Liquidatable positions are highlighted

---

### Dashboard

#### Issue #30: Implement Dashboard Page
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #22, Issue #24, Issue #25, Issue #27

**Tasks:**
- [ ] Create dashboard page layout
- [ ] Display user's lending position
- [ ] Display user's borrowing position
- [ ] Show total deposited STX
- [ ] Show total borrowed STX
- [ ] Show total collateral (sBTC)
- [ ] Show current debt
- [ ] Show pending yield
- [ ] Show health factor / LTV ratio
- [ ] Add quick action buttons

**Acceptance Criteria:**
- Dashboard displays all user data
- Metrics are accurate
- Quick actions work

---

#### Issue #31: Implement Position Card Component
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #23

**Tasks:**
- [ ] Create `position-card.tsx` component
- [ ] Display position type (lending/borrowing)
- [ ] Show key metrics
- [ ] Add action buttons
- [ ] Style with Tailwind CSS
- [ ] Make responsive

**Acceptance Criteria:**
- Position cards display correctly
- Information is clear
- Actions are accessible

---

### Transaction History

#### Issue #32: Implement Transaction History Page
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #21

**Tasks:**
- [ ] Create `[address]/page.tsx` for dynamic routes
- [ ] Fetch transaction history
- [ ] Display transaction list
- [ ] Add pagination (Load More button)
- [ ] Filter by transaction type
- [ ] Link to Stacks Explorer

**Acceptance Criteria:**
- Transaction history displays correctly
- Pagination works
- Filters function properly

---

#### Issue #33: Implement Transaction Detail Component
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #21

**Tasks:**
- [ ] Create `txn-details.tsx` component
- [ ] Display transaction information
- [ ] Show transaction type with icon
- [ ] Display sender/recipient addresses
- [ ] Show transaction amount
- [ ] Display block height and timestamp
- [ ] Link to transaction on explorer

**Acceptance Criteria:**
- Transaction details are clear
- All information is displayed
- Links work correctly

---

#### Issue #34: Implement Transaction List Component
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #33

**Tasks:**
- [ ] Create `txns-list.tsx` component
- [ ] Display list of transactions
- [ ] Implement Load More functionality
- [ ] Handle pagination state
- [ ] Show loading states

**Acceptance Criteria:**
- Transaction list displays correctly
- Load More works
- Pagination is smooth

---

### Home Page

#### Issue #35: Implement Home Page
**Priority:** Medium  
**Status:** Pending  
**Dependencies:** Issue #17

**Tasks:**
- [ ] Create home page layout
- [ ] Add welcome message
- [ ] Prompt wallet connection if not connected
- [ ] Redirect to dashboard if connected
- [ ] Add project description
- [ ] Style with Tailwind CSS

**Acceptance Criteria:**
- Home page displays correctly
- Wallet connection prompt works
- Redirects function properly

---

## Integration and Testing

#### Issue #36: End-to-End Testing
**Priority:** High  
**Status:** Pending  
**Dependencies:** All frontend and smart contract issues

**Tasks:**
- [ ] Test complete user flows
- [ ] Test wallet connection on different networks
- [ ] Test all contract interactions
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Cross-browser testing

**Acceptance Criteria:**
- All user flows work correctly
- No critical bugs
- Error handling is robust

---

#### Issue #37: Documentation
**Priority:** Medium  
**Status:** Pending

**Tasks:**
- [ ] Write user documentation
- [ ] Create deployment guide
- [ ] Document API/contract interfaces
- [ ] Add code comments
- [ ] Create contribution guide

**Acceptance Criteria:**
- Documentation is complete
- Examples are provided
- Contribution process is clear

---

## Deployment

#### Issue #38: Deploy Smart Contracts to Testnet
**Priority:** High  
**Status:** Pending  
**Dependencies:** All smart contract issues

**Tasks:**
- [ ] Configure Testnet.toml with deployer mnemonic
- [ ] Generate deployment plan
- [ ] Deploy mock-oracle contract
- [ ] Deploy lending-pool contract
- [ ] Initialize oracle
- [ ] Verify contracts on explorer
- [ ] Test deployed contracts

**Acceptance Criteria:**
- Contracts are deployed successfully
- Contracts are verified
- All functions work on testnet

---

#### Issue #39: Deploy Frontend to Production
**Priority:** High  
**Status:** Pending  
**Dependencies:** Issue #38, All frontend issues

**Tasks:**
- [ ] Configure environment variables
- [ ] Build production bundle
- [ ] Deploy to Vercel/Netlify
- [ ] Configure custom domain (optional)
- [ ] Test production deployment
- [ ] Set up monitoring

**Acceptance Criteria:**
- Frontend is deployed successfully
- All features work in production
- Performance is acceptable

---

## Future Enhancements

#### Issue #40: Replace Mock Oracle with Pyth
**Priority:** Low  
**Status:** Pending

**Tasks:**
- [ ] Research Pyth integration
- [ ] Update `get-sbtc-stx-price` function
- [ ] Test with Pyth price feeds
- [ ] Update documentation

---

#### Issue #41: Add Multi-Asset Support
**Priority:** Low  
**Status:** Pending

**Tasks:**
- [ ] Design multi-asset architecture
- [ ] Update contract to support multiple collateral types
- [ ] Update frontend to handle multiple assets
- [ ] Add asset selection UI

---

#### Issue #42: Add Advanced Analytics
**Priority:** Low  
**Status:** Pending

**Tasks:**
- [ ] Add charts for interest rates
- [ ] Display historical data
- [ ] Add APY/APR calculations
- [ ] Show protocol statistics

---

## Notes

- Issues are organized by component and priority
- Dependencies should be resolved before starting dependent issues
- High priority issues should be completed first
- Each issue should have tests written before marking as complete
- Code reviews should be done for all pull requests

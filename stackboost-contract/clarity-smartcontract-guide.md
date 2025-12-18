# Clarity Smart Contract Development Guide

A comprehensive guide for writing Clarity smart contracts on Stacks, based on building a token streaming protocol.

## Table of Contents

1. [Setting Up Your Development Environment](#setting-up-your-development-environment)
2. [Scaffolding a New Contract](#scaffolding-a-new-contract)
3. [Understanding Clarity Basics](#understanding-clarity-basics)
4. [Contract Structure](#contract-structure)
5. [Common Patterns and Examples](#common-patterns-and-examples)
6. [Testing Your Contracts](#testing-your-contracts)
7. [Deploying Your Contract](#deploying-your-contract)

---

## Setting Up Your Development Environment

### Prerequisites

- Node.js (v18+ recommended)
- Git
- A Stacks-compatible wallet (Leather)
- Clarinet (see installation instructions below)

### Installing Clarinet on Linux (Manual Binary Install)

If the automatic installer or npm package is not available in your environment, you can install Clarinet manually from the released binaries.

1. Download the Linux binary:
   - Go to the official Clarinet releases page:  
     `https://github.com/hirosystems/clarinet/releases`
   - Under **Assets**, download the file:
     - `clarinet-linux-x64-glibc.tar.gz` (recommended for Ubuntu/Debian Pop!_OS and other glibc-based distros)

2. Extract the archive:

   ```bash
   cd ~/Downloads
   tar -xzf clarinet-linux-x64-glibc.tar.gz
   ```

   This should produce a `clarinet` binary in the current directory.

3. Move the binary into your local bin directory and make it executable:

   ```bash
   mkdir -p ~/.local/bin
   mv clarinet ~/.local/bin/clarinet
   chmod +x ~/.local/bin/clarinet
   ```

4. Add `~/.local/bin` to your PATH (so you can run `clarinet` from anywhere):

   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

5. Verify the installation:

   ```bash
   clarinet --version
   ```

   You should see output similar to:

   ```text
   clarinet 3.11.0
   ```

Once Clarinet is installed and available on your PATH, you can run commands like:

- `clarinet check`
- `clarinet console`
- `clarinet deployments generate ...`
- `clarinet deployment apply ...`

1. **Verify Installed Clarinet** - A toolkit for writing, testing, and deploying Clarity smart contracts
   - Follow the installation guide: https://docs.hiro.so/clarinet/getting-started
   - Verify installation: `clarinet --version`

2. **Install Node.js** - Required for running tests
   - Download from: https://nodejs.org/en/download
   - Verify installation: `node --version`

3. **Install VSCode Extension (Recommended)**
   - Install the "Clarity" extension for syntax highlighting, autocomplete, and IntelliSense

### Initialize a New Project

```bash
# Create a new Clarinet project
clarinet new my-project-name

# Navigate to the project directory
cd my-project-name

# Install npm dependencies for testing
npm install
```

This creates a project structure:
```
my-project-name/
├── contracts/          # Your Clarity contracts (.clar files)
├── tests/              # Test files (.ts files)
├── settings/           # Configuration files
├── deployments/        # Deployment plans
├── Clarinet.toml       # Project configuration
└── package.json        # Node.js dependencies
```

---

## Scaffolding a New Contract

### Create a New Contract

```bash
# Inside your project directory
clarinet contract new stream
```

This creates:
- `contracts/stream.clar` - An empty contract file
- Updates `Clarinet.toml` with contract configuration

### Project Configuration (Clarinet.toml)

```toml
[project]
name = 'my-project'
description = 'My Clarity project'
authors = []

[contracts.stream]
path = 'contracts/stream.clar'
clarity_version = 3
epoch = 'latest'
```

---

## Understanding Clarity Basics

### Key Concepts

**Clarity is:**
- A decidable language (you can determine what a program will do before execution)
- Interpreted (not compiled)
- Designed for smart contracts on Stacks blockchain
- Type-safe and secure by design

**Important Notes:**
- No loops (use `map`, `filter`, `fold` instead)
- No recursion
- No reentrancy (functions cannot call themselves)
- All variables are immutable by default

---

## Contract Structure

### 1. Error Constants

Define error codes at the top of your contract:

```clarity
;; Error codes
(define-constant ERR_UNAUTHORIZED (err u0))
(define-constant ERR_INVALID_SIGNATURE (err u1))
(define-constant ERR_STREAM_STILL_ACTIVE (err u2))
(define-constant ERR_INVALID_STREAM_ID (err u3))
```

**Usage:**
```clarity
(asserts! (is-eq contract-caller sender) ERR_UNAUTHORIZED)
```

### 2. Data Variables

Store single values that can be read/written:

```clarity
;; Define a data variable
(define-data-var latest-stream-id uint u0)

;; Read a variable
(var-get latest-stream-id)

;; Write a variable
(var-set latest-stream-id (+ current-id u1))
```

**Common Types:**
- `uint` - Unsigned integer
- `int` - Signed integer
- `bool` - Boolean (true/false)
- `principal` - Stacks address
- `buff` - Buffer (byte array)
- `(optional <type>)` - Optional value
- `(list <length> <type>)` - List
- `(tuple ...)` - Tuple/struct

### 3. Maps

Store key-value pairs:

```clarity
;; Define a map
(define-map streams
  uint                    ;; Key type: stream-id
  {                       ;; Value type: tuple
    sender: principal,
    recipient: principal,
    balance: uint,
    withdrawn-balance: uint,
    payment-per-block: uint,
    timeframe: (tuple (start-block uint) (stop-block uint))
  }
)

;; Write to map
(map-set streams stream-id stream-data)

;; Read from map (returns optional)
(map-get? streams stream-id)

;; Example: Unwrap with error handling
(let ((stream (unwrap! (map-get? streams stream-id) ERR_INVALID_STREAM_ID)))
  ;; Use stream here
)
```

### 4. Functions

#### Public Functions
Can be called by anyone and can modify state:

```clarity
(define-public (create-stream
    (recipient principal)
    (initial-balance uint)
    (timeframe (tuple (start-block uint) (stop-block uint)))
    (payment-per-block uint)
  )
  (let (
    (stream {
      sender: contract-caller,
      recipient: recipient,
      balance: initial-balance,
      withdrawn-balance: u0,
      payment-per-block: payment-per-block,
      timeframe: timeframe
    })
    (current-stream-id (var-get latest-stream-id))
  )
    ;; Transfer STX tokens
    (try! (stx-transfer? initial-balance contract-caller (as-contract tx-sender)))
    
    ;; Store stream
    (map-set streams current-stream-id stream)
    
    ;; Update counter
    (var-set latest-stream-id (+ current-stream-id u1))
    
    ;; Return success
    (ok current-stream-id)
  )
)
```

#### Read-Only Functions
Cannot modify state, can be called without a transaction:

```clarity
(define-read-only (balance-of
    (stream-id uint)
    (who principal)
  )
  (let (
    (stream (unwrap! (map-get? streams stream-id) u0))
    (block-delta (calculate-block-delta (get timeframe stream)))
    (recipient-balance (* block-delta (get payment-per-block stream)))
  )
    (if (is-eq who (get recipient stream))
      (- recipient-balance (get withdrawn-balance stream))
      u0
    )
  )
)
```

#### Private Functions
Internal helper functions:

```clarity
(define-private (calculate-block-delta
    (timeframe (tuple (start-block uint) (stop-block uint)))
  )
  (let (
    (start-block (get start-block timeframe))
    (stop-block (get stop-block timeframe))
  )
    (if (<= block-height start-block)
      u0
      (if (< block-height stop-block)
        (- block-height start-block)
        (- stop-block start-block)
      )
    )
  )
)
```

---

## Common Patterns and Examples

### 1. Authorization Pattern

Check if caller is authorized:

```clarity
(define-public (withdraw (stream-id uint))
  (let (
    (stream (unwrap! (map-get? streams stream-id) ERR_INVALID_STREAM_ID))
  )
    ;; Assert caller is the recipient
    (asserts! (is-eq contract-caller (get recipient stream)) ERR_UNAUTHORIZED)
    
    ;; Continue with withdrawal logic...
    (ok true)
  )
)
```

**Key Variables:**
- `contract-caller` - The principal calling the function
- `tx-sender` - The transaction sender (usually same as contract-caller)
- `as-contract tx-sender` - The contract's own principal

### 2. Token Transfer Pattern

#### Transferring STX Tokens

```clarity
;; Transfer FROM user TO contract
(stx-transfer? amount contract-caller (as-contract tx-sender))

;; Transfer FROM contract TO user
(as-contract (stx-transfer? amount tx-sender recipient))
```

**Important:** Use `as-contract` when the contract is sending tokens.

#### Transferring SIP-010 Tokens

```clarity
;; Call token contract's transfer function
(contract-call? token-contract transfer 
  amount 
  (as-contract tx-sender)  ;; sender (contract)
  recipient                ;; recipient
  none                     ;; memo (optional)
)
```

### 3. Error Handling Pattern

```clarity
;; Using try! - unwraps ok or returns err
(try! (stx-transfer? amount sender recipient))

;; Using unwrap! - unwraps ok or panics with error
(let ((stream (unwrap! (map-get? streams id) ERR_INVALID_STREAM_ID)))
  ;; Use stream
)

;; Using unwrap-panic - unwraps ok or panics
(let ((value (unwrap-panic (map-get? streams id))))
  ;; Use value
)

;; Using asserts! - throws error if condition is false
(asserts! (is-eq caller owner) ERR_UNAUTHORIZED)
```

### 4. Working with Tuples

```clarity
;; Create a tuple
(let ((stream {
  sender: contract-caller,
  recipient: recipient,
  balance: u100
}))

;; Access tuple fields
(get sender stream)
(get balance stream)

;; Update tuple fields (creates new tuple)
(merge stream {balance: (+ (get balance stream) u50)})
```

### 5. Working with Lists

```clarity
;; Create a list
(define-data-var signers (list 100 principal) (list))

;; Check if element exists
(index-of signers principal-to-check)

;; Get element at index
(element-at signers index)

;; List length
(len signers)

;; Append to list
(append signers new-signer)
```

### 6. Signature Verification Pattern

```clarity
;; Hash data for signing
(define-read-only (hash-stream
    (stream-id uint)
    (new-payment-per-block uint)
    (new-timeframe (tuple (start-block uint) (stop-block uint)))
  )
  (let (
    (stream (unwrap! (map-get? streams stream-id) (sha256 0)))
    (msg (concat 
      (concat 
        (unwrap-panic (to-consensus-buff? stream)) 
        (unwrap-panic (to-consensus-buff? new-payment-per-block))
      ) 
      (unwrap-panic (to-consensus-buff? new-timeframe))
    ))
  )
    (sha256 msg)
  )
)

;; Verify signature
(define-read-only (validate-signature 
    (hash (buff 32)) 
    (signature (buff 65)) 
    (signer principal)
  )
  (is-eq 
    (principal-of? (unwrap! (secp256k1-recover? hash signature) false)) 
    (ok signer)
  )
)
```

### 7. Block Height and Time

```clarity
;; Current block height
block-height

;; Check if stream is active
(if (and 
      (>= block-height start-block)
      (< block-height stop-block)
    )
  ;; Stream is active
  true
  ;; Stream is not active
  false
)
```

### 8. Conditional Logic

```clarity
;; Simple if
(if condition
  true-value
  false-value
)

;; Nested if
(if condition1
  value1
  (if condition2
    value2
    value3
  )
)

;; Using and/or
(and condition1 condition2)
(or condition1 condition2)
```

### 9. Arithmetic Operations

```clarity
;; Addition
(+ a b)

;; Subtraction
(- a b)

;; Multiplication
(* a b)

;; Division
(/ a b)

;; Modulo
(mod a b)

;; Comparison
(> a b)
(< a b)
(>= a b)
(<= a b)
(is-eq a b)
```

### 10. Using `let` Blocks

Create temporary variables for cleaner code:

```clarity
(define-public (example-function (id uint))
  (let (
    ;; Define temporary variables
    (stream (unwrap! (map-get? streams id) ERR_INVALID_STREAM_ID))
    (balance (get balance stream))
    (sender (get sender stream))
  )
    ;; Use variables here
    (if (is-eq contract-caller sender)
      (ok balance)
      (err ERR_UNAUTHORIZED)
    )
  )
)
```

---

## Testing Your Contracts

### Test File Structure

Create test files in `tests/` directory:

```typescript
import { Cl, cvToValue } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

// Get test accounts from simnet
const accounts = simnet.getAccounts();
const sender = accounts.get("wallet_1")!;
const recipient = accounts.get("wallet_2")!;

describe("test token streaming contract", () => {
  // Setup before each test
  beforeEach(() => {
    // Create a stream for testing
    const result = simnet.callPublicFn(
      "stream",
      "stream-to",
      [
        Cl.principal(recipient),
        Cl.uint(5),
        Cl.tuple({ "start-block": Cl.uint(0), "stop-block": Cl.uint(5) }),
        Cl.uint(1),
      ],
      sender
    );
    
    expect(result.events[0].event).toBe("stx_transfer_event");
  });

  it("ensures contract is initialized properly", () => {
    const latestStreamId = simnet.getDataVar("stream", "latest-stream-id");
    expect(latestStreamId).toBeUint(1);
  });

  it("ensures recipient can withdraw tokens", () => {
    const result = simnet.callPublicFn(
      "stream",
      "withdraw",
      [Cl.uint(0)],
      recipient
    );
    
    expect(result.events[0].event).toBe("stx_transfer_event");
    expect(result.events[0].data.amount).toBe("3");
  });
});
```

### Common Test Patterns

#### Testing Public Functions

```typescript
const result = simnet.callPublicFn(
  "contract-name",      // Contract name
  "function-name",      // Function name
  [                     // Arguments array
    Cl.uint(0),
    Cl.principal(recipient)
  ],
  sender                // Caller principal
);

// Check result
expect(result.result).toBeOk(Cl.uint(1));

// Check for errors
expect(result.result).toBeErr(Cl.uint(0)); // ERR_UNAUTHORIZED
```

#### Testing Read-Only Functions

```typescript
const result = simnet.callReadOnlyFn(
  "contract-name",
  "read-only-function",
  [Cl.uint(0)],
  sender
);

expect(result.result).toBeUint(100);
```

#### Reading Storage

```typescript
// Read data variable
const value = simnet.getDataVar("contract-name", "variable-name");
expect(value).toBeUint(5);

// Read map entry
const entry = simnet.getMapEntry(
  "contract-name",
  "map-name",
  Cl.uint(0)  // Key
);
expect(entry).toBeSome(Cl.tuple({...}));
```

#### Testing Events

```typescript
expect(result.events[0].event).toBe("stx_transfer_event");
expect(result.events[0].data.amount).toBe("100");
expect(result.events[0].data.sender).toBe(sender);
```

#### Mining Blocks

```typescript
// Mine empty blocks to advance time
simnet.mineEmptyBlock();
simnet.mineEmptyBlock();
```

#### Testing Signatures

```typescript
import { signMessageHashRsv, createStacksPrivateKey } from "@stacks/transactions";

// Get hash from contract
const hashResult = simnet.callReadOnlyFn(
  "stream",
  "hash-stream",
  [Cl.uint(0), Cl.uint(1), Cl.tuple({...})],
  sender
);

const hashAsHex = Buffer.from(hashResult.result.buffer).toString("hex");

// Sign the hash
const signature = signMessageHashRsv({
  messageHash: hashAsHex,
  privateKey: createStacksPrivateKey("your-private-key-hex"),
});

// Use signature in test
const result = simnet.callPublicFn(
  "stream",
  "update-details",
  [
    Cl.uint(0),
    Cl.uint(1),
    Cl.tuple({...}),
    Cl.principal(sender),
    Cl.bufferFromHex(signature.data),
  ],
  recipient
);
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:report
```

---

## Deploying Your Contract

### 1. Set Up Stacks Wallet

1. Download and install [Leather Wallet](https://leather.io/)
2. Create an account
3. Switch to **Testnet** (important!)
4. Copy your testnet Stacks address
5. Get testnet STX from [LearnWeb3 Faucet](https://learnweb3.io/faucet) or [Stacks Faucet](https://explorer.stacks.co/sandbox/faucet)

### 2. Configure Deployment

Edit `settings/Testnet.toml`:

```toml
[accounts.deployer]
mnemonic = "your twelve word mnemonic phrase goes here"
```

### 3. Generate Deployment Plan

```bash
clarinet deployments generate --testnet --low-cost

```

This creates a deployment plan in `deployments/default.testnet-plan.yaml`.

### 4. Deploy Contract

```bash
clarinet deployment apply -p deployments/default.testnet-plan.yaml
```

Confirm the deployment when prompted (press `Y`).

### 5. Verify Deployment

- Check the success message for your contract address
- Look up your contract on [Stacks Testnet Explorer](https://explorer.stacks.co/?chain=testnet)
- Interact with your contract using the explorer or a wallet

---

## Best Practices

### 1. Security

- Always validate inputs
- Check authorization before state changes
- Use `asserts!` for important checks
- Handle errors explicitly
- Never trust external data

### 2. Code Organization

- Define constants at the top
- Group related functions together
- Use descriptive names
- Add comments for complex logic
- Keep functions focused and small

### 3. Testing

- Test happy paths
- Test error cases
- Test edge cases
- Test authorization
- Test with different accounts

### 4. Gas Optimization

- Minimize storage writes
- Use read-only functions when possible
- Batch operations when feasible
- Avoid unnecessary computations

---

## Common Gotchas

1. **`contract-caller` vs `tx-sender`**
   - `contract-caller` - Who called the function
   - `tx-sender` - Transaction originator
   - Use `as-contract tx-sender` to get contract address

2. **Optional Types**
   - Always handle `none` cases
   - Use `unwrap!` or `unwrap-panic` carefully
   - Check with `is-some` or `is-none`

3. **Map Reads Return Optional**
   - `map-get?` returns `(some value)` or `none`
   - Always unwrap or check before using

4. **No Loops**
   - Use `map`, `filter`, `fold` for iteration
   - Use recursion is not allowed

5. **Immutability**
   - Variables are immutable
   - Use `var-set` to update data variables
   - Use `map-set` to update maps

---

## Resources

- [Clarity Language Documentation](https://docs.stacks.co/docs/clarity)
- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Examples](https://github.com/stacksgov/clarity-examples)
- [Stacks Explorer](https://explorer.stacks.co)

---

## Example: Complete Contract Structure

```clarity
;; ============================================
;; Error Constants
;; ============================================
(define-constant ERR_UNAUTHORIZED (err u0))
(define-constant ERR_INVALID_ID (err u1))

;; ============================================
;; Data Variables
;; ============================================
(define-data-var counter uint u0)

;; ============================================
;; Maps
;; ============================================
(define-map items
  uint
  {
    owner: principal,
    value: uint
  }
)

;; ============================================
;; Read-Only Functions
;; ============================================
(define-read-only (get-counter)
  (var-get counter)
)

;; ============================================
;; Public Functions
;; ============================================
(define-public (create-item (value uint))
  (let (
    (id (var-get counter))
    (item {
      owner: contract-caller,
      value: value
    })
  )
    (map-set items id item)
    (var-set counter (+ id u1))
    (ok id)
  )
)

(define-public (update-item (id uint) (new-value uint))
  (let (
    (item (unwrap! (map-get? items id) ERR_INVALID_ID))
  )
    (asserts! (is-eq contract-caller (get owner item)) ERR_UNAUTHORIZED)
    (map-set items id (merge item {value: new-value}))
    (ok true)
  )
)
```

---

Happy coding! 🚀

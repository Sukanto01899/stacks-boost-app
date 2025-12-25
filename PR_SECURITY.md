# Pull Request: Security Improvements - Post Conditions

## Problem
Aplikacja używa `PostConditionMode.Allow` we wszystkich transakcjach, co oznacza brak walidacji transferów. To potencjalne zagrożenie bezpieczeństwa.

## Rozwiązanie
Dodanie prawidłowych post-conditions do wszystkich transakcji kontraktowych.

---

## Changes

### File: `app/components/stx-actions.tsx`

**Import post-condition utilities:**
```typescript
import {
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  FungibleConditionCode,
  PostConditionMode,
} from "@stacks/transactions";
```

**Update deposit transaction:**
```typescript
// BEFORE:
await openContractCall({
  contractAddress: STACKS_CONTRACT_ADDRESS,
  contractName: STACKS_CONTRACT_NAME,
  functionName: "deposit-stx",
  functionArgs: args,
  network: activeNetwork,
  appDetails: STACKS_APP_DETAILS,
  postConditionMode: PostConditionMode.Allow, // UNSAFE!
  onFinish: (data) => { /* ... */ },
  onCancel: () => { /* ... */ },
});

// AFTER:
const stxAddress = activeWallet === "stacks" ? stacks.stxAddress : walletConnect.stxAddress;

const postConditions = action === "deposit" && parsedAmount
  ? [
      makeStandardSTXPostCondition(
        stxAddress!,
        FungibleConditionCode.Equal,
        parsedAmount
      ),
    ]
  : [];

await openContractCall({
  contractAddress: STACKS_CONTRACT_ADDRESS,
  contractName: STACKS_CONTRACT_NAME,
  functionName: "deposit-stx",
  functionArgs: args,
  network: activeNetwork,
  appDetails: STACKS_APP_DETAILS,
  postConditions, // SAFE!
  postConditionMode: PostConditionMode.Deny, // Fail if post-conditions not met
  onFinish: (data) => { /* ... */ },
  onCancel: () => { /* ... */ },
});
```

**Add post-conditions for all actions:**
```typescript
const buildPostConditions = (
  action: ActionType,
  stxAddress: string,
  amount?: bigint,
  borrowAmount?: bigint,
  collateralAmount?: bigint
) => {
  switch (action) {
    case "deposit":
      // User sends STX to contract
      return amount
        ? [
            makeStandardSTXPostCondition(
              stxAddress,
              FungibleConditionCode.Equal,
              amount
            ),
          ]
        : [];

    case "withdraw":
      // Contract sends STX to user
      return amount
        ? [
            makeContractSTXPostCondition(
              STACKS_CONTRACT_ADDRESS,
              STACKS_CONTRACT_NAME,
              FungibleConditionCode.Equal,
              amount
            ),
          ]
        : [];

    case "borrow":
      // Contract sends STX to user (borrowed amount)
      return borrowAmount
        ? [
            makeContractSTXPostCondition(
              STACKS_CONTRACT_ADDRESS,
              STACKS_CONTRACT_NAME,
              FungibleConditionCode.Equal,
              borrowAmount
            ),
          ]
        : [];

    case "repay":
      // User sends STX to contract (borrowed + interest)
      // Note: We can't know exact amount with interest beforehand
      // So we use GreaterOrEqual for safety
      const borrowData = borrowedBalance ?? 0n;
      return borrowData > 0n
        ? [
            makeStandardSTXPostCondition(
              stxAddress,
              FungibleConditionCode.GreaterOrEqual,
              borrowData
            ),
          ]
        : [];

    default:
      return [];
  }
};

// Use in submit:
const postConditions = buildPostConditions(
  action,
  stxAddress!,
  parsedAmount,
  parsedBorrowAmount,
  parsedCollateralAmount
);

await openContractCall({
  // ...
  postConditions,
  postConditionMode: PostConditionMode.Deny,
  // ...
});
```

---

## Additional Security: Rate Limiting

### File: `middleware.ts` (new)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

function getRateLimitKey(request: NextRequest): string {
  return request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(key);

  if (!record || now > record.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request);
    
    if (!checkRateLimit(key)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Environment Variables Validation

### File: `lib/env-validation.ts` (new)

```typescript
/**
 * Validates required environment variables at startup
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_STACKS_NETWORK',
    'NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS',
    'NEXT_PUBLIC_STACKS_CONTRACT_NAME',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please create a .env.local file with these variables.`
    );
  }

  // Validate contract address format
  const address = process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS!;
  if (!address.startsWith('SP') && !address.startsWith('ST')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS: ${address}\n` +
      `Must start with SP (mainnet) or ST (testnet)`
    );
  }

  // Validate network
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK!.toLowerCase();
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error(
      `Invalid NEXT_PUBLIC_STACKS_NETWORK: ${network}\n` +
      `Must be 'mainnet' or 'testnet'`
    );
  }

  console.log('✅ Environment variables validated');
}
```

Use in `app/layout.tsx`:
```typescript
import { validateEnv } from '@/lib/env-validation';

// Validate on server startup
if (typeof window === 'undefined') {
  validateEnv();
}
```

---

## Input Sanitization

### File: `lib/input-sanitization.ts` (new)

```typescript
/**
 * Sanitizes and validates Stacks addresses
 */
export function sanitizeStacksAddress(address: string): string | null {
  const trimmed = address.trim();
  
  // Validate format
  if (!/^(SP|ST)[0-9A-Z]{38,41}$/.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Sanitizes and validates STX amounts
 */
export function sanitizeStxAmount(amount: string): bigint | null {
  const trimmed = amount.trim();
  
  // Remove any non-numeric characters except decimal point
  const cleaned = trimmed.replace(/[^0-9.]/g, '');
  
  // Validate format
  if (!/^\d+(\.\d{0,6})?$/.test(cleaned)) {
    return null;
  }
  
  const value = parseFloat(cleaned);
  
  // Check bounds
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    return null;
  }
  
  // Convert to microSTX
  return BigInt(Math.floor(value * 1_000_000));
}

/**
 * Sanitizes memo text
 */
export function sanitizeMemo(memo: string): string {
  // Remove any control characters
  const cleaned = memo.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length to 34 bytes (Clarity string limit)
  return cleaned.slice(0, 34);
}
```

Use in forms:
```typescript
const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const sanitized = sanitizeStxAmount(e.target.value);
  if (sanitized !== null) {
    setAmount(sanitized.toString());
  }
};
```

---

## Contract Address Verification

### File: `lib/contract-verification.ts` (new)

```typescript
import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';
import { STACKS_NETWORK_INSTANCE, STACKS_CONTRACT_ADDRESS, STACKS_CONTRACT_NAME } from './stacks-config';

/**
 * Verifies that the contract exists and is accessible
 */
export async function verifyContract(): Promise<boolean> {
  try {
    // Try to read a public variable from the contract
    const result = await callReadOnlyFunction({
      network: STACKS_NETWORK_INSTANCE,
      contractAddress: STACKS_CONTRACT_ADDRESS,
      contractName: STACKS_CONTRACT_NAME,
      functionName: 'get-total-deposits',
      functionArgs: [],
      senderAddress: STACKS_CONTRACT_ADDRESS,
    });

    return result !== null;
  } catch (error) {
    console.error('Contract verification failed:', error);
    return false;
  }
}

/**
 * Hook to verify contract on mount
 */
export function useContractVerification() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    verifyContract().then(setIsVerified);
  }, []);

  return isVerified;
}
```

Use in `app-shell.tsx`:
```typescript
import { useContractVerification } from '@/lib/contract-verification';

export function AppShell() {
  const isContractVerified = useContractVerification();

  if (isContractVerified === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Contract Verification Failed
          </h1>
          <p className="text-gray-400">
            Unable to connect to the lending pool contract.
            <br />
            Please check your network settings.
          </p>
        </div>
      </div>
    );
  }

  if (isContractVerified === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // ... rest of component
}
```

---

## Summary

### Security Improvements:
1. ✅ Post-conditions for all transactions (prevents unexpected transfers)
2. ✅ Rate limiting for API routes (prevents abuse)
3. ✅ Environment variable validation (catches configuration errors early)
4. ✅ Input sanitization (prevents injection attacks)
5. ✅ Contract verification (ensures contract is accessible)

### Files Changed:
- `app/components/stx-actions.tsx` - Add post-conditions
- `middleware.ts` - Add rate limiting
- `lib/env-validation.ts` - Environment validation
- `lib/input-sanitization.ts` - Input sanitization utilities
- `lib/contract-verification.ts` - Contract verification
- `app/components/app-shell.tsx` - Contract verification UI

### Testing:
1. Test each transaction type with post-conditions
2. Verify rate limiting with rapid requests
3. Test with invalid environment variables
4. Test input sanitization with malicious inputs
5. Test contract verification with invalid addresses

---

## Risk Assessment

| Risk | Before | After |
|------|--------|-------|
| Unexpected token transfers | High | Low |
| API abuse | High | Low |
| Configuration errors | Medium | Low |
| Injection attacks | Medium | Low |
| Contract unavailability | No detection | Detected early |

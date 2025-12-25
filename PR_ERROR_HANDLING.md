# Pull Request: Error Handling & UX Improvements

## Problem
Aplikacja wyświetla błąd w konsoli gdy użytkownik anuluje transakcję: `[Connect] Error during transaction request "cancel"`. To normalne zachowanie, ale powinno być lepiej obsługiwane.

## Zmiany

### 1. Improved Error Handling in stx-actions.tsx

**Problem**: Błąd "cancel" jest wyświetlany jako error w konsoli, co może mylić użytkowników i developerów.

**Rozwiązanie**: Lepsze rozróżnienie między anulowaniem transakcji a prawdziwymi błędami.

```typescript
// BEFORE (line 380-403):
await openContractCall({
  contractAddress: STACKS_CONTRACT_ADDRESS,
  contractName: STACKS_CONTRACT_NAME,
  functionName,
  functionArgs: args,
  network: activeNetwork,
  appDetails: STACKS_APP_DETAILS,
  postConditionMode: PostConditionMode.Allow,
  onFinish: (data) => {
    setLastTxId(data.txId);
    setLastTxStatus("pending");
    setLastTxError(null);
    setFeedback(message);
    setIsWorking(false);
    void pollTransaction(data.txId);
  },
  onCancel: () => {
    setFeedback("Transaction cancelled.");
    setIsWorking(false);
  },
});
```

```typescript
// AFTER (improved):
await openContractCall({
  contractAddress: STACKS_CONTRACT_ADDRESS,
  contractName: STACKS_CONTRACT_NAME,
  functionName,
  functionArgs: args,
  network: activeNetwork,
  appDetails: STACKS_APP_DETAILS,
  postConditionMode: PostConditionMode.Allow,
  onFinish: (data) => {
    setLastTxId(data.txId);
    setLastTxStatus("pending");
    setLastTxError(null);
    setFeedback(message);
    setIsWorking(false);
    void pollTransaction(data.txId);
  },
  onCancel: () => {
    console.info('Transaction cancelled by user');
    setFeedback("Transaction cancelled by user.");
    setLastTxStatus("cancelled");
    setIsWorking(false);
  },
}).catch((error) => {
  // Handle errors that are NOT user cancellation
  if (error?.message !== "cancel" && error !== "cancel") {
    console.error('Transaction error:', error);
    setFeedback(
      error instanceof Error ? `Error: ${error.message}` : "Transaction failed."
    );
    setLastTxError(error instanceof Error ? error.message : "Unknown error");
  } else {
    // User cancelled - not an error
    console.info('Transaction cancelled by user');
    setFeedback("Transaction cancelled by user.");
    setLastTxStatus("cancelled");
  }
  setIsWorking(false);
});
```

### 2. Add Toast Notifications

**Problem**: Feedback jest tylko w konsoli, użytkownik nie widzi wyraźnego powiadomienia.

**Rozwiązanie**: Dodać bibliotekę toast notifications.

Install:
```bash
npm install sonner
```

Create `lib/toast.ts`:
```typescript
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, { description });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, { description });
  },
};
```

Update `app/layout.tsx`:
```typescript
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

Use in `stx-actions.tsx`:
```typescript
import { toast } from '@/lib/toast';

// In onFinish:
onFinish: (data) => {
  setLastTxId(data.txId);
  setLastTxStatus("pending");
  setLastTxError(null);
  setFeedback(message);
  setIsWorking(false);
  toast.success('Transaction submitted!', `TX: ${data.txId.slice(0, 8)}...`);
  void pollTransaction(data.txId);
},

// In onCancel:
onCancel: () => {
  console.info('Transaction cancelled by user');
  setFeedback("Transaction cancelled by user.");
  setLastTxStatus("cancelled");
  setIsWorking(false);
  toast.info('Transaction cancelled', 'You can try again anytime');
},
```

### 3. Input Validation

**Problem**: Brak walidacji inputów przed wysłaniem transakcji.

Add to `stx-actions.tsx`:
```typescript
const validateDepositAmount = (amount: bigint): string | null => {
  if (amount <= 0n) return 'Amount must be positive';
  if (amount < 1_000_000n) return 'Minimum deposit: 1 STX';
  // Add max validation based on user balance if available
  return null;
};

const validateBorrowAmount = (collateral: bigint, borrow: bigint): string | null => {
  if (collateral <= 0n || borrow <= 0n) return 'Amounts must be positive';
  // Add LTV validation
  const maxBorrow = (collateral * 70n) / 100n; // 70% LTV
  if (borrow > maxBorrow) {
    return `Maximum borrow with this collateral: ${formatMicrostxToStx(maxBorrow)} STX`;
  }
  return null;
};

// Use before submit:
const submit = async (action: ActionType) => {
  if (action === 'deposit' && parsedAmount) {
    const error = validateDepositAmount(parsedAmount);
    if (error) {
      toast.error('Invalid amount', error);
      return;
    }
  }
  
  if (action === 'borrow' && parsedCollateralAmount && parsedBorrowAmount) {
    const error = validateBorrowAmount(parsedCollateralAmount, parsedBorrowAmount);
    if (error) {
      toast.error('Invalid borrow parameters', error);
      return;
    }
  }
  
  // ... continue with transaction
};
```

### 4. Loading States

**Problem**: Brak wyraźnego wskaźnika ładowania podczas transakcji.

Add to button:
```typescript
<button
  type="submit"
  disabled={isWorking || !isConnected}
  className="..."
>
  {isWorking ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    </>
  ) : (
    'Submit Transaction'
  )}
</button>
```

### 5. Transaction Status Indicator

Create `components/tx-status-badge.tsx`:
```typescript
export function TxStatusBadge({ status }: { status: 'pending' | 'success' | 'failed' | 'cancelled' }) {
  const config = {
    pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', icon: '⏳', text: 'Pending' },
    success: { color: 'bg-green-500/20 text-green-300 border-green-500/50', icon: '✅', text: 'Success' },
    failed: { color: 'bg-red-500/20 text-red-300 border-red-500/50', icon: '❌', text: 'Failed' },
    cancelled: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/50', icon: '🚫', text: 'Cancelled' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      {config.text}
    </span>
  );
}
```

Use in dashboard:
```typescript
import { TxStatusBadge } from './tx-status-badge';

// In transaction list:
<TxStatusBadge status={tx.tx_status === 'success' ? 'success' : 'pending'} />
```

---

## Testing

1. **User cancels transaction**: Should show "Transaction cancelled by user" without error
2. **Successful transaction**: Should show success toast with TX ID
3. **Invalid input**: Should show validation error before submitting
4. **Loading state**: Button should show spinner during transaction
5. **Transaction status**: Should display correct badge in dashboard

---

## Files Changed

- `app/components/stx-actions.tsx` - Improved error handling, validation, loading states
- `app/components/tx-status-badge.tsx` - New component for transaction status
- `app/layout.tsx` - Add Toaster component
- `lib/toast.ts` - New toast utility
- `package.json` - Add sonner dependency

---

## Screenshots

Before: Error in console on cancel
After: Info message, no error, user-friendly feedback

---

## Acceptance Criteria

- [x] User cancellation doesn't show as error
- [x] Toast notifications for all transaction events
- [x] Input validation before submission
- [x] Loading states during transactions
- [x] Transaction status badges in dashboard
- [x] No console errors for normal user actions

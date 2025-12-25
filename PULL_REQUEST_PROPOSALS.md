# Pull Request Proposals for Stacks Boost

## Analiza projektu

Projekt **Stacks Boost** to aplikacja lending pool (pożyczki) na blockchainie Stacks z następującymi komponentami:
- **Smart kontrakty Clarity** (lending-pool, mock-oracle, sbtc-deposit-dummy)
- **Frontend Next.js 16** z React 19, Tailwind CSS 4
- **Dual wallet support**: WalletConnect + Leather/Xverse
- **Hiro Chainhooks** do streamowania zdarzeń kontraktowych

### Status projektu:
✅ **Backend (Smart Contracts)**: W pełni zaimplementowane i przetestowane (16/16 testów przechodzi)
⚠️ **Frontend**: Podstawowa struktura gotowa, brakuje pełnej integracji z kontraktami

---

## 🔧 PR #1: Fix CRLF Line Endings in Clarity Contracts

**Typ**: Bug Fix  
**Priorytet**: 🔴 Wysoki (Blokuje testy)  
**Pliki**: `stackboost-contract/contracts/*.clar`

### Problem
Pliki `.clar` zawierają końce linii CRLF (Windows), co powoduje błędy podczas testów:
```
error: unsupported line-ending '\r', only '\n' is supported
```

### Rozwiązanie
Konwersja wszystkich plików `.clar` na końce linii LF (Unix):
- `contracts/lending-pool.clar`
- `contracts/mock-oracle.clar`
- `contracts/sbtc-deposit-dummy.clar`

### Rezultat
✅ Wszystkie testy przechodzą (16/16)
✅ Zgodność z Clarity compiler

### Implementacja
```bash
# Konwersja wykonana przy pomocy PowerShell
Get-ChildItem *.clar | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
}
```

---

## 🚀 PR #2: Complete Lending Pool Contract Interactions (Frontend)

**Typ**: Feature  
**Priorytet**: 🔴 Wysoki  
**Pliki**: `stacks-boost-frontend/lib/lending-pool.ts` (nowy), komponenty

### Brakujące funkcjonalności według issues.md:

#### Issue #23: Contract Interactions (In Progress)
- [ ] Utworzenie `lib/lending-pool.ts` z funkcjami:
  - `depositSTX(amount: bigint)` - wpłata STX do lending pool
  - `withdrawSTX(amount: bigint)` - wypłata STX z lending pool
  - `borrowSTX(collateralAmount: bigint, borrowAmount: bigint)` - pożyczka STX z zabezpieczeniem sBTC
  - `repayBorrow()` - spłata pożyczki
  - `liquidate(userPrincipal: string)` - likwidacja pozycji
  - `getUserDeposit(address: string)` - odczyt wpłaty użytkownika
  - `getUserBorrow(address: string)` - odczyt pożyczki użytkownika
  - `getPendingYield(address: string)` - odczyt oczekującego yield

#### Przykładowa implementacja `depositSTX`:
```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV, PostConditionMode } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

export async function depositSTX(amount: bigint, userAddress: string) {
  return openContractCall({
    network: new StacksMainnet(),
    contractAddress: process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS!,
    contractName: 'lending-pool',
    functionName: 'deposit-stx',
    functionArgs: [uintCV(amount)],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Deposit TX:', data.txId);
      return data;
    },
  });
}
```

### Typy TypeScript do dodania:
```typescript
export type UserDeposit = {
  amount: bigint;
  yieldIndex: bigint;
};

export type UserBorrow = {
  amount: bigint;
  collateralAmount: bigint;
  lastAccrued: bigint;
};

export type PoolStats = {
  totalStxDeposits: bigint;
  totalStxBorrows: bigint;
  totalSbtcCollateral: bigint;
  cumulativeYieldBips: bigint;
};
```

---

## 🎨 PR #3: Enhanced UI/UX Improvements

**Typ**: Enhancement  
**Priorytet**: 🟡 Średni  
**Pliki**: Komponenty frontend

### Propozycje ulepszeń:

#### 1. Loading States
Dodaj spinners/skeleton podczas ładowania danych z blockchainu:
```tsx
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-8 bg-white/10 rounded mb-2"></div>
    <div className="h-4 bg-white/5 rounded w-3/4"></div>
  </div>
) : (
  <div>{data}</div>
)}
```

#### 2. Toast Notifications
Implementacja powiadomień dla transakcji:
```typescript
// Użyj react-hot-toast lub podobnej biblioteki
toast.success('Transaction submitted!', {
  description: `TX ID: ${txId.slice(0, 8)}...`,
});
```

#### 3. Error Handling
Mapowanie błędów Clarity na user-friendly komunikaty:
```typescript
const errorMessages: Record<number, string> = {
  100: 'Invalid withdrawal amount',
  101: 'Maximum borrow limit exceeded',
  102: 'Position cannot be liquidated',
  107: 'Unauthorized access',
  108: 'Contract is paused',
};

function getErrorMessage(errorCode: number): string {
  return errorMessages[errorCode] || 'Unknown error occurred';
}
```

#### 4. Real-time Balance Updates
Dodaj polling lub WebSocket do aktualizacji sald:
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    if (address) {
      const deposit = await getUserDeposit(address);
      setUserDeposit(deposit);
    }
  }, 10000); // co 10 sekund
  
  return () => clearInterval(interval);
}, [address]);
```

---

## 📊 PR #4: Dashboard Analytics & History

**Typ**: Feature  
**Priorytet**: 🟢 Niski (Nice to have)  
**Pliki**: `app/components/dashboard-panel.tsx`, nowe komponenty

### Funkcjonalności:

#### 1. Transaction History Table
```tsx
<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Amount</th>
      <th>Time</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {transactions.map(tx => (
      <tr key={tx.id}>
        <td>{tx.type}</td>
        <td>{formatAmount(tx.amount)} STX</td>
        <td>{formatTime(tx.timestamp)}</td>
        <td><StatusBadge status={tx.status} /></td>
      </tr>
    ))}
  </tbody>
</table>
```

#### 2. Charts & Visualizations
- APY history chart (Recharts lub similar)
- Collateralization ratio gauge
- Pool utilization donut chart

#### 3. Chainhooks Integration Enhancement
Rozbudowa `/api/chainhooks/events` o filtrowanie i paginację:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('address');
  const eventType = searchParams.get('type'); // deposit, borrow, etc.
  const page = parseInt(searchParams.get('page') || '1');
  
  // Filter and return paginated events
}
```

---

## 🔒 PR #5: Security & Validation Enhancements

**Typ**: Security  
**Priorytet**: 🔴 Wysoki  
**Pliki**: Frontend validation, Contract interactions

### Implementacje:

#### 1. Input Validation
```typescript
function validateDepositAmount(amount: bigint, userBalance: bigint): string | null {
  if (amount <= 0n) return 'Amount must be positive';
  if (amount > userBalance) return 'Insufficient balance';
  if (amount < 1_000_000n) return 'Minimum deposit: 1 STX';
  return null;
}
```

#### 2. Post Conditions
Dodaj post-conditions do wszystkich contract calls:
```typescript
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';

const postConditions = [
  makeStandardSTXPostCondition(
    userAddress,
    FungibleConditionCode.Equal,
    amount
  )
];

await openContractCall({
  // ...
  postConditions,
  postConditionMode: PostConditionMode.Deny,
});
```

#### 3. Rate Limiting
Implementacja rate limiting dla API routes:
```typescript
// middleware.ts
const limiter = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = limiter.get(ip);
  
  if (!record || now > record.resetAt) {
    limiter.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
```

---

## 🧪 PR #6: E2E Testing Suite

**Typ**: Testing  
**Priorytet**: 🟡 Średni  
**Pliki**: `tests/e2e/*.spec.ts` (nowe)

### Framework: Playwright

#### Setup:
```bash
cd stacks-boost-frontend
npm install -D @playwright/test
npx playwright install
```

#### Test scenarios:
```typescript
// tests/e2e/deposit.spec.ts
import { test, expect } from '@playwright/test';

test('User can deposit STX', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Connect wallet
  await page.click('button:has-text("Connect Wallet")');
  // ... wallet connection flow
  
  // Navigate to deposit
  await page.click('button:has-text("Deposit")');
  
  // Fill amount
  await page.fill('input[name="amount"]', '10');
  
  // Submit
  await page.click('button:has-text("Deposit STX")');
  
  // Wait for confirmation
  await expect(page.locator('text=Transaction submitted')).toBeVisible();
});
```

---

## 📱 PR #7: Responsive Mobile Optimization

**Typ**: Enhancement  
**Priorytet**: 🟡 Średni  
**Pliki**: Wszystkie komponenty UI

### Zmiany:

#### 1. Mobile Navigation
```tsx
// Hamburger menu dla mobile
<div className="lg:hidden">
  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
    <MenuIcon />
  </button>
</div>

{mobileMenuOpen && (
  <div className="fixed inset-0 bg-black/90 z-50">
    {/* Mobile menu content */}
  </div>
)}
```

#### 2. Touch-friendly Buttons
```css
/* Większe touch targets dla mobile */
@media (max-width: 768px) {
  button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

#### 3. Simplified Mobile Layout
```tsx
<div className="grid gap-6 lg:grid-cols-[240px_1fr]">
  {/* Na mobile: stack vertically, na desktop: side by side */}
</div>
```

---

## 🌐 PR #8: Internationalization (i18n)

**Typ**: Feature  
**Priorytet**: 🟢 Niski  
**Pliki**: `lib/i18n/`, wszystkie komponenty

### Framework: next-intl

```typescript
// messages/en.json
{
  "wallet": {
    "connect": "Connect Wallet",
    "disconnect": "Disconnect",
    "balance": "Balance"
  },
  "lending": {
    "deposit": "Deposit STX",
    "withdraw": "Withdraw STX",
    "borrow": "Borrow STX",
    "repay": "Repay Loan"
  }
}

// Usage
import { useTranslations } from 'next-intl';

function Component() {
  const t = useTranslations('wallet');
  return <button>{t('connect')}</button>;
}
```

---

## 📋 Podsumowanie priorytetów

| PR # | Tytuł | Priorytet | Effort | Impact |
|------|-------|-----------|--------|--------|
| 1 | Fix CRLF Line Endings | 🔴 High | Low | High |
| 2 | Complete Contract Interactions | 🔴 High | High | High |
| 5 | Security & Validation | 🔴 High | Medium | High |
| 3 | Enhanced UI/UX | 🟡 Medium | Medium | Medium |
| 4 | Dashboard Analytics | 🟡 Medium | High | Medium |
| 6 | E2E Testing Suite | 🟡 Medium | High | Medium |
| 7 | Mobile Optimization | 🟡 Medium | Medium | Low |
| 8 | Internationalization | 🟢 Low | High | Low |

---

## 🚀 Rekomendowana kolejność implementacji:

1. **PR #1** - Natychmiastowy fix (już wykonany lokalnie)
2. **PR #2** - Kluczowa funkcjonalność (główny cel projektu)
3. **PR #5** - Bezpieczeństwo przed produkcją
4. **PR #3** - UX improvements
5. **PR #6** - Quality assurance
6. **PR #4, #7, #8** - Nice-to-have features

---

## 💡 Dodatkowe sugestie:

### Documentation
- Dodać JSDoc do wszystkich funkcji publicznych
- Utworzyć `CONTRIBUTING.md` z wytycznymi
- Rozbudować `README.md` o deployment instructions

### DevOps
- Dodać GitHub Actions dla CI/CD
- Skonfigurować Vercel deployment
- Dodać pre-commit hooks (Husky + lint-staged)

### Performance
- Implementacja React.memo dla drogich komponentów
- Code splitting dla większych bibliotek
- Image optimization (Next.js Image component)

---

**Autor**: GitHub Copilot  
**Data**: 2025-12-25  
**Projekt**: Stacks Boost - Lending Pool dApp

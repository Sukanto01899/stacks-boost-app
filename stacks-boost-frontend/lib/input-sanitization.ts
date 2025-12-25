/**
 * Input sanitization utilities for security
 */

/**
 * Sanitizes and validates Stacks addresses
 */
export function sanitizeStacksAddress(address: string): string | null {
  const trimmed = address.trim();
  
  // Validate format: SP or ST followed by 38-41 alphanumeric characters
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
  
  // Validate format: numbers with optional decimal (max 6 decimals)
  if (!/^\d+(\.\d{0,6})?$/.test(cleaned)) {
    return null;
  }
  
  const value = parseFloat(cleaned);
  
  // Check bounds (max 1 billion STX)
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    return null;
  }
  
  // Convert to microSTX
  return BigInt(Math.floor(value * 1_000_000));
}

/**
 * Sanitizes memo text for Clarity compatibility
 */
export function sanitizeMemo(memo: string): string {
  // Remove any control characters
  const cleaned = memo.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length to 34 bytes (Clarity string-ascii limit)
  const limited = cleaned.slice(0, 34);
  
  // Ensure only ASCII characters
  return limited.replace(/[^\x20-\x7E]/g, '');
}

/**
 * Validates deposit amount
 */
export function validateDepositAmount(amount: bigint, userBalance?: bigint): string | null {
  if (amount <= 0n) {
    return 'Amount must be positive';
  }
  
  if (amount < 1_000_000n) {
    return 'Minimum deposit: 1 STX';
  }
  
  if (userBalance !== undefined && amount > userBalance) {
    return 'Insufficient balance';
  }
  
  return null;
}

/**
 * Validates borrow parameters
 */
export function validateBorrowAmount(
  collateralAmount: bigint,
  borrowAmount: bigint,
  ltvPercentage: number = 70
): string | null {
  if (collateralAmount <= 0n || borrowAmount <= 0n) {
    return 'Amounts must be positive';
  }
  
  // Calculate maximum borrow based on LTV
  const maxBorrow = (collateralAmount * BigInt(ltvPercentage)) / 100n;
  
  if (borrowAmount > maxBorrow) {
    const maxBorrowStx = Number(maxBorrow) / 1_000_000;
    return `Maximum borrow with this collateral: ${maxBorrowStx.toFixed(6)} STX (${ltvPercentage}% LTV)`;
  }
  
  return null;
}

/**
 * Validates withdrawal amount
 */
export function validateWithdrawAmount(
  amount: bigint,
  depositedBalance: bigint
): string | null {
  if (amount <= 0n) {
    return 'Amount must be positive';
  }
  
  if (amount > depositedBalance) {
    return 'Insufficient deposited balance';
  }
  
  return null;
}

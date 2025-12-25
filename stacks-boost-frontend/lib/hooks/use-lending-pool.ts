/**
 * React Hook for Lending Pool Interactions
 * 
 * Provides easy-to-use functions and state management for lending pool operations.
 */

"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  depositSTX,
  withdrawSTX,
  borrowSTX,
  repayBorrow,
  getUserDeposit,
  getUserBorrow,
  getPendingYield,
  getUserDebt,
  getPoolStats,
  type UserDeposit,
  type UserBorrow,
  type PoolStats,
  type TransactionResult,
} from '@/lib/lending-pool';

export type LendingPoolState = {
  userDeposit: UserDeposit | null;
  userBorrow: UserBorrow | null;
  pendingYield: bigint;
  userDebt: bigint;
  poolStats: PoolStats;
  isLoading: boolean;
  error: string | null;
};

export type UseLendingPoolResult = LendingPoolState & {
  deposit: (amount: bigint) => Promise<TransactionResult>;
  withdraw: (amount: bigint) => Promise<TransactionResult>;
  borrow: (collateralAmount: bigint, borrowAmount: bigint) => Promise<TransactionResult>;
  repay: () => Promise<TransactionResult>;
  refresh: () => Promise<void>;
  isProcessing: boolean;
};

const initialState: LendingPoolState = {
  userDeposit: null,
  userBorrow: null,
  pendingYield: 0n,
  userDebt: 0n,
  poolStats: {
    totalStxDeposits: 0n,
    totalStxBorrows: 0n,
    totalSbtcCollateral: 0n,
    cumulativeYieldBips: 0n,
    isPaused: false,
  },
  isLoading: true,
  error: null,
};

/**
 * Hook for interacting with the lending pool
 * @param userAddress User's Stacks address (optional)
 * @param autoRefresh Enable auto-refresh every 30 seconds (default: true)
 */
export function useLendingPool(
  userAddress?: string,
  autoRefresh: boolean = true
): UseLendingPoolResult {
  const [state, setState] = useState<LendingPoolState>(initialState);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Fetch all data for the user and pool
   */
  const refresh = useCallback(async () => {
    if (!userAddress) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'No user address provided',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all data in parallel
      const [deposit, borrow, yield_, debt, stats] = await Promise.all([
        getUserDeposit(userAddress),
        getUserBorrow(userAddress),
        getPendingYield(userAddress),
        getUserDebt(userAddress),
        getPoolStats(),
      ]);

      setState({
        userDeposit: deposit,
        userBorrow: borrow,
        pendingYield: yield_,
        userDebt: debt,
        poolStats: stats,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error refreshing lending pool data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [userAddress]);

  /**
   * Deposit STX into the pool
   */
  const deposit = useCallback(
    async (amount: bigint): Promise<TransactionResult> => {
      if (!userAddress) {
        return {
          txId: '',
          success: false,
          error: 'No user address connected',
        };
      }

      setIsProcessing(true);
      try {
        const result = await depositSTX(amount, userAddress);
        
        if (result.success) {
          // Refresh data after successful deposit (with delay for blockchain confirmation)
          setTimeout(() => {
            refresh();
          }, 5000);
        }
        
        return result;
      } catch (error) {
        return {
          txId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [userAddress, refresh]
  );

  /**
   * Withdraw STX from the pool
   */
  const withdraw = useCallback(
    async (amount: bigint): Promise<TransactionResult> => {
      if (!userAddress) {
        return {
          txId: '',
          success: false,
          error: 'No user address connected',
        };
      }

      setIsProcessing(true);
      try {
        const result = await withdrawSTX(amount, userAddress);
        
        if (result.success) {
          setTimeout(() => {
            refresh();
          }, 5000);
        }
        
        return result;
      } catch (error) {
        return {
          txId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [userAddress, refresh]
  );

  /**
   * Borrow STX against sBTC collateral
   */
  const borrow = useCallback(
    async (collateralAmount: bigint, borrowAmount: bigint): Promise<TransactionResult> => {
      if (!userAddress) {
        return {
          txId: '',
          success: false,
          error: 'No user address connected',
        };
      }

      setIsProcessing(true);
      try {
        const result = await borrowSTX(collateralAmount, borrowAmount, userAddress);
        
        if (result.success) {
          setTimeout(() => {
            refresh();
          }, 5000);
        }
        
        return result;
      } catch (error) {
        return {
          txId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [userAddress, refresh]
  );

  /**
   * Repay borrowed STX
   */
  const repay = useCallback(
    async (): Promise<TransactionResult> => {
      if (!userAddress) {
        return {
          txId: '',
          success: false,
          error: 'No user address connected',
        };
      }

      setIsProcessing(true);
      try {
        const result = await repayBorrow(userAddress);
        
        if (result.success) {
          setTimeout(() => {
            refresh();
          }, 5000);
        }
        
        return result;
      } catch (error) {
        return {
          txId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [userAddress, refresh]
  );

  // Initial data fetch
  useEffect(() => {
    if (userAddress) {
      refresh();
    }
  }, [userAddress, refresh]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !userAddress) return;

    const interval = setInterval(() => {
      refresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, userAddress, refresh]);

  return {
    ...state,
    deposit,
    withdraw,
    borrow,
    repay,
    refresh,
    isProcessing,
  };
}

/**
 * Utility hook to get pool stats only (no user data)
 */
export function usePoolStats(autoRefresh: boolean = true) {
  const [stats, setStats] = useState<PoolStats>({
    totalStxDeposits: 0n,
    totalStxBorrows: 0n,
    totalSbtcCollateral: 0n,
    cumulativeYieldBips: 0n,
    isPaused: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const poolStats = await getPoolStats();
      setStats(poolStats);
    } catch (error) {
      console.error('Error fetching pool stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  return { stats, isLoading, refresh };
}

/**
 * Calculate APY from cumulative yield in basis points
 * @param yieldBips Cumulative yield in basis points (1 bip = 0.01%)
 */
export function calculateAPY(yieldBips: bigint): number {
  // Convert basis points to percentage
  // 10000 bips = 100%
  return Number(yieldBips) / 100;
}

/**
 * Calculate collateralization ratio
 * @param collateralValue Value of collateral in STX
 * @param debtValue Value of debt in STX
 */
export function calculateCollateralizationRatio(
  collateralValue: bigint,
  debtValue: bigint
): number {
  if (debtValue === 0n) return Infinity;
  return (Number(collateralValue) / Number(debtValue)) * 100;
}

/**
 * Check if position can be liquidated
 * @param collateralRatio Current collateralization ratio
 * @param liquidationThreshold Liquidation threshold percentage (default: 100%)
 */
export function canBeLiquidated(
  collateralRatio: number,
  liquidationThreshold: number = 100
): boolean {
  return collateralRatio < liquidationThreshold;
}

/**
 * Calculate maximum borrow amount based on collateral
 * @param collateralAmount Amount of collateral
 * @param ltv Loan-to-value ratio percentage (default: 70%)
 */
export function calculateMaxBorrow(
  collateralAmount: bigint,
  ltv: number = 70
): bigint {
  return (collateralAmount * BigInt(ltv)) / 100n;
}

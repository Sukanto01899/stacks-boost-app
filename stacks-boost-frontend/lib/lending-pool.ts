/**
 * Lending Pool Contract Interactions
 * 
 * This module provides functions to interact with the Stacks Boost lending pool contract.
 * Supports deposits, withdrawals, borrowing, and repayment of STX.
 */

import { openContractCall } from '@stacks/connect';
import {
  uintCV,
  principalCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  callReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS || 'SP1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXRCD0S3K';
const CONTRACT_NAME = process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME || 'lending-pool';
const NETWORK_TYPE = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'mainnet';

// Get network instance
function getNetwork() {
  return NETWORK_TYPE === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
}

// Error code mappings
export const ERROR_MESSAGES: Record<number, string> = {
  100: 'Invalid withdrawal amount',
  101: 'Maximum borrow limit exceeded',
  102: 'Position cannot be liquidated',
  104: 'Invalid oracle contract',
  105: 'Invalid sBTC contract',
  106: 'Invalid DEX contract',
  107: 'Unauthorized access',
  108: 'Contract is paused',
  109: 'Invalid borrow amount',
  110: 'Invalid liquidation',
  111: 'Invalid deposit amount',
  112: 'Insufficient liquidity in pool',
  113: 'Invalid price from oracle',
};

// TypeScript types
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
  isPaused: boolean;
};

export type TransactionResult = {
  txId: string;
  success: boolean;
  error?: string;
};

/**
 * Deposit STX into the lending pool
 * @param amount Amount in microSTX (1 STX = 1,000,000 microSTX)
 * @param userAddress User's Stacks address
 */
export async function depositSTX(
  amount: bigint,
  userAddress: string
): Promise<TransactionResult> {
  try {
    // Validation
    if (amount <= 0n) {
      throw new Error('Amount must be positive');
    }

    if (amount < 1_000_000n) {
      throw new Error('Minimum deposit is 1 STX');
    }

    // Post condition: user must transfer exact amount
    const postConditions = [
      makeStandardSTXPostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        amount
      ),
    ];

    return new Promise((resolve, reject) => {
      openContractCall({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'deposit-stx',
        functionArgs: [uintCV(amount)],
        postConditions,
        postConditionMode: PostConditionMode.Deny,
        onFinish: (data) => {
          resolve({
            txId: data.txId,
            success: true,
          });
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Withdraw STX from the lending pool
 * @param amount Amount in microSTX to withdraw
 * @param userAddress User's Stacks address
 */
export async function withdrawSTX(
  amount: bigint,
  userAddress: string
): Promise<TransactionResult> {
  try {
    if (amount <= 0n) {
      throw new Error('Amount must be positive');
    }

    return new Promise((resolve, reject) => {
      openContractCall({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'withdraw-stx',
        functionArgs: [uintCV(amount)],
        postConditionMode: PostConditionMode.Allow, // Contract sends STX back
        onFinish: (data) => {
          resolve({
            txId: data.txId,
            success: true,
          });
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Borrow STX against sBTC collateral
 * @param collateralAmount Amount of sBTC collateral in satoshis
 * @param borrowAmount Amount of STX to borrow in microSTX
 * @param userAddress User's Stacks address
 */
export async function borrowSTX(
  collateralAmount: bigint,
  borrowAmount: bigint,
  userAddress: string
): Promise<TransactionResult> {
  try {
    if (collateralAmount <= 0n || borrowAmount <= 0n) {
      throw new Error('Amounts must be positive');
    }

    return new Promise((resolve, reject) => {
      openContractCall({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'borrow-stx',
        functionArgs: [uintCV(collateralAmount), uintCV(borrowAmount)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          resolve({
            txId: data.txId,
            success: true,
          });
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Repay borrowed STX
 * @param userAddress User's Stacks address
 */
export async function repayBorrow(
  userAddress: string
): Promise<TransactionResult> {
  try {
    return new Promise((resolve, reject) => {
      openContractCall({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'repay',
        functionArgs: [],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          resolve({
            txId: data.txId,
            success: true,
          });
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Liquidate an undercollateralized position
 * @param targetUserAddress Address of user to liquidate
 * @param liquidatorAddress Address of liquidator
 */
export async function liquidatePosition(
  targetUserAddress: string,
  liquidatorAddress: string
): Promise<TransactionResult> {
  try {
    return new Promise((resolve, reject) => {
      openContractCall({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'liquidate',
        functionArgs: [principalCV(targetUserAddress)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          resolve({
            txId: data.txId,
            success: true,
          });
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        },
      });
    });
  } catch (error) {
    return {
      txId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Read user's deposit information
 * @param userAddress User's Stacks address
 */
export async function getUserDeposit(
  userAddress: string
): Promise<UserDeposit | null> {
  try {
    const result = await callReadOnlyFunction({
      network: getNetwork(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-deposit',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });

    const value = cvToValue(result);
    
    if (value && value.amount !== undefined) {
      return {
        amount: BigInt(value.amount),
        yieldIndex: BigInt(value['yield-index'] || 0),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user deposit:', error);
    return null;
  }
}

/**
 * Read user's borrow information
 * @param userAddress User's Stacks address
 */
export async function getUserBorrow(
  userAddress: string
): Promise<UserBorrow | null> {
  try {
    const result = await callReadOnlyFunction({
      network: getNetwork(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-borrow',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });

    const value = cvToValue(result);
    
    if (value && value.amount !== undefined) {
      return {
        amount: BigInt(value.amount),
        collateralAmount: BigInt(value['collateral-amount'] || 0),
        lastAccrued: BigInt(value['last-accrued'] || 0),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user borrow:', error);
    return null;
  }
}

/**
 * Calculate user's pending yield
 * @param userAddress User's Stacks address
 */
export async function getPendingYield(
  userAddress: string
): Promise<bigint> {
  try {
    const result = await callReadOnlyFunction({
      network: getNetwork(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-pending-yield',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });

    const value = cvToValue(result);
    return value?.value ? BigInt(value.value) : 0n;
  } catch (error) {
    console.error('Error fetching pending yield:', error);
    return 0n;
  }
}

/**
 * Get user's current debt including accrued interest
 * @param userAddress User's Stacks address
 */
export async function getUserDebt(
  userAddress: string
): Promise<bigint> {
  try {
    const result = await callReadOnlyFunction({
      network: getNetwork(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-debt',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
    });

    const value = cvToValue(result);
    return value?.value ? BigInt(value.value) : 0n;
  } catch (error) {
    console.error('Error fetching user debt:', error);
    return 0n;
  }
}

/**
 * Get pool statistics
 */
export async function getPoolStats(): Promise<PoolStats> {
  try {
    const [totalDeposits, totalBorrows, totalCollateral, yieldBips, paused] = await Promise.all([
      callReadOnlyFunction({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-total-deposits',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      }),
      callReadOnlyFunction({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-total-borrows',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      }),
      callReadOnlyFunction({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-total-collateral',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      }),
      callReadOnlyFunction({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-cumulative-yield',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      }),
      callReadOnlyFunction({
        network: getNetwork(),
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'is-paused',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      }),
    ]);

    return {
      totalStxDeposits: BigInt(cvToValue(totalDeposits) || 0),
      totalStxBorrows: BigInt(cvToValue(totalBorrows) || 0),
      totalSbtcCollateral: BigInt(cvToValue(totalCollateral) || 0),
      cumulativeYieldBips: BigInt(cvToValue(yieldBips) || 0),
      isPaused: Boolean(cvToValue(paused)),
    };
  } catch (error) {
    console.error('Error fetching pool stats:', error);
    return {
      totalStxDeposits: 0n,
      totalStxBorrows: 0n,
      totalSbtcCollateral: 0n,
      cumulativeYieldBips: 0n,
      isPaused: false,
    };
  }
}

/**
 * Format microSTX to STX string
 */
export function formatSTX(microStx: bigint): string {
  return (Number(microStx) / 1_000_000).toFixed(6);
}

/**
 * Parse STX string to microSTX
 */
export function parseSTX(stx: string): bigint {
  return BigInt(Math.floor(parseFloat(stx) * 1_000_000));
}

/**
 * Get error message from error code
 */
export function getErrorMessage(errorCode: number): string {
  return ERROR_MESSAGES[errorCode] || `Unknown error (code: ${errorCode})`;
}

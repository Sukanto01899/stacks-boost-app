"use client";

import { useCallback, useEffect, useState } from 'react';
import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';
import {
  STACKS_NETWORK_INSTANCE,
  STACKS_CONTRACT_ADDRESS,
  STACKS_CONTRACT_NAME,
} from './stacks-config';

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
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    try {
      const result = await verifyContract();
      setIsVerified(result);
      
      if (!result) {
        setError('Unable to connect to the lending pool contract.');
      }
    } catch (err) {
      console.error('Contract verification error:', err);
      setIsVerified(false);
      setError(err instanceof Error ? err.message : 'Contract verification failed');
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  return { isVerified, error, retry: verify };
}

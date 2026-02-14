"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { callReadOnlyFunction, cvToValue } from "@stacks/transactions";
import {
  STACKS_NETWORK_INSTANCE,
  STACKS_ORACLE_ADDRESS,
  STACKS_ORACLE_NAME,
} from "@/lib/stacks-config";

type OracleState = {
  price: bigint | null;
  isInitialized: boolean | null;
  updatedAt: Date | null;
  error: string | null;
};

type MarketState = {
  stxUsd: number | null;
  updatedAt: Date | null;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapValue(value: unknown): unknown {
  if (isRecord(value) && "value" in value) {
    return unwrapValue(value.value);
  }
  if (isRecord(value) && "success" in value && "value" in value) {
    return unwrapValue(value.value);
  }
  return value;
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

const MARKET_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd";

export function usePriceFeed() {
  const [oracle, setOracle] = useState<OracleState>({
    price: null,
    isInitialized: null,
    updatedAt: null,
    error: null,
  });
  const [market, setMarket] = useState<MarketState>({
    stxUsd: null,
    updatedAt: null,
    error: null,
  });

  const fetchOracle = useCallback(async () => {
    try {
      const [priceCv, initializedCv] = await Promise.all([
        callReadOnlyFunction({
          contractAddress: STACKS_ORACLE_ADDRESS,
          contractName: STACKS_ORACLE_NAME,
          functionName: "get-price",
          functionArgs: [],
          network: STACKS_NETWORK_INSTANCE,
          senderAddress: STACKS_ORACLE_ADDRESS,
        }),
        callReadOnlyFunction({
          contractAddress: STACKS_ORACLE_ADDRESS,
          contractName: STACKS_ORACLE_NAME,
          functionName: "is-initialized",
          functionArgs: [],
          network: STACKS_NETWORK_INSTANCE,
          senderAddress: STACKS_ORACLE_ADDRESS,
        }),
      ]);

      const rawPrice = unwrapValue(cvToValue(priceCv));
      const rawInitialized = unwrapValue(cvToValue(initializedCv));
      const price = toBigInt(rawPrice);
      const isInitialized = typeof rawInitialized === "boolean" ? rawInitialized : null;

      setOracle({
        price,
        isInitialized,
        updatedAt: new Date(),
        error: null,
      });
    } catch (error) {
      setOracle((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch oracle.",
      }));
    }
  }, []);

  const fetchMarket = useCallback(async () => {
    try {
      const response = await fetch(MARKET_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch market price.");
      }
      const data = (await response.json()) as {
        blockstack?: { usd?: number };
      };
      const stxUsd =
        typeof data?.blockstack?.usd === "number" ? data.blockstack.usd : null;
      setMarket({
        stxUsd,
        updatedAt: new Date(),
        error: null,
      });
    } catch (error) {
      setMarket((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch market.",
      }));
    }
  }, []);

  useEffect(() => {
    void fetchOracle();
    void fetchMarket();
    const interval = setInterval(() => {
      void fetchOracle();
      void fetchMarket();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMarket, fetchOracle]);

  const stxPerSbtc = useMemo(() => {
    if (!oracle.price) return null;
    return Number(oracle.price) / 1_000_000;
  }, [oracle.price]);

  const sbtcUsd = useMemo(() => {
    if (!market.stxUsd || !stxPerSbtc) return null;
    return market.stxUsd * stxPerSbtc;
  }, [market.stxUsd, stxPerSbtc]);

  const oracleStatus = useMemo(() => {
    if (oracle.error) return "Oracle error";
    if (oracle.isInitialized === false) return "Not initialized";
    if (oracle.price === null) return "Loading";
    return "Live";
  }, [oracle.error, oracle.isInitialized, oracle.price]);

  return {
    oraclePrice: oracle.price,
    oracleUpdatedAt: oracle.updatedAt,
    oracleStatus,
    oracleError: oracle.error,
    stxPerSbtc,
    stxUsd: market.stxUsd,
    sbtcUsd,
    marketUpdatedAt: market.updatedAt,
    marketError: market.error,
  };
}

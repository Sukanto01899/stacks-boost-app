"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { openContractCall } from "@stacks/connect";
import { PostConditionMode, standardPrincipalCV, uintCV } from "@stacks/transactions";
import { useStacks } from "@/lib/hooks/use-stacks";
import {
  STACKS_NETWORK_INSTANCE,
  STACKS_ORACLE_ADDRESS,
  STACKS_ORACLE_NAME,
  STACKS_SBTC_TOKEN_ADDRESS,
  STACKS_SBTC_TOKEN_NAME,
} from "@/lib/stacks-config";
import { STACKS_APP_DETAILS } from "@/lib/stacks-config";
import { formatMicrostxToStx } from "@/lib/stx-utils";

type TxItem = {
  tx_id: string;
  tx_status: string;
  tx_type: string;
  burn_block_time_iso?: string;
};

type BalanceResponse = {
  stx?: { balance?: string };
  fungible_tokens?: Record<string, { balance?: string }>;
};

type TxResponse = {
  results?: TxItem[];
};

function shortTx(txId: string) {
  if (txId.length <= 12) return txId;
  return `${txId.slice(0, 6)}...${txId.slice(-6)}`;
}

export function DashboardPanel() {
  const { stxAddress, isConnected } = useStacks();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [sbtcBalance, setSbtcBalance] = useState<bigint | null>(null);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oraclePrice, setOraclePrice] = useState("87796");
  const [oracleFeedback, setOracleFeedback] = useState<string | null>(null);
  const [isOracleWorking, setIsOracleWorking] = useState(false);

  const baseUrl = STACKS_NETWORK_INSTANCE.client.baseUrl;

  const loadDashboard = useCallback(async () => {
    if (!stxAddress) return;
    setIsLoading(true);
    setError(null);

    try {
      const balanceRes = await fetch(
        `${baseUrl}/extended/v1/address/${stxAddress}/balances`,
      );
      if (!balanceRes.ok) {
        throw new Error("Failed to load balance.");
      }
      const balanceJson = (await balanceRes.json()) as BalanceResponse;
      const balanceValue = balanceJson?.stx?.balance ?? "0";
      setBalance(BigInt(balanceValue));
      const sbtcAssetId = `${STACKS_SBTC_TOKEN_ADDRESS}.${STACKS_SBTC_TOKEN_NAME}::sbtc`;
      const sbtcValue =
        balanceJson?.fungible_tokens?.[sbtcAssetId]?.balance ?? "0";
      setSbtcBalance(BigInt(sbtcValue));

      const txRes = await fetch(
        `${baseUrl}/extended/v1/address/${stxAddress}/transactions?limit=5`,
      );
      if (!txRes.ok) {
        throw new Error("Failed to load transactions.");
      }
      const txJson = (await txRes.json()) as TxResponse;
      setTransactions(txJson.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, stxAddress]);

  useEffect(() => {
    if (!isConnected || !stxAddress) {
      setBalance(null);
      setSbtcBalance(null);
      setTransactions([]);
      setError(null);
      return;
    }
    void loadDashboard();
  }, [isConnected, loadDashboard, stxAddress]);

  const balanceLabel = useMemo(() => {
    if (balance === null) return "-";
    return `${formatMicrostxToStx(balance)} STX`;
  }, [balance]);

  const sbtcLabel = useMemo(() => {
    if (sbtcBalance === null) return "-";
    return `${formatMicrostxToStx(sbtcBalance)} sBTC`;
  }, [sbtcBalance]);

  const parsedOraclePrice = useMemo(() => {
    const trimmed = oraclePrice.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return BigInt(trimmed);
  }, [oraclePrice]);

  const handleOracleInit = async () => {
    if (!stxAddress) {
      setOracleFeedback("Connect a wallet to initialize the oracle.");
      return;
    }
    setIsOracleWorking(true);
    setOracleFeedback(null);
    try {
      await openContractCall({
        contractAddress: STACKS_ORACLE_ADDRESS,
        contractName: STACKS_ORACLE_NAME,
        functionName: "initialize",
        functionArgs: [standardPrincipalCV(stxAddress)],
        network: STACKS_NETWORK_INSTANCE,
        appDetails: STACKS_APP_DETAILS,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          setOracleFeedback("Oracle initialized.");
        },
        onCancel: () => {
          setOracleFeedback("Oracle init cancelled.");
        },
      });
    } catch (err) {
      setOracleFeedback(err instanceof Error ? err.message : "Init failed.");
    } finally {
      setIsOracleWorking(false);
    }
  };

  const handleOraclePrice = async () => {
    if (!parsedOraclePrice) {
      setOracleFeedback("Enter a valid integer price.");
      return;
    }
    setIsOracleWorking(true);
    setOracleFeedback(null);
    try {
      await openContractCall({
        contractAddress: STACKS_ORACLE_ADDRESS,
        contractName: STACKS_ORACLE_NAME,
        functionName: "update-price",
        functionArgs: [uintCV(parsedOraclePrice)],
        network: STACKS_NETWORK_INSTANCE,
        appDetails: STACKS_APP_DETAILS,
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => {
          setOracleFeedback(`Oracle price set to ${parsedOraclePrice}.`);
        },
        onCancel: () => {
          setOracleFeedback("Price update cancelled.");
        },
      });
    } catch (err) {
      setOracleFeedback(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsOracleWorking(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_24px_70px_rgba(30,12,6,0.55)] backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-200/80">
            Dashboard
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Wallet overview
          </h2>
          <p className="text-sm text-orange-100/70">
            Balance + recent transactions
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={!isConnected || isLoading}
          className="h-10 rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.22em] text-orange-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/80">
              Wallet balance
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {balanceLabel}
            </p>
            <p className="mt-2 text-xs text-orange-100/70">
              {stxAddress ? stxAddress : "Connect wallet to view balance."}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/80">
              Mock sBTC balance
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {sbtcLabel}
            </p>
            <p className="mt-2 text-xs text-orange-100/70">
              Token: {STACKS_SBTC_TOKEN_NAME}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/80">
              Mock oracle
            </p>
            <p className="mt-2 text-sm text-orange-100/70">
              Contract: {STACKS_ORACLE_NAME}
            </p>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100/70">
                  Price
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={oraclePrice}
                  onChange={(event) => setOraclePrice(event.target.value)}
                  className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-orange-100/60 focus:border-orange-200/70 focus:ring-2 focus:ring-orange-400/30"
                  placeholder="87796"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOracleInit}
                  disabled={!isConnected || isOracleWorking}
                  className="h-11 rounded-xl border border-white/15 text-xs font-semibold uppercase tracking-[0.22em] text-orange-100 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  Initialize
                </button>
                <button
                  type="button"
                  onClick={handleOraclePrice}
                  disabled={!isConnected || isOracleWorking || !parsedOraclePrice}
                  className="h-11 rounded-xl bg-orange-500/90 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200/40"
                >
                  Set price
                </button>
              </div>
              {oracleFeedback ? (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {oracleFeedback}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/80">
            Recent transactions
          </p>
          {transactions.length === 0 ? (
            <p className="mt-3 text-sm text-orange-100/70">
              {isConnected ? "No recent transactions." : "Connect wallet to view."}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {transactions.map((tx) => (
                <div
                  key={tx.tx_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-orange-50/90"
                >
                  <span className="font-mono">{shortTx(tx.tx_id)}</span>
                  <span className="text-xs uppercase tracking-[0.22em] text-orange-100/70">
                    {tx.tx_type}
                  </span>
                  <span className="text-xs text-orange-100/70">
                    {tx.tx_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}

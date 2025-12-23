"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClarityType,
  cvToValue,
  fetchContractMapEntry,
  standardPrincipalCV,
  tupleCV,
} from "@stacks/transactions";
import { useWalletConnect } from "@/lib/hooks/use-walletconnect";
import { useStacks } from "@/lib/hooks/use-stacks";
import {
  STACKS_NETWORK_INSTANCE,
  STACKS_SBTC_ASSET_NAME,
  STACKS_CONTRACT_ADDRESS,
  STACKS_CONTRACT_NAME,
  STACKS_SBTC_TOKEN_ADDRESS,
  STACKS_SBTC_TOKEN_NAME,
} from "@/lib/stacks-config";
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

type MapAmount = bigint | number | string | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toMicrostxAmount(value: MapAmount): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function extractMapAmount(parsed: unknown): MapAmount {
  if (!isRecord(parsed)) return undefined;
  const record = parsed;
  const value = isRecord(record.value) ? record.value : record;
  if (!isRecord(value)) return undefined;
  const amount = value.amount;
  if (isRecord(amount) && "value" in amount) {
    return amount.value as MapAmount;
  }
  return amount as MapAmount;
}

type DashboardPanelProps = {
  activeWallet: "walletconnect" | "stacks" | null;
};

export function DashboardPanel({ activeWallet }: DashboardPanelProps) {
  const walletConnect = useWalletConnect();
  const stacks = useStacks();
  const stxAddress =
    activeWallet === "stacks" ? stacks.stxAddress : walletConnect.stxAddress;
  const isConnected =
    activeWallet === "stacks" ? stacks.isConnected : walletConnect.isConnected;
  const [balance, setBalance] = useState<bigint | null>(null);
  const [sbtcBalance, setSbtcBalance] = useState<bigint | null>(null);
  const [depositBalance, setDepositBalance] = useState<bigint | null>(null);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const baseUrl = STACKS_NETWORK_INSTANCE.client.baseUrl;

  const loadDepositBalance = useCallback(async () => {
    if (!stxAddress) {
      setDepositBalance(null);
      return;
    }

    try {
      const key = tupleCV({ user: standardPrincipalCV(stxAddress) });
      const entry = await fetchContractMapEntry({
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: STACKS_CONTRACT_NAME,
        mapName: "deposits",
        mapKey: key,
        network: STACKS_NETWORK_INSTANCE,
      });

      if (entry.type === ClarityType.OptionalNone) {
        setDepositBalance(0n);
        return;
      }

      const parsed = cvToValue(entry);
      const normalized = toMicrostxAmount(extractMapAmount(parsed)) ?? 0n;
      setDepositBalance(normalized);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load deposit balance.",
      );
    }
  }, [stxAddress]);

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
      const sbtcAssetId = `${STACKS_SBTC_TOKEN_ADDRESS}.${STACKS_SBTC_TOKEN_NAME}::${STACKS_SBTC_ASSET_NAME}`;
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
      setDepositBalance(null);
      setTransactions([]);
      setError(null);
      return;
    }
    void loadDashboard();
    void loadDepositBalance();
  }, [isConnected, loadDashboard, loadDepositBalance, stxAddress]);

  const balanceLabel = useMemo(() => {
    if (balance === null) return "-";
    return `${formatMicrostxToStx(balance)} STX`;
  }, [balance]);

  const sbtcLabel = useMemo(() => {
    if (sbtcBalance === null) return "-";
    return `${formatMicrostxToStx(sbtcBalance)} sBTC`;
  }, [sbtcBalance]);

  const depositLabel = useMemo(() => {
    if (depositBalance === null) return "-";
    return `${formatMicrostxToStx(depositBalance)} STX`;
  }, [depositBalance]);

  return (
    <div className="grid gap-6">
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
                Deposited balance
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {depositLabel}
              </p>
              <p className="mt-2 text-xs text-orange-100/70">
                Contract: {STACKS_CONTRACT_NAME}
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

    </div>
  );
}

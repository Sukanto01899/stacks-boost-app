"use client";

import { useMemo } from "react";

import { useStacks } from "@/lib/hooks/use-stacks";

function formatAddress(address?: string | null) {
  if (!address) return "Not connected";
  const normalized = typeof address === "string" ? address : String(address);
  return normalized.length <= 10
    ? normalized
    : `${normalized.slice(0, 5)}...${normalized.slice(normalized.length - 5)}`;
}

export function WalletPanel() {
  const {
    status,
    providerName,
    isLoading,
    isPending,
    isConnected,
    stxAddress,
    btcAddress,
    error,
    connect,
    disconnect,
    refresh,
  } = useStacks();

  const statusCopy = useMemo(() => {
    switch (status) {
      case "connected":
        return "Wallet connected";
      case "pending":
        return "Awaiting wallet approval...";
      case "error":
        return "Wallet error";
      case "disconnected":
        return "No wallet connected";
      default:
        return "Idle";
    }
  }, [status]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Wallet status</p>
          <p className="text-xl font-semibold text-slate-900">{statusCopy}</p>
          {providerName ? (
            <p className="text-sm text-slate-500">Provider: {providerName}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            disabled={isLoading}
          >
            Refresh
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={disconnect}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={isLoading}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
              disabled={isLoading || isPending}
            >
              {isPending ? "Opening wallet..." : "Connect wallet"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            STX Address
          </p>
          <p className="mt-1 font-mono text-sm text-slate-900">
            {formatAddress(stxAddress)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            BTC Address
          </p>
          <p className="mt-1 font-mono text-sm text-slate-900">
            {formatAddress(btcAddress)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

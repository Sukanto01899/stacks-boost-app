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
    <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_24px_70px_rgba(30,12,6,0.55)] backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-200/70">
            Wallet status
          </p>
          <p className="text-xl font-semibold text-white">{statusCopy}</p>
          {providerName ? (
            <p className="text-sm text-slate-300/80">
              Provider: {providerName}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            disabled={isLoading}
          >
            Refresh
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={disconnect}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:opacity-50"
              disabled={isLoading}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
              disabled={isLoading || isPending}
            >
              {isPending ? "Opening wallet..." : "Connect wallet"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/70">
            STX Address
          </p>
          <p className="mt-1 font-mono text-sm text-white">
            {formatAddress(stxAddress)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/70">
            BTC Address
          </p>
          <p className="mt-1 font-mono text-sm text-white">
            {formatAddress(btcAddress)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

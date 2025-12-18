"use client";

import { useStacks } from "@/lib/hooks/use-stacks";
import { STACKS_NETWORK } from "@/lib/stacks-config";

export function HeaderBar() {
  const { isConnected, isPending, isLoading, connect, disconnect, stxAddress } =
    useStacks();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 shadow-[0_18px_50px_rgba(30,12,6,0.45)] backdrop-blur-2xl">
      <div className="min-w-[200px]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-200/80">
          StacksBoost
        </p>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Testnet Lending Vault
        </h1>
        <p className="text-xs text-orange-100/70">
          Network: {STACKS_NETWORK === "mainnet" ? "Mainnet" : "Testnet"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-orange-100/80">
          {stxAddress ? stxAddress : "Wallet not connected"}
        </div>
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
    </header>
  );
}

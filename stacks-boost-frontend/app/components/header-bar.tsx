"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWalletConnect } from "@/lib/hooks/use-walletconnect";
import { useStacks } from "@/lib/hooks/use-stacks";
import { STACKS_NETWORK } from "@/lib/stacks-config";
import type { WalletProvider } from "./app-shell";

type HeaderBarProps = {
  activeWallet: WalletProvider | null;
  setActiveWallet: (provider: WalletProvider | null) => void;
};

function shortAddress(address?: string) {
  if (!address) return "Wallet not connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function HeaderBar({ activeWallet, setActiveWallet }: HeaderBarProps) {
  const {
    isConnected,
    isPending,
    isLoading,
    connect,
    disconnect,
    stxAddress,
  } = useWalletConnect();
  const stacks = useStacks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const walletConnectState = {
    id: "walletconnect" as const,
    name: "WalletConnect",
    isConnected,
    isPending,
    isLoading,
    stxAddress,
    connect,
    disconnect,
  };

  const stacksState = {
    id: "stacks" as const,
    name: stacks.providerName ?? "Stacks wallet",
    isConnected: stacks.isConnected,
    isPending: stacks.isPending,
    isLoading: stacks.isLoading,
    stxAddress: stacks.stxAddress,
    connect: stacks.connect,
    disconnect: stacks.disconnect,
  };

  const activeState =
    activeWallet === "stacks"
      ? stacksState
      : activeWallet === "walletconnect"
        ? walletConnectState
        : null;

  const isAnyPending = walletConnectState.isPending || stacksState.isPending;
  const isAnyLoading = walletConnectState.isLoading || stacksState.isLoading;

  const statusLabel = useMemo(() => {
    if (activeWallet === "walletconnect") {
      return walletConnectState.isConnected
        ? "WalletConnect connected"
        : "WalletConnect disconnected";
    }
    if (activeWallet === "stacks") {
      return stacksState.isConnected
        ? `${stacksState.name} connected`
        : `${stacksState.name} disconnected`;
    }
    return "Select a wallet";
  }, [activeWallet, stacksState.isConnected, stacksState.name, walletConnectState.isConnected]);

  const addressLabel = activeState?.stxAddress;

  const handleSelectWallet = async (nextWallet: WalletProvider) => {
    if (activeWallet && activeWallet !== nextWallet && activeState) {
      await activeState.disconnect();
    }
    setActiveWallet(nextWallet);
    if (nextWallet === "walletconnect") {
      await walletConnectState.connect();
    } else {
      await stacksState.connect();
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 shadow-[0_18px_50px_rgba(30,12,6,0.45)] backdrop-blur-2xl">
      <div className="min-w-[200px]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-200/80">
          Stacks Boost
        </p>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Stacks Boost Lending
        </h1>
        <p className="text-xs text-orange-100/70">
          Network: {STACKS_NETWORK === "mainnet" ? "Mainnet" : "Testnet"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-orange-100/80">
          {shortAddress(addressLabel)}
        </div>
        {activeWallet ? (
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
              disabled={isAnyLoading}
            >
              Switch wallet
            </button>
            {activeState?.isConnected ? (
              <button
                type="button"
                onClick={() => {
                  void activeState.disconnect();
                  setActiveWallet(null);
                }}
                className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:opacity-50"
                disabled={isAnyLoading}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void activeState?.connect()}
                className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
                disabled={isAnyLoading || isAnyPending}
              >
                {isAnyPending ? "Opening wallet..." : "Connect"}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
            disabled={isAnyLoading || isAnyPending}
          >
            {isAnyPending ? "Opening wallet..." : "Connect wallet"}
          </button>
        )}
      </div>

      {isModalOpen && isMounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            >
              <div
                className="pointer-events-auto w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a0f0b] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-200/70">
                      Choose wallet
                    </p>
                    <h2 className="text-lg font-semibold text-white">
                      Connect a wallet
                    </h2>
                    <p className="text-xs text-orange-100/70">{statusLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-100/70 transition hover:border-white/30 hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsModalOpen(false);
                      await handleSelectWallet("walletconnect");
                    }}
                    className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                    disabled={walletConnectState.isLoading || walletConnectState.isPending}
                  >
                    <span className="text-sm font-semibold text-white">
                      WalletConnect
                    </span>
                    <span className="text-xs text-orange-100/70">
                      Connect via WalletConnect QR or extension.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsModalOpen(false);
                      await handleSelectWallet("stacks");
                    }}
                    className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                    disabled={stacksState.isLoading || stacksState.isPending}
                  >
                    <span className="text-sm font-semibold text-white">
                      Leather / Xverse
                    </span>
                    <span className="text-xs text-orange-100/70">
                      Connect with Stacks browser extensions.
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}

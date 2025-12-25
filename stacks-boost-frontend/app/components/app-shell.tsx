"use client";

import { useMemo, useState } from "react";
import { DashboardPanel } from "./dashboard-panel";
import { HeaderBar } from "./header-bar";
import { StxActions } from "./stx-actions";
import { useContractVerification } from "@/lib/contract-verification";

type View = "dashboard" | "deposit" | "borrow";
export type WalletProvider = "walletconnect" | "stacks";

const navItems: Array<{ id: View; label: string; hint: string }> = [
  { id: "dashboard", label: "Dashboard", hint: "Balance + history" },
  { id: "deposit", label: "Deposit", hint: "Add or withdraw STX" },
  { id: "borrow", label: "Borrow / Repay", hint: "Credit line actions" },
];

export function AppShell() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activeWallet, setActiveWallet] = useState<WalletProvider | null>(null);
  const { isVerified, error: verificationError, retry } = useContractVerification();

  // Show loading state while verifying
  if (isVerified === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#110907]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-200 text-lg">Verifying contract...</p>
        </div>
      </div>
    );
  }

  // Show error if verification failed
  if (isVerified === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#110907]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-red-400 mb-4">
            Contract Verification Failed
          </h1>
          <p className="text-orange-200/80 mb-2">
            {verificationError || 'Unable to connect to the lending pool contract.'}
          </p>
          <p className="text-orange-100/60 text-sm mb-6">
            Please check your network settings and ensure the contract address is correct.
          </p>
          <button
            onClick={retry}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const content = useMemo(() => {
    switch (activeView) {
      case "deposit":
        return <StxActions mode="deposit" activeWallet={activeWallet} />;
      case "borrow":
        return <StxActions mode="borrow" activeWallet={activeWallet} />;
      default:
        return <DashboardPanel activeWallet={activeWallet} />;
    }
  }, [activeView, activeWallet]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#110907] text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-400/30 blur-[140px]" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-500/20 blur-[160px]" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-rose-500/20 blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,210,170,0.12),_transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
        <HeaderBar activeWallet={activeWallet} setActiveWallet={setActiveWallet} />

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_50px_rgba(30,12,6,0.45)] backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-200/80">
              Navigation
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {navItems.map((item) => {
                const isActive = item.id === activeView;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-orange-200/60 bg-orange-500/20 text-orange-50 shadow-[0_16px_30px_rgba(249,115,22,0.25)]"
                        : "border-white/10 bg-white/5 text-orange-100/80 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-orange-100/70">
                      {item.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">{content}</section>
        </div>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-orange-100/70">
          <span>Stacks Boost Lending • Web3 demo vault</span>
          <span>Built for clean, responsive DeFi flows.</span>
        </footer>
      </div>
    </main>
  );
}

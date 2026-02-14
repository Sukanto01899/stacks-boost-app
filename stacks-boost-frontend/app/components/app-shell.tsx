"use client";

import { useMemo, useState } from "react";
import { DashboardPanel } from "./dashboard-panel";
import { HeaderBar } from "./header-bar";
import { StxActions } from "./stx-actions";

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
    <main className="relative min-h-screen overflow-hidden bg-[#0b0907] text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-400/30 blur-[140px] glow-pulse" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-500/20 blur-[160px] float-y" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-rose-500/20 blur-[180px]" />
        <div className="absolute inset-0 noise-grid opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,210,170,0.14),_transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
        <HeaderBar activeWallet={activeWallet} setActiveWallet={setActiveWallet} />

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(20,10,6,0.5)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-orange-200/80">
                Boosted liquidity
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-white sm:text-4xl">
                Borrow, supply, and route STX with a modern on-chain vault.
              </h2>
              <p className="mt-3 text-sm text-orange-100/70 sm:text-base">
                Stacks Boost unifies your deposit, credit, and transfer flows into one
                fast dashboard. Stay on top of collateral, lending capacity, and network
                health from a single view.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-orange-100/70">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Live testnet dashboard
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  sBTC-ready routing
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  24h protocol pulse
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Supply APY", value: "6.2%" },
                { label: "Borrow APR", value: "9.4%" },
                { label: "Utilization", value: "42%" },
                { label: "Total deposits", value: "1.28M STX" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-200/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
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
                    className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-orange-200/60 bg-gradient-to-br from-orange-500/30 via-orange-500/10 to-transparent text-orange-50 shadow-[0_16px_30px_rgba(249,115,22,0.25)]"
                        : "border-white/10 bg-white/5 text-orange-100/80 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-orange-100/70">
                      {item.hint}
                    </div>
                    {isActive ? (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-orange-400/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">{content}</section>
        </div>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-orange-100/70">
          <span>Stacks Boost Lending - Web3 demo vault</span>
          <span>Built for clear, responsive DeFi flows.</span>
        </footer>
      </div>
    </main>
  );
}

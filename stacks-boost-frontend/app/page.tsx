import { StxActions } from "./components/stx-actions";
import { WalletPanel } from "./components/wallet-panel";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            StacksLend
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900">
            Deposit and withdraw STX with Leather or Xverse
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Connect your wallet, enter an amount, and submit a contract call to
            deposit or withdraw STX from the lending pool.
          </p>
        </header>

        <section>
          <WalletPanel />
        </section>

        <section>
          <StxActions />
        </section>
      </div>
    </main>
  );
}

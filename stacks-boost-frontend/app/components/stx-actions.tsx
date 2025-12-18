"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { openContractCall } from "@stacks/connect";
import { STACKS_MAINNET, STACKS_TESTNET, type StacksNetwork } from "@stacks/network";
import {
  ClarityType,
  cvToValue,
  fetchContractMapEntry,
  PostConditionMode,
  standardPrincipalCV,
  tupleCV,
  uintCV,
} from "@stacks/transactions";

import { useStacks } from "@/lib/hooks/use-stacks";
import {
  STACKS_APP_DETAILS,
  STACKS_CONTRACT_ADDRESS,
  STACKS_CONTRACT_NAME,
} from "@/lib/stacks-config";
import { formatMicrostxToStx, parseStxToMicrostx } from "@/lib/stx-utils";

type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

type MapAmount = bigint | number | string | undefined;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StxActions() {
  const { isConnected, isLoading, isPending, stxAddress, connect } = useStacks();
  const [amount, setAmount] = useState("1");
  const [borrowAmount, setBorrowAmount] = useState("1");
  const [collateralAmount, setCollateralAmount] = useState("1");
  const [depositedBalance, setDepositedBalance] = useState<bigint | null>(null);
  const [borrowedBalance, setBorrowedBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isBorrowLoading, setIsBorrowLoading] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [lastTxStatus, setLastTxStatus] = useState<
    "idle" | "pending" | "success" | "failed"
  >("idle");
  const [lastTxError, setLastTxError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const parsedAmount = useMemo(() => parseStxToMicrostx(amount), [amount]);
  const parsedBorrowAmount = useMemo(
    () => parseStxToMicrostx(borrowAmount),
    [borrowAmount],
  );
  const parsedCollateralAmount = useMemo(
    () => parseStxToMicrostx(collateralAmount),
    [collateralAmount],
  );
  const canSubmit =
    isConnected && !isLoading && !isPending && !isWorking && !!parsedAmount;
  const canBorrow =
    isConnected &&
    !isLoading &&
    !isPending &&
    !isWorking &&
    !!parsedBorrowAmount &&
    !!parsedCollateralAmount;
  const hasActiveDeposit = depositedBalance !== null && depositedBalance > 0n;
  const hasActiveBorrow = borrowedBalance !== null && borrowedBalance > 0n;

  const activeNetwork = useMemo<StacksNetwork>(() => {
    if (stxAddress?.startsWith("SP") || stxAddress?.startsWith("SM")) {
      return STACKS_MAINNET;
    }
    return STACKS_TESTNET;
  }, [stxAddress]);

  const networkLabel = useMemo(() => {
    return activeNetwork === STACKS_MAINNET ? "Mainnet" : "Testnet";
  }, [activeNetwork]);

  const explorerUrl = useMemo(() => {
    if (!lastTxId) return null;
    const chain = activeNetwork === STACKS_MAINNET ? "mainnet" : "testnet";
    return `https://explorer.hiro.so/txid/${lastTxId}?chain=${chain}`;
  }, [activeNetwork, lastTxId]);

  const networkMismatch = useMemo(() => {
    if (!stxAddress) return null;
    const walletNetwork = stxAddress.startsWith("SP") ? "mainnet" : "testnet";
    const contractNetwork = STACKS_CONTRACT_ADDRESS.startsWith("SP")
      ? "mainnet"
      : "testnet";
    if (walletNetwork === contractNetwork) return null;
    return `Wallet is on ${walletNetwork}, but contract is ${contractNetwork}. Switch networks or update the contract address.`;
  }, [stxAddress]);

  const loadDepositedBalance = useCallback(async () => {
    if (!stxAddress) {
      setDepositedBalance(null);
      setBalanceError(null);
      return;
    }

    setIsBalanceLoading(true);
    setBalanceError(null);

    try {
      const key = tupleCV({ user: standardPrincipalCV(stxAddress) });
      const entry = await fetchContractMapEntry({
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: STACKS_CONTRACT_NAME,
        mapName: "deposits",
        mapKey: key,
        network: activeNetwork,
      });

      if (entry.type === ClarityType.OptionalNone) {
        setDepositedBalance(0n);
        return;
      }

      const parsed = cvToValue(entry);
      const normalized = toMicrostxAmount(extractMapAmount(parsed));
      setDepositedBalance(normalized ?? 0n);
    } catch (error) {
      setBalanceError(
        error instanceof Error ? error.message : "Failed to load deposit.",
      );
    } finally {
      setIsBalanceLoading(false);
    }
  }, [activeNetwork, stxAddress]);

  const loadBorrowedBalance = useCallback(async () => {
    if (!stxAddress) {
      setBorrowedBalance(null);
      setBorrowError(null);
      return;
    }

    setIsBorrowLoading(true);
    setBorrowError(null);

    try {
      const key = tupleCV({ user: standardPrincipalCV(stxAddress) });
      const entry = await fetchContractMapEntry({
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: STACKS_CONTRACT_NAME,
        mapName: "borrows",
        mapKey: key,
        network: activeNetwork,
      });

      if (entry.type === ClarityType.OptionalNone) {
        setBorrowedBalance(0n);
        return;
      }

      const parsed = cvToValue(entry);
      const normalized = toMicrostxAmount(extractMapAmount(parsed));
      setBorrowedBalance(normalized ?? 0n);
    } catch (error) {
      setBorrowError(
        error instanceof Error ? error.message : "Failed to load borrow.",
      );
    } finally {
      setIsBorrowLoading(false);
    }
  }, [activeNetwork, stxAddress]);

  const refreshBalanceAfterTx = useCallback(async () => {
    if (!isConnected) return;
    await loadDepositedBalance();
    await loadBorrowedBalance();
    for (const waitMs of [4000, 6000, 10000]) {
      await delay(waitMs);
      await loadDepositedBalance();
      await loadBorrowedBalance();
    }
  }, [isConnected, loadBorrowedBalance, loadDepositedBalance]);

  useEffect(() => {
    if (!isConnected) {
      setDepositedBalance(null);
      setBalanceError(null);
      setBorrowedBalance(null);
      setBorrowError(null);
      return;
    }

    void loadDepositedBalance();
    void loadBorrowedBalance();
  }, [isConnected, loadBorrowedBalance, loadDepositedBalance]);

  useEffect(() => {
    if (!isConnected) return undefined;
    const interval = setInterval(() => {
      void loadDepositedBalance();
      void loadBorrowedBalance();
    }, 20000);
    return () => clearInterval(interval);
  }, [isConnected, loadBorrowedBalance, loadDepositedBalance]);

  const pollTransaction = useCallback(
    async (txId: string) => {
      const url = `${activeNetwork.client.baseUrl}/extended/v1/tx/${txId}`;
      for (const waitMs of [2000, 4000, 6000, 8000, 12000]) {
        await delay(waitMs);
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = (await response.json()) as {
            tx_status?: string;
            tx_result?: { repr?: string };
          };
          const status = data.tx_status ?? "pending";
          if (status === "success") {
            setLastTxStatus("success");
            setLastTxError(null);
            void refreshBalanceAfterTx();
            return;
          }
          if (status.startsWith("abort") || status.startsWith("fail")) {
            setLastTxStatus("failed");
            setLastTxError(data.tx_result?.repr ?? "Transaction failed.");
            return;
          }
          setLastTxStatus("pending");
        } catch (error) {
          setLastTxError(
            error instanceof Error ? error.message : "Failed to check status.",
          );
        }
      }
    },
    [activeNetwork, refreshBalanceAfterTx],
  );

  const handleMaxWithdraw = () => {
    if (!depositedBalance || depositedBalance <= 0n) return;
    setAmount(formatMicrostxToStx(depositedBalance));
  };

  const submit = async (action: ActionType) => {
    if (!isConnected) {
      setFeedback("Connect your wallet first.");
      return;
    }

    if (action === "repay") {
      // Repay has no amount in the current contract.
    } else if (action === "borrow") {
      if (!parsedBorrowAmount || !parsedCollateralAmount) {
        setFeedback("Enter collateral and borrow amounts (up to 6 decimals).");
        return;
      }
    } else {
      if (!parsedAmount) {
        setFeedback("Enter a valid amount (up to 6 decimals).");
        return;
      }
    }

    if (action === "deposit" && hasActiveDeposit) {
      setFeedback("You must withdraw before making a new deposit.");
      return;
    }

    if (action === "withdraw" && depositedBalance !== null && parsedAmount) {
      if (parsedAmount > depositedBalance) {
        setFeedback("Amount exceeds your deposited balance.");
        return;
      }
    }

    setIsWorking(true);
    setFeedback(null);
    setLastTxId(null);

    try {
      const args =
        action === "borrow"
          ? [
              uintCV(parsedCollateralAmount ?? 0n),
              uintCV(parsedBorrowAmount ?? 0n),
            ]
          : action === "repay"
            ? []
            : [uintCV(parsedAmount ?? 0n)];

      const message =
        action === "repay"
          ? "Repay submitted."
          : action === "borrow"
            ? `Borrow submitted for ${formatMicrostxToStx(
                parsedBorrowAmount ?? 0n,
              )} STX.`
            : `${action === "deposit" ? "Deposit" : "Withdraw"} submitted for ${formatMicrostxToStx(
                parsedAmount ?? 0n,
              )} STX.`;

      await openContractCall({
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: STACKS_CONTRACT_NAME,
        functionName:
          action === "deposit"
            ? "deposit-stx"
            : action === "withdraw"
              ? "withdraw-stx"
              : action === "borrow"
                ? "borrow-stx"
                : "repay",
        functionArgs: args,
        network: activeNetwork,
        appDetails: STACKS_APP_DETAILS,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setLastTxId(data.txId);
          setLastTxStatus("pending");
          setLastTxError(null);
          setFeedback(message);
          setIsWorking(false);
          void pollTransaction(data.txId);
        },
        onCancel: () => {
          setFeedback("Transaction cancelled.");
          setIsWorking(false);
        },
      });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to open wallet.",
      );
      setIsWorking(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Lending pool
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          Deposit, borrow, and manage STX
        </h2>
        <p className="text-sm text-slate-600">
          Contract: {STACKS_CONTRACT_ADDRESS}.{STACKS_CONTRACT_NAME}
        </p>
        {networkMismatch ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {networkMismatch}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ActionCard title="Deposit & Withdraw" subtitle="STX liquidity">
          <AmountField
            label="Amount (STX)"
            value={amount}
            onChange={setAmount}
            hint={
              parsedAmount
                ? `${parsedAmount.toString()} microstacks`
                : "Enter a number with up to 6 decimals."
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton
              onClick={() => submit("deposit")}
              disabled={!canSubmit || hasActiveDeposit}
            >
              Deposit STX
            </PrimaryButton>
            <SecondaryButton onClick={() => submit("withdraw")} disabled={!canSubmit}>
              Withdraw STX
            </SecondaryButton>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <GhostButton
              onClick={handleMaxWithdraw}
              disabled={
                !isConnected ||
                depositedBalance === null ||
                depositedBalance <= 0n ||
                isWorking
              }
            >
              Max withdraw
            </GhostButton>
            {hasActiveDeposit ? (
              <span className="text-xs text-orange-700">
                You already have a deposit. Withdraw first to deposit again.
              </span>
            ) : null}
          </div>
        </ActionCard>

        <ActionCard title="Borrow & Repay" subtitle="STX credit line">
          <AmountField
            label="Collateral amount"
            value={collateralAmount}
            onChange={setCollateralAmount}
            hint={
              parsedCollateralAmount
                ? `${parsedCollateralAmount.toString()} microstacks`
                : "Enter a number with up to 6 decimals."
            }
          />
          <AmountField
            label="Borrow amount (STX)"
            value={borrowAmount}
            onChange={setBorrowAmount}
            hint={
              parsedBorrowAmount
                ? `${parsedBorrowAmount.toString()} microstacks`
                : "Enter a number with up to 6 decimals."
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton onClick={() => submit("borrow")} disabled={!canBorrow}>
              Borrow STX
            </PrimaryButton>
            <SecondaryButton onClick={() => submit("repay")} disabled={!isConnected}>
              Repay (full)
            </SecondaryButton>
          </div>
        </ActionCard>
      </div>

      {!isConnected ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={connect}
            className="h-11 w-full rounded-xl border border-orange-200 text-sm font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 sm:w-auto sm:px-6"
            disabled={isLoading || isPending}
          >
            Connect wallet to continue
          </button>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl bg-orange-50/70 px-4 py-3 text-sm text-slate-700">
        <div>
          Wallet: {stxAddress ? `${stxAddress}` : "Not connected"}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            Deposited:{" "}
            {depositedBalance === null
              ? "-"
              : `${formatMicrostxToStx(depositedBalance)} STX`}
          </span>
          <span>
            Borrowed:{" "}
            {borrowedBalance === null
              ? "-"
              : `${formatMicrostxToStx(borrowedBalance)} STX`}
          </span>
          <GhostButton
            onClick={() => {
              void loadDepositedBalance();
              void loadBorrowedBalance();
            }}
            disabled={!isConnected || isBalanceLoading || isBorrowLoading}
          >
            {isBalanceLoading || isBorrowLoading ? "Loading..." : "Refresh"}
          </GhostButton>
        </div>
        {borrowedBalance === 0n ? (
          <div className="text-xs text-slate-500">
            Borrowed balance is read from the on-chain map. The current borrow
            function does not update it yet.
          </div>
        ) : null}
        <div>
          Repay amount:{" "}
          {borrowedBalance === null
            ? "-"
            : `${formatMicrostxToStx(borrowedBalance)} STX`}
        </div>
        <div>
          Liquidated: {borrowedBalance === null ? "-" : "Unknown"}
        </div>
        <div>Network: {networkLabel}</div>
      </div>

      {balanceError ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {balanceError}
        </div>
      ) : null}
      {borrowError ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {borrowError}
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
          {feedback}
        </div>
      ) : null}

      {lastTxStatus !== "idle" ? (
        <div className="mt-3 rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-orange-700">
            Tx status:
          </span>{" "}
          {lastTxStatus}
          {lastTxError ? ` (${lastTxError})` : ""}
        </div>
      ) : null}

      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-orange-600 hover:text-orange-500"
        >
          View transaction on Explorer
        </a>
      ) : null}
    </div>
  );
}

type AmountFieldProps = {
  label: string;
  value: string;
  hint: string;
  onChange: (value: string) => void;
};

function AmountField({ label, value, hint, onChange }: AmountFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-xl border border-orange-100 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        placeholder="0.0"
      />
      <span className="text-xs text-slate-500">{hint}</span>
    </label>
  );
}

type ActionCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

function ActionCard({ title, subtitle, children }: ActionCardProps) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-xs uppercase tracking-[0.18em] text-orange-600">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

function PrimaryButton({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 rounded-xl bg-orange-500 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 rounded-xl border border-orange-200 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-orange-100 disabled:text-slate-400"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 rounded-xl border border-orange-100 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-orange-200"
    >
      {children}
    </button>
  );
}

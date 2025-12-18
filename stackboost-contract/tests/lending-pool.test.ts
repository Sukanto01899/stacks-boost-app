import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const lendingPool = "stackslend-v2";
const oracle = "mock-oracle-v2";
const sbtcToken = "mock-sbtc-token-v2";

function initOracle(price: bigint) {
  const init = simnet.callPublicFn(
    oracle,
    "initialize",
    [Cl.principal(wallet1)],
    deployer,
  );
  expect(init.result).toBeOk(Cl.bool(true));

  const upd = simnet.callPublicFn(
    oracle,
    "update-price",
    [Cl.uint(price)],
    wallet1,
  );
  expect(upd.result).toBeOk(Cl.bool(true));
}

describe("Lending Pool Contract", () => {
  it("initializes core data vars", () => {
    expect(simnet.getDataVar(lendingPool, "total-sbtc-collateral")).toStrictEqual(
      Cl.uint(0),
    );
    expect(simnet.getDataVar(lendingPool, "total-stx-deposits")).toStrictEqual(
      Cl.uint(0),
    );
    expect(simnet.getDataVar(lendingPool, "total-stx-borrows")).toStrictEqual(
      Cl.uint(0),
    );
  });

  it("rejects zero deposits and allows multiple deposits", () => {
    const zero = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(0)],
      wallet1,
    );
    expect(zero.result).toBeErr(Cl.uint(111));

    const first = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(5000)],
      wallet1,
    );
    expect(first.result).toBeOk(Cl.bool(true));

    const second = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(2500)],
      wallet1,
    );
    expect(second.result).toBeOk(Cl.bool(true));
  });

  it("supports deposit and withdraw", () => {
    const deposit = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(10000)],
      wallet1,
    );
    expect(deposit.result).toBeOk(Cl.bool(true));

    const withdraw = simnet.callPublicFn(
      lendingPool,
      "withdraw-stx",
      [Cl.uint(4000)],
      wallet1,
    );
    expect(withdraw.result).toBeOk(Cl.bool(true));
  });

  it("borrows against mock sBTC and repays", () => {
    initOracle(100n);

    const mint = simnet.callPublicFn(
      sbtcToken,
      "mint",
      [Cl.uint(10), Cl.principal(wallet2)],
      deployer,
    );
    expect(mint.result).toBeOk(Cl.bool(true));

    const deposit = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(10000)],
      wallet1,
    );
    expect(deposit.result).toBeOk(Cl.bool(true));

    const borrow = simnet.callPublicFn(
      lendingPool,
      "borrow-stx",
      [Cl.uint(10), Cl.uint(500)],
      wallet2,
    );
    expect(borrow.result).toBeOk(Cl.bool(true));

    const repay = simnet.callPublicFn(lendingPool, "repay", [], wallet2);
    expect(repay.result).toBeOk(Cl.bool(true));

    const debt = simnet.callReadOnlyFn(
      lendingPool,
      "get-debt",
      [Cl.principal(wallet2)],
      deployer,
    );
    expect(debt.result).toBeOk(Cl.uint(0));

    const collateral = simnet.callReadOnlyFn(
      lendingPool,
      "get-collateral",
      [Cl.principal(wallet2)],
      deployer,
    );
    expect(collateral.result).toBeOk(Cl.uint(0));
  });

  it("rejects borrow when oracle price is zero", () => {
    initOracle(0n);

    const mint = simnet.callPublicFn(
      sbtcToken,
      "mint",
      [Cl.uint(5), Cl.principal(wallet2)],
      deployer,
    );
    expect(mint.result).toBeOk(Cl.bool(true));

    const deposit = simnet.callPublicFn(
      lendingPool,
      "deposit-stx",
      [Cl.uint(5000)],
      wallet1,
    );
    expect(deposit.result).toBeOk(Cl.bool(true));

    const borrow = simnet.callPublicFn(
      lendingPool,
      "borrow-stx",
      [Cl.uint(5), Cl.uint(100)],
      wallet2,
    );
    expect(borrow.result).toBeErr(Cl.uint(113));
  });

  it("rejects repay when no debt exists", () => {
    const repay = simnet.callPublicFn(lendingPool, "repay", [], wallet1);
    expect(repay.result).toBeErr(Cl.uint(100));
  });
});

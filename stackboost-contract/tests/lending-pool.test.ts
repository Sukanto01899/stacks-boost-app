import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const lendingPool = "stackslend-v4";
const oracle = "mock-oracle-v4";

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


  it("rejects repay when no debt exists", () => {
    const repay = simnet.callPublicFn(lendingPool, "repay", [], wallet1);
    expect(repay.result).toBeErr(Cl.uint(100));
  });
});

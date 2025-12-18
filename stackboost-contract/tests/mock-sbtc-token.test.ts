import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const sbtcToken = "mock-sbtc-token-v2";

describe("Mock sBTC Token", () => {
  it("mints and transfers tokens", () => {
    const mint = simnet.callPublicFn(
      sbtcToken,
      "mint",
      [Cl.uint(100), Cl.principal(wallet1)],
      deployer,
    );
    expect(mint.result).toBeOk(Cl.bool(true));

    const transfer = simnet.callPublicFn(
      sbtcToken,
      "transfer",
      [Cl.uint(25), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
      wallet1,
    );
    expect(transfer.result).toBeOk(Cl.bool(true));

    const balance1 = simnet.callReadOnlyFn(
      sbtcToken,
      "get-balance",
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(balance1.result).toBeOk(Cl.uint(75));

    const balance2 = simnet.callReadOnlyFn(
      sbtcToken,
      "get-balance",
      [Cl.principal(wallet2)],
      deployer,
    );
    expect(balance2.result).toBeOk(Cl.uint(25));
  });

  it("prevents unauthorized mint and burn", () => {
    const mint = simnet.callPublicFn(
      sbtcToken,
      "mint",
      [Cl.uint(10), Cl.principal(wallet1)],
      wallet1,
    );
    expect(mint.result).toBeErr(Cl.uint(100));

    const burn = simnet.callPublicFn(
      sbtcToken,
      "burn",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet2,
    );
    expect(burn.result).toBeErr(Cl.uint(100));
  });

  it("allows owner to burn their tokens", () => {
    const mint = simnet.callPublicFn(
      sbtcToken,
      "mint",
      [Cl.uint(10), Cl.principal(wallet1)],
      deployer,
    );
    expect(mint.result).toBeOk(Cl.bool(true));

    const burn = simnet.callPublicFn(
      sbtcToken,
      "burn",
      [Cl.uint(4), Cl.principal(wallet1)],
      wallet1,
    );
    expect(burn.result).toBeOk(Cl.bool(true));

    const balance = simnet.callReadOnlyFn(
      sbtcToken,
      "get-balance",
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(balance.result).toBeOk(Cl.uint(6));
  });
});

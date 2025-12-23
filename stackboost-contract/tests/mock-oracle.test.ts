import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const contractName = "mock-oracle-v4";

describe("Mock Oracle Contract Tests", () => {
  describe("Initialization", () => {
    it("should initialize with correct owner and updater", () => {
      const result = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify initialized status
      const isInitialized = simnet.callReadOnlyFn(
        contractName,
        "is-initialized",
        [],
        deployer,
      );
      expect(isInitialized.result).toBeBool(true);

      // Verify updater is set correctly
      const updater = simnet.callReadOnlyFn(
        contractName,
        "get-updater",
        [],
        deployer,
      );
      expect(updater.result).toBeSome(Cl.principal(wallet1));
    });

    it("should not allow non-owner to initialize", () => {
      // First, deployer initializes (becomes owner)
      const initDeployer = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(initDeployer.result).toBeOk(Cl.bool(true));

      // Now wallet2 tries to initialize, but wallet2 is not the owner
      // The owner check happens before the initialized check, so it should fail with ERR_NOT_OWNER
      const result = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet2)],
        wallet2,
      );

      // Should fail because wallet2 is not the owner (deployer is)
      expect(result.result).toBeErr(Cl.uint(100)); // ERR_NOT_OWNER
    });

    it("should prevent re-initialization", () => {
      // First initialization
      const init1 = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init1.result).toBeOk(Cl.bool(true));

      // Attempt second initialization
      const init2 = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet2)],
        deployer,
      );
      expect(init2.result).toBeErr(Cl.uint(101)); // ERR_ALREADY_INITIALIZED
    });
  });

  describe("Price Updates", () => {
    it("should allow updater to update price", () => {
      // Initialize first
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      // Update price as updater
      const newPrice = Cl.uint(50000);
      const result = simnet.callPublicFn(
        contractName,
        "update-price",
        [newPrice],
        wallet1,
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify price was updated
      const price = simnet.callReadOnlyFn(
        contractName,
        "get-price",
        [],
        deployer,
      );
      expect(price.result).toBeOk(newPrice);
    });

    it("should not allow non-updater to update price", () => {
      // Initialize with wallet1 as updater
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      // Attempt to update price as wallet2 (not the updater)
      const newPrice = Cl.uint(50000);
      const result = simnet.callPublicFn(
        contractName,
        "update-price",
        [newPrice],
        wallet2,
      );

      expect(result.result).toBeErr(Cl.uint(102)); // ERR_NOT_UPDATER
    });

    it("should not allow price update if contract is not initialized", () => {
      // Attempt to update price without initializing
      const newPrice = Cl.uint(50000);
      const result = simnet.callPublicFn(
        contractName,
        "update-price",
        [newPrice],
        wallet1,
      );

      expect(result.result).toBeErr(Cl.uint(103)); // ERR_NOT_INITIALIZED
    });
  });

  describe("Read-Only Functions", () => {
    it("should return correct price value", () => {
      // Initialize and set price
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      const expectedPrice = Cl.uint(75000);
      const update = simnet.callPublicFn(
        contractName,
        "update-price",
        [expectedPrice],
        wallet1,
      );
      expect(update.result).toBeOk(Cl.bool(true));

      // Get price
      const price = simnet.callReadOnlyFn(
        contractName,
        "get-price",
        [],
        deployer,
      );
      expect(price.result).toBeOk(expectedPrice);
    });

    it("should return initial price as zero", () => {
      // Get price before any updates
      const price = simnet.callReadOnlyFn(
        contractName,
        "get-price",
        [],
        deployer,
      );
      expect(price.result).toBeOk(Cl.uint(0));
    });

    it("should return correct updater address", () => {
      // Initialize with wallet1 as updater
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      // Get updater
      const updater = simnet.callReadOnlyFn(
        contractName,
        "get-updater",
        [],
        deployer,
      );
      expect(updater.result).toBeSome(Cl.principal(wallet1));
    });

    it("should return none for updater before initialization", () => {
      // Get updater before initialization
      const updater = simnet.callReadOnlyFn(
        contractName,
        "get-updater",
        [],
        deployer,
      );
      expect(updater.result).toBeNone();
    });

    it("should correctly track initialization status", () => {
      // Check status before initialization
      const statusBefore = simnet.callReadOnlyFn(
        contractName,
        "is-initialized",
        [],
        deployer,
      );
      expect(statusBefore.result).toBeBool(false);

      // Initialize
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      // Check status after initialization
      const statusAfter = simnet.callReadOnlyFn(
        contractName,
        "is-initialized",
        [],
        deployer,
      );
      expect(statusAfter.result).toBeBool(true);
    });

    it("should expose updater and initialization state", () => {
      const init = simnet.callPublicFn(
        contractName,
        "initialize",
        [Cl.principal(wallet1)],
        deployer,
      );
      expect(init.result).toBeOk(Cl.bool(true));

      const updater = simnet.callReadOnlyFn(
        contractName,
        "get-updater",
        [],
        deployer,
      );
      expect(updater.result).toBeSome(Cl.principal(wallet1));

      const status = simnet.callReadOnlyFn(
        contractName,
        "is-initialized",
        [],
        deployer,
      );
      expect(status.result).toBeBool(true);
    });
  });
});

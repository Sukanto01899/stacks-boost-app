/// <reference types="vitest/globals" />

import { Simnet } from "@stacks/clarinet-sdk";
import { Assertion } from "vitest";

declare global {
  const simnet: Simnet;
}

declare module "vitest" {
  interface Assertion<T = any> {
    toBeOk(expected?: any): void;
    toBeErr(expected?: any): void;
    toBeBool(expected: boolean): void;
    toBeSome(expected?: any): void;
    toBeNone(): void;
    toBeUint(expected: number | bigint): void;
    toBeInt(expected: number | bigint): void;
    toBePrincipal(expected: string): void;
    toBeBuff(expected: Uint8Array | string): void;
  }
}

export {};

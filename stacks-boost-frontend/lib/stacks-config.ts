import { STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";

export const STACKS_APP_DETAILS = {
  name: "StacksLend",
  icon: "/favicon.ico",
};

export const STACKS_REDIRECT_PATH = "/";
export const STACKS_MANIFEST_PATH = "/manifest.json";

const rawNetwork = (process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet")
  .toLowerCase()
  .trim();
export const STACKS_NETWORK =
  rawNetwork === "mainnet" ? "mainnet" : "testnet";

export const STACKS_NETWORK_INSTANCE =
  STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

export const STACKS_EXPLORER_CHAIN = STACKS_NETWORK;

export const STACKS_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS ??
  "ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13";

export const STACKS_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME ?? "stackslend-v2";

export const STACKS_SBTC_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_SBTC_TOKEN_ADDRESS ?? STACKS_CONTRACT_ADDRESS;

export const STACKS_SBTC_TOKEN_NAME =
  process.env.NEXT_PUBLIC_SBTC_TOKEN_NAME ?? "mock-sbtc-token-v2";

export const STACKS_ORACLE_ADDRESS =
  process.env.NEXT_PUBLIC_ORACLE_ADDRESS ?? STACKS_CONTRACT_ADDRESS;

export const STACKS_ORACLE_NAME =
  process.env.NEXT_PUBLIC_ORACLE_NAME ?? "mock-oracle-v2";

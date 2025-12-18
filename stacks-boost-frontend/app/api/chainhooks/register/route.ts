import { NextResponse } from "next/server";

import {
  CHAINHOOKS_BASE_URL,
  ChainhookDefinition,
  ChainhooksClient,
} from "@hirosystems/chainhooks-client";

import {
  STACKS_CONTRACT_ADDRESS,
  STACKS_CONTRACT_NAME,
} from "@/lib/stacks-config";

const REQUIRED_FUNCTIONS = ["deposit-stx", "withdraw-stx", "borrow-stx", "repay"];

function buildChainhookDefinition(callbackUrl: string): ChainhookDefinition {
  const contractId = `${STACKS_CONTRACT_ADDRESS}.${STACKS_CONTRACT_NAME}`;

  return {
    name: "Stacks Boost - Contract Calls",
    version: "1",
    chain: "stacks",
    network: "mainnet",
    filters: {
      events: REQUIRED_FUNCTIONS.map((functionName) => ({
        type: "contract_call",
        contract_identifier: contractId,
        function_name: functionName,
      })),
    },
    options: {
      decode_clarity_values: true,
      include_block_metadata: true,
      include_raw_transactions: false,
    },
    action: {
      type: "http_post",
      url: callbackUrl,
    },
  };
}

export async function POST() {
  const apiKey = process.env.CHAINHOOKS_API_KEY;
  const callbackUrl = process.env.CHAINHOOKS_CALLBACK_URL;

  if (!apiKey || !callbackUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing CHAINHOOKS_API_KEY or CHAINHOOKS_CALLBACK_URL environment variables.",
      },
      { status: 400 },
    );
  }

  const client = new ChainhooksClient({
    baseUrl: CHAINHOOKS_BASE_URL.mainnet,
    apiKey,
  });

  try {
    const definition = buildChainhookDefinition(callbackUrl);
    const result = await client.registerChainhook(definition);
    return NextResponse.json({ ok: true, chainhook: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to register.",
      },
      { status: 500 },
    );
  }
}

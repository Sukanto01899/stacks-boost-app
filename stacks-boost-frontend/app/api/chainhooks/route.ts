import { NextResponse } from "next/server";

import {
  STACKS_CONTRACT_ADDRESS,
  STACKS_CONTRACT_NAME,
} from "@/lib/stacks-config";
import { addChainhookEvent } from "@/lib/chainhook-store";

type ChainhookPayload = {
  apply?: Array<{
    block_identifier?: { index?: number };
    transaction?: {
      tx_id?: string;
      tx_type?: string;
      contract_call?: {
        contract_id?: string;
        function_name?: string;
      };
    };
  }>;
  rollback?: Array<unknown>;
};

export async function POST(request: Request) {
  const contractId = `${STACKS_CONTRACT_ADDRESS}.${STACKS_CONTRACT_NAME}`;

  try {
    const payload = (await request.json()) as ChainhookPayload;
    const applyList = Array.isArray(payload.apply) ? payload.apply : [];

    applyList.forEach((item) => {
      const tx = item.transaction;
      if (!tx || tx.tx_type !== "contract_call") return;
      const call = tx.contract_call;
      if (!call || call.contract_id !== contractId) return;
      if (!tx.tx_id || !call.function_name) return;

      addChainhookEvent({
        id: `${tx.tx_id}-${Date.now()}`,
        txId: tx.tx_id,
        functionName: call.function_name,
        contractId: call.contract_id,
        blockHeight: item.block_identifier?.index,
        receivedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid payload",
      },
      { status: 400 },
    );
  }
}

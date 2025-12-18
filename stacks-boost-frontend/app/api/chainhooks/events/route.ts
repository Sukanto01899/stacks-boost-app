import { NextResponse } from "next/server";

import { listChainhookEvents } from "@/lib/chainhook-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 10;
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 10;

  return NextResponse.json({
    ok: true,
    events: listChainhookEvents(safeLimit),
  });
}

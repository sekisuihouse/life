import { NextResponse } from "next/server";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await buildSafetySnapshot();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

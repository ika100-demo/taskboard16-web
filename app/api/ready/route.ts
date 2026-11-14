import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Readiness deliberately does not check the Task API, so the start page can show
 * its error message while the API is down (AC-001.8).
 */
export function GET() {
  return NextResponse.json({ status: "ready" });
}

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "menu-platform-backend",
    timestamp: new Date().toISOString(),
  });
}

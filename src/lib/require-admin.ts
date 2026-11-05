
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function requireAdmin() {
  const isAuthenticated = await verifySession();

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

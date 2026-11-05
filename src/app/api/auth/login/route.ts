
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Admin credentials are not configured" },
        { status: 500 }
      );
    }

    if (
      body.username !== username ||
      body.password !== password
    ) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    await createSession();

    return NextResponse.json({
      message: "Login successful",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process login" },
      { status: 500 }
    );
  }
}

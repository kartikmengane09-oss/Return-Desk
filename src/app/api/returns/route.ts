import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const allowedReasons = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "OTHER",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      orderNumber,
      itemName,
      customerName,
      customerEmail,
      reason,
    } = body;

    if (
      !orderNumber ||
      !itemName ||
      !customerName ||
      !customerEmail ||
      !reason
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!allowedReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid return reason." },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.returnRequest.findFirst({
      where: {
        orderNumber,
        itemName,
        isDeleted: false,
        status: {
          notIn: ["REJECTED", "COMPLETED"],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "An active return request already exists for this order item.",
        },
        { status: 409 }
      );
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderNumber,
        itemName,
        customerName,
        customerEmail,
        reason,
      },
    });

    return NextResponse.json(returnRequest, { status: 201 });
  } catch (error) {
    console.error("Create return request error:", error);

    return NextResponse.json(
      { error: "Unable to create return request." },
      { status: 500 }
    );
  }
}
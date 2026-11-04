import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReturnReason } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 10))
    );

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "orderNumber",
      "customerName",
      "status",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const where = {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" as const } },
              { itemName: { contains: search, mode: "insensitive" as const } },
              { customerName: { contains: search, mode: "insensitive" as const } },
              { customerEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status ? { status: status as any } : {}),
      ...(reason ? { reason: reason as ReturnReason } : {}),
    };

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [safeSortBy]: sortOrder,
        },
      }),
      prisma.returnRequest.count({ where }),
    ]);

    return NextResponse.json({
      data: returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/returns error:", error);

    return NextResponse.json(
      { error: "Failed to fetch return requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = [
      "orderNumber",
      "itemName",
      "customerName",
      "customerEmail",
      "reason",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const createdReturn = await prisma.returnRequest.create({
      data: {
        orderNumber: body.orderNumber,
        itemName: body.itemName,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        reason: body.reason,
      },
    });

    return NextResponse.json(createdReturn, { status: 201 });
  } catch (error) {
    console.error("POST /api/returns error:", error);

    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}
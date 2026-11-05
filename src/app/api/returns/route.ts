import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  ReturnReason,
  ReturnStatus,
} from "@prisma/client";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const DUPLICATE_ORDER_MESSAGE =
  "A return request already exists for this order number.";

function getReturnsListErrorMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  ) {
    return "The database schema is out of date. Apply the latest Prisma migration and try again.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Unable to connect to the returns database. Check the database connection and try again.";
  }

  return "Unable to load return requests from the database";
}

function isReturnStatus(status: string | null): status is ReturnStatus {
  return (
    status !== null &&
    Object.values(ReturnStatus).includes(status as ReturnStatus)
  );
}

function isReturnReason(reason: string | null): reason is ReturnReason {
  return (
    reason !== null &&
    Object.values(ReturnReason).includes(reason as ReturnReason)
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number
) {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    unauthorized.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const page = parsePositiveInteger(searchParams.get("page"), 1, 1_000_000);
    const limit = parsePositiveInteger(searchParams.get("limit"), 10, 100);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "orderNumber",
      "customerName",
      "status",
    ]);

    if (
      page === null ||
      limit === null ||
      !allowedSortFields.has(sortBy) ||
      (sortOrder !== "asc" && sortOrder !== "desc") ||
      (status !== null && !isReturnStatus(status)) ||
      (reason !== null && !isReturnReason(reason))
    ) {
      return NextResponse.json(
        { error: "Invalid search, filter, sort, or pagination parameters" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const where: Prisma.ReturnRequestWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" } },
              { orderNumber: { contains: search, mode: "insensitive" as const } },
              { itemName: { contains: search, mode: "insensitive" as const } },
              { customerName: { contains: search, mode: "insensitive" as const } },
              { customerEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(isReturnStatus(status) ? { status } : {}),
      ...(isReturnReason(reason) ? { reason } : {}),
    };

    const total = await prisma.returnRequest.count({ where });
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(page, Math.max(totalPages, 1));
    const returns = await prisma.returnRequest.findMany({
      where,
      skip: (currentPage - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json(
      {
        data: returns,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
          hasPreviousPage: currentPage > 1,
          hasNextPage: currentPage * limit < total,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("GET /api/returns error:", error);

    return NextResponse.json(
      { error: getReturnsListErrorMessage(error) },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }
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
        { status: 400, headers: NO_STORE_HEADERS }
        );
      }
    }

    const existingReturn = await prisma.returnRequest.findUnique({
      where: { orderNumber: body.orderNumber },
      select: { id: true },
    });

    if (existingReturn) {
      return NextResponse.json(
        { error: DUPLICATE_ORDER_MESSAGE },
        { status: 409 }
      );
    }

    let createdReturn;

    try {
      createdReturn = await prisma.returnRequest.create({
        data: {
          orderNumber: body.orderNumber,
          itemName: body.itemName,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          reason: body.reason,
        },
      });
    } catch (error) {
      // The database constraint protects against requests that pass the
      // pre-check concurrently.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: DUPLICATE_ORDER_MESSAGE },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json(createdReturn, { status: 201 });
  } catch (error) {
    console.error("POST /api/returns error:", error);

    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}

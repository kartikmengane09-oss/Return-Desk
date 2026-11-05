
import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  ReturnReason,
  ReturnResolution,
  ReturnStatus,
} from "@prisma/client";
import {
  canEditRequest,
  canPerformAction,
  canSoftDelete,
  validateResolution,
} from "@/lib/return-rules";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DUPLICATE_ORDER_MESSAGE =
  "A return request already exists for this order number.";

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await context.params;
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    if (returnRequest.deletedAt) {
      return NextResponse.json(
        { error: "This return request is archived and is not available on the active desk" },
        { status: 410 }
      );
    }

    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error("GET /api/returns/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch return request" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await context.params;
    const { content } = await request.json();
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!trimmedContent) {
      return NextResponse.json(
        { error: "A note cannot be empty" },
        { status: 400 }
      );
    }

    const existingReturn = await prisma.returnRequest.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!existingReturn) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    if (existingReturn.deletedAt) {
      return NextResponse.json(
        { error: "Cannot add notes to an archived return request" },
        { status: 409 }
      );
    }

    const note = await prisma.note.create({
      data: {
        content: trimmedContent,
        returnRequestId: id,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/returns/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const { action, resolution, refundAmount } = body;

    const existingReturn = await prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!existingReturn) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    if (action === "UPDATE_DETAILS") {
      if (!canEditRequest(existingReturn.status)) {
        return NextResponse.json(
          { error: "Only open or in-review requests can be edited" },
          { status: 400 }
        );
      }

      const updates: Prisma.ReturnRequestUpdateInput = {};

      for (const field of [
        "orderNumber",
        "itemName",
        "customerName",
        "customerEmail",
      ] as const) {
        if (body[field] !== undefined) {
          if (typeof body[field] !== "string" || !body[field].trim()) {
            return NextResponse.json(
              { error: `${field} must be a non-empty string` },
              { status: 400 }
            );
          }

          updates[field] = body[field].trim();
        }
      }

      if (body.reason !== undefined) {
        if (!Object.values(ReturnReason).includes(body.reason)) {
          return NextResponse.json(
            { error: "A valid return reason is required" },
            { status: 400 }
          );
        }

        updates.reason = body.reason;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: "Provide at least one field to update" },
          { status: 400 }
        );
      }

      try {
        const updatedReturn = await prisma.returnRequest.update({
          where: { id },
          data: updates,
        });

        return NextResponse.json(updatedReturn);
      } catch (error) {
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
    }

    if (existingReturn.deletedAt) {
      return NextResponse.json(
        { error: "This return request is already archived" },
        { status: 409 }
      );
    }

    if (action === "ARCHIVE") {
      if (!canSoftDelete(existingReturn.status)) {
        return NextResponse.json(
          {
            error: `Cannot archive a request when status is ${existingReturn.status}`,
          },
          { status: 400 }
        );
      }

      const archiveResult = await prisma.returnRequest.updateMany({
        where: {
          id,
          deletedAt: null,
          status: existingReturn.status,
        },
        data: { deletedAt: new Date() },
      });

      if (archiveResult.count === 0) {
        return NextResponse.json(
          { error: "This return request was already archived or changed" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        message: "Return request archived. It remains stored with its notes.",
        data: { id },
      });
    }

    const actionToStatus: Record<string, ReturnStatus> = {
      START_REVIEW: "IN_REVIEW",
      APPROVE: "APPROVED",
      REJECT: "REJECTED",
      COMPLETE: "COMPLETED",
    };

    const nextStatus = actionToStatus[action];

    if (!nextStatus) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (!canPerformAction(existingReturn.status, action)) {
      return NextResponse.json(
        {
          error: `Cannot perform ${action} when status is ${existingReturn.status}`,
        },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      if (!resolution || !Object.values(ReturnResolution).includes(resolution)) {
        return NextResponse.json(
          { error: "A valid resolution is required for approval" },
          { status: 400 }
        );
      }

      const parsedRefundAmount =
        refundAmount !== undefined ? Number(refundAmount) : undefined;

      if (
        !validateResolution(
          resolution as ReturnResolution,
          parsedRefundAmount
        )
      ) {
        return NextResponse.json(
          { error: "A valid refund amount is required for refunds" },
          { status: 400 }
        );
      }

      const updatedReturn = await prisma.returnRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          resolution,
          refundAmount:
            parsedRefundAmount !== undefined
              ? parsedRefundAmount
              : null,
        },
      });

      return NextResponse.json(updatedReturn);
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: nextStatus,
      },
    });

    return NextResponse.json(updatedReturn);
  } catch (error) {
    console.error("PATCH /api/returns/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to update return request" },
      { status: 500 }
    );
  }
}

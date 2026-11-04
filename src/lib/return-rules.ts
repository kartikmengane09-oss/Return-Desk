import {
  ReturnStatus,
  ReturnResolution,
} from "@prisma/client";

export function canPerformAction(
  currentStatus: ReturnStatus,
  action: "START_REVIEW" | "APPROVE" | "REJECT" | "COMPLETE"
) {
  const allowedActions: Record<ReturnStatus, string[]> = {
    OPEN: ["START_REVIEW"],
    IN_REVIEW: ["APPROVE", "REJECT"],
    APPROVED: ["COMPLETE"],
    REJECTED: [],
    COMPLETED: [],
  };

  return allowedActions[currentStatus].includes(action);
}

export function validateResolution(
  resolution: ReturnResolution,
  refundAmount?: number
) {
  if (resolution === "REFUND") {
    return refundAmount !== undefined && refundAmount > 0;
  }

  return true;
}

export function isFinalStatus(status: ReturnStatus) {
  return status === "REJECTED" || status === "COMPLETED";
}

export function canEditRequest(status: ReturnStatus) {
  return status === "OPEN";
}

export function canSoftDelete(status: ReturnStatus) {
  return status === "OPEN" || status === "REJECTED";
}``
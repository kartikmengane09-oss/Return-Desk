export type ReturnStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export type Resolution =
  | "REFUND"
  | "REPLACEMENT"
  | "STORE_CREDIT";

export type ReturnRequestData = {
  status: ReturnStatus;
  resolution: Resolution | null;
  refundAmount: number | null;
};

export type ReturnAction =
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "COMPLETE";

export function canPerformAction(
  status: ReturnStatus,
  action: ReturnAction
): boolean {
  switch (action) {
    case "START_REVIEW":
      return status === "OPEN";

    case "APPROVE":
    case "REJECT":
      return status === "IN_REVIEW";

    case "COMPLETE":
      return status === "APPROVED";

    default:
      return false;
  }
}

export function validateResolution(
  resolution: Resolution | null,
  refundAmount: number | null
): string | null {
  if (!resolution) {
    return "A resolution is required.";
  }

  if (resolution === "REFUND") {
    if (
      refundAmount === null ||
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      return "Refund amount must be greater than zero.";
    }
  } else if (refundAmount !== null) {
    return "Refund amount is only allowed for refund resolutions.";
  }

  return null;
}

export function isFinalStatus(status: ReturnStatus): boolean {
  return status === "REJECTED" || status === "COMPLETED";
}

export function canEditRequest(status: ReturnStatus): boolean {
  return !isFinalStatus(status) && status !== "APPROVED";
}

export function canSoftDelete(status: ReturnStatus): boolean {
  return status === "OPEN" || status === "REJECTED";
}
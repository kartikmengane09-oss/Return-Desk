
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ReturnRequest = {
  id: string;
  orderNumber: string;
  itemName: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  status: string;
  resolution: string | null;
  refundAmount: number | null;
  createdAt: string;
};

type ReturnAction =
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "COMPLETE"
  | "ARCHIVE";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

const initialForm = {
  orderNumber: "",
  itemName: "",
  customerName: "",
  customerEmail: "",
  reason: "DAMAGED",
};

const statusOptions = ["OPEN", "IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"];
const reasonOptions = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "OTHER",
];

function statusBadgeClass(status: string) {
  const classes: Record<string, string> = {
    OPEN: "bg-amber-100 text-amber-900 ring-amber-200",
    IN_REVIEW: "bg-amber-100 text-amber-900 ring-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    COMPLETED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    REJECTED: "bg-red-100 text-red-900 ring-red-200",
  };

  return classes[status] || "bg-slate-100 text-slate-800 ring-slate-200";
}

export default function Home() {
  const router = useRouter();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formHasError, setFormHasError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionErrorReturnId, setActionErrorReturnId] = useState<
    string | null
  >(null);
  const [archiveConfirmReturnId, setArchiveConfirmReturnId] = useState<
    string | null
  >(null);
  const [approvingReturnId, setApprovingReturnId] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<
   "REFUND" | "REPLACEMENT" | "STORE_CREDIT"
   >("REFUND");
  const [refundAmount, setRefundAmount] = useState("");

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (reasonFilter) {
        params.set("reason", reasonFilter);
      }

      const response = await fetch(`/api/returns?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 304) {
          throw new Error(
            "The return list received an unusable cached response. Please try again."
          );
        }

        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
          ? await response.json()
          : null;

        throw new Error(result?.error || "Failed to fetch returns");
      }

      const result = await response.json();

      setReturns(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load return requests."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, reasonFilter, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session");
        const contentType = response.headers.get("content-type");

        if (!response.ok || !contentType?.includes("application/json")) {
          const responseText = await response.text();
          console.error(
            "Session API returned:",
            response.status,
            responseText
          );
          router.replace("/login");
          return;
        }

        const result = await response.json();

        if (!result.authenticated) {
          router.replace("/login");
          return;
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error("Session check failed:", err);
        router.replace("/login");
      }
    }

    checkSession();
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (isAuthenticated) {
      const timeout = window.setTimeout(() => {
        void fetchReturns();
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [fetchReturns, isAuthenticated]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitting(true);
    setFormMessage("");
    setFormHasError(false);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to create return request"
        );
      }

      setForm(initialForm);
      setFormMessage("Return request created successfully.");
      setFormHasError(false);

      await fetchReturns();
    } catch (err) {
      setFormMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the return."
      );
      setFormHasError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturnAction(
    returnId: string,
    action: ReturnAction,
    extraData: Record<string, unknown> = {}
  ): Promise<boolean> {
    try {
      setActionLoading(returnId);
      setActionError("");
      setActionErrorReturnId(null);

      const response = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...extraData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to update return request"
        );
      }

      await fetchReturns();
      return true;
    } catch (err) {
      console.error("Return action failed:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the return."
      );
      setActionErrorReturnId(returnId);
      return false;
    } finally {
      setActionLoading(null);
    }
  }

  function openApprovalForm(returnId: string) {
    setApprovingReturnId(returnId);
    setSelectedResolution("REFUND");
    setRefundAmount("");
    setActionError("");
    setActionErrorReturnId(null);
  }

  function cancelApproval(returnId: string) {
    if (actionLoading === returnId) {
      return;
    }

    setApprovingReturnId(null);
    setRefundAmount("");
    setActionError("");
    setActionErrorReturnId(null);
  }

  function openArchiveConfirmation(returnId: string) {
    setArchiveConfirmReturnId(returnId);
    setActionError("");
    setActionErrorReturnId(null);
  }

  async function confirmArchive(returnId: string) {
    const archived = await handleReturnAction(returnId, "ARCHIVE");

    if (archived) {
      setArchiveConfirmReturnId(null);
    }
  }

  async function handleApprovalSubmit(
    event: React.FormEvent<HTMLFormElement>,
    returnId: string
  ) {
    event.preventDefault();

    const parsedRefundAmount = Number(refundAmount);

    if (
      selectedResolution === "REFUND" &&
      (!refundAmount.trim() ||
        !Number.isFinite(parsedRefundAmount) ||
        parsedRefundAmount <= 0)
    ) {
      setActionError("Enter a refund amount greater than 0.");
      setActionErrorReturnId(returnId);
      return;
    }

    const updated = await handleReturnAction(returnId, "APPROVE", {
      resolution: selectedResolution,
      ...(selectedResolution === "REFUND"
        ? { refundAmount: parsedRefundAmount }
        : {}),
    });

    if (updated) {
      setApprovingReturnId(null);
      setRefundAmount("");
    }
  }

  const statusCounts = {
    OPEN: returns.filter((r) => r.status === "OPEN").length,
    IN_REVIEW: returns.filter((r) => r.status === "IN_REVIEW").length,
    APPROVED: returns.filter((r) => r.status === "APPROVED").length,
    REJECTED: returns.filter((r) => r.status === "REJECTED").length,
    COMPLETED: returns.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Operations desk
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            ReturnDesk
          </h1>
          <p className="mt-2 text-slate-600">
            Manage customer return requests
          </p>
        </header>

        {/* Status summary */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-600">
                {status.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-2xl font-bold">{count}</p>
            </div>
          ))}
        </section>

        {/* Create return form */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-xl font-semibold text-slate-950">
            Create Return Request
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Order Number
              </label>
              <input
                name="orderNumber"
                value={form.orderNumber}
                onChange={handleInputChange}
                required
                placeholder="e.g. ORD-1001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Item Name
              </label>
              <input
                name="itemName"
                value={form.itemName}
                onChange={handleInputChange}
                required
                placeholder="e.g. Wireless Headphones"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Customer Name
              </label>
              <input
                name="customerName"
                value={form.customerName}
                onChange={handleInputChange}
                required
                placeholder="Customer name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Customer Email
              </label>
              <input
                name="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={handleInputChange}
                required
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Return Reason
              </label>
              <select
                name="reason"
                value={form.reason}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="DAMAGED">Damaged</option>
                <option value="WRONG_ITEM">Wrong Item</option>
                <option value="NOT_AS_DESCRIBED">Not as Described</option>
                <option value="NO_LONGER_NEEDED">No Longer Needed</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Return"}
              </button>
            </div>
          </form>

          {formMessage && (
            <p
              className={`mt-4 text-sm ${
                formHasError ? "text-red-600" : "text-gray-700"
              }`}
              role={formHasError ? "alert" : "status"}
            >
              {formMessage}
            </p>
          )}
        </section>

        {/* Returns table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Return Requests
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {pagination.total} active request{pagination.total === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-5">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search order, customer, or ID"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:col-span-2 lg:col-span-1 lg:w-56"
                  aria-label="Search return requests"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={reasonFilter}
                  onChange={(event) => {
                    setReasonFilter(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  aria-label="Filter by return reason"
                >
                  <option value="">All reasons</option>
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  aria-label="Sort return requests"
                >
                  <option value="createdAt">Created date</option>
                  <option value="orderNumber">Order number</option>
                  <option value="customerName">Customer name</option>
                  <option value="status">Status</option>
                  <option value="updatedAt">Last updated</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder((current) =>
                      current === "asc" ? "desc" : "asc"
                    );
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {sortOrder === "asc" ? "Ascending" : "Descending"}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-slate-600">Loading returns...</p>
          ) : error ? (
            <p className="p-6 text-red-700" role="alert">{error}</p>
          ) : returns.length === 0 ? (
            <p className="p-6 text-slate-600">
              No active return requests match these search and filter settings.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-4">Order</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {returns.map((request) => (
                    <tr key={request.id} className="border-t border-slate-200 transition hover:bg-slate-50/80">
                      <td className="p-4 font-medium">
                        <Link
                          href={`/returns/${request.id}`}
                          className="text-indigo-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {request.orderNumber}
                        </Link>
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {request.id}
                        </div>
                      </td>

                      <td className="p-4">{request.itemName}</td>

                      <td className="p-4">
                        <div>{request.customerName}</div>
                        <div className="text-xs text-slate-500">
                          {request.customerEmail}
                        </div>
                      </td>

                      <td className="p-4">
                        {request.reason.replaceAll("_", " ")}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(
                            request.status
                          )}`}
                        >
                          {request.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="p-4">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {request.status === "OPEN" && (
                            <>
                              <button
                                disabled={actionLoading === request.id}
                                onClick={() =>
                                  handleReturnAction(
                                    request.id,
                                    "START_REVIEW"
                                  )
                                }
                                className="rounded bg-indigo-600 px-3 py-1 text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                              >
                                {actionLoading === request.id
                                  ? "Updating..."
                                  : "Start Review"}
                              </button>
                              <button
                                disabled={actionLoading === request.id}
                                onClick={() => openArchiveConfirmation(request.id)}
                                className="rounded border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                              >
                                Archive
                              </button>
                            </>
                          )}

                          {request.status === "IN_REVIEW" && (
                            <>
                              <button
                                disabled={actionLoading === request.id}
                                onClick={() =>
                                  handleReturnAction(
                                    request.id,
                                    "REJECT"
                                  )
                                }
                                className="rounded bg-red-700 px-3 py-1 text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                              >
                                {actionLoading === request.id
                                  ? "Rejecting..."
                                  : "Reject"}
                              </button>

                              <button
                                disabled={actionLoading === request.id}
                                onClick={() => openApprovalForm(request.id)}
                                className="rounded bg-emerald-700 px-3 py-1 text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                              >
                                Approve
                              </button>
                            </>
                          )}

                          {actionErrorReturnId === request.id && (
                            <p className="w-full text-sm text-red-600" role="alert">
                              {actionError}
                            </p>
                          )}

                          {approvingReturnId === request.id && (
                            <form
                              onSubmit={(event) =>
                                handleApprovalSubmit(event, request.id)
                              }
                              noValidate
                              className="w-full space-y-3 rounded-lg border border-green-200 bg-green-50 p-3"
                            >
                              <div>
                                <label
                                  htmlFor={`resolution-${request.id}`}
                                  className="mb-1 block text-sm font-medium"
                                >
                                  Resolution
                                </label>
                                <select
                                  id={`resolution-${request.id}`}
                                  value={selectedResolution}
                                  onChange={(event) => {
                                    setSelectedResolution(
                                      event.target.value as
                                        | "REFUND"
                                        | "REPLACEMENT"
                                        | "STORE_CREDIT"
                                    );
                                    setActionError("");
                                    setActionErrorReturnId(null);
                                  }}
                                  disabled={actionLoading === request.id}
                                  className="w-full rounded border bg-white px-3 py-2"
                                >
                                  <option value="REFUND">REFUND</option>
                                  <option value="REPLACEMENT">REPLACEMENT</option>
                                  <option value="STORE_CREDIT">
                                    STORE_CREDIT
                                  </option>
                                </select>
                              </div>

                              {selectedResolution === "REFUND" && (
                                <div>
                                  <label
                                    htmlFor={`refund-amount-${request.id}`}
                                    className="mb-1 block text-sm font-medium"
                                  >
                                    Refund amount
                                  </label>
                                  <input
                                    id={`refund-amount-${request.id}`}
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={refundAmount}
                                    onChange={(event) => {
                                      setRefundAmount(event.target.value);
                                      setActionError("");
                                      setActionErrorReturnId(null);
                                    }}
                                    disabled={actionLoading === request.id}
                                    className="w-full rounded border bg-white px-3 py-2"
                                  />
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={actionLoading === request.id}
                                  className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                                >
                                  {actionLoading === request.id
                                    ? "Approving..."
                                    : "Confirm Approval"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelApproval(request.id)}
                                  disabled={actionLoading === request.id}
                                  className="rounded border border-gray-300 px-3 py-2 text-gray-700 hover:bg-white disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}

                          {request.status === "APPROVED" && (
                            <button
                              disabled={actionLoading === request.id}
                              onClick={() =>
                                handleReturnAction(
                                  request.id,
                                  "COMPLETE"
                                )
                              }
                              className="rounded bg-emerald-700 px-3 py-1 text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                            >
                              {actionLoading === request.id
                                ? "Updating..."
                                : "Complete"}
                            </button>
                          )}

                          {request.status === "REJECTED" && (
                            <button
                              disabled={actionLoading === request.id}
                              onClick={() => openArchiveConfirmation(request.id)}
                              className="rounded border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                            >
                              Archive
                            </button>
                          )}

                          {(request.status === "REJECTED" ||
                            request.status === "COMPLETED") &&
                            request.status !== "REJECTED" && (
                            <span className="text-sm text-gray-500">
                              No actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </section>

        {archiveConfirmReturnId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-dialog-title"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
              <h2 id="archive-dialog-title" className="text-lg font-semibold text-slate-950">
                Remove request from the active desk?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                This archives the request so it no longer appears on the active
                dashboard. The return request and all of its notes remain stored.
              </p>
              {actionErrorReturnId === archiveConfirmReturnId && (
                <p className="mt-3 text-sm text-red-700" role="alert">
                  {actionError}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => confirmArchive(archiveConfirmReturnId)}
                  disabled={actionLoading === archiveConfirmReturnId}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  {actionLoading === archiveConfirmReturnId
                    ? "Archiving..."
                    : "Archive request"}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveConfirmReturnId(null)}
                  disabled={actionLoading === archiveConfirmReturnId}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

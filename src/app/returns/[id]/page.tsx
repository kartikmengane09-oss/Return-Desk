"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Note = {
  id: string;
  content: string;
  createdAt: string;
};

type ReturnDetail = {
  id: string;
  orderNumber: string;
  itemName: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  status: string;
  resolution: string | null;
  refundAmount: string | number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
};

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

function ReturnDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    orderNumber: "",
    itemName: "",
    customerName: "",
    customerEmail: "",
    reason: "DAMAGED",
  });
  const [message, setMessage] = useState("");
  const [messageHasError, setMessageHasError] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/returns/${params.id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load return request");
      }

      setRequest(result);
      setEditForm({
        orderNumber: result.orderNumber,
        itemName: result.itemName,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        reason: result.reason,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load return request."
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session");
        const result = await response.json();

        if (!response.ok || !result.authenticated) {
          router.replace("/login");
          return;
        }

        await loadRequest();
      } catch {
        router.replace("/login");
      }
    }

    void checkSession();
  }, [loadRequest, router]);

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!noteContent.trim()) {
      setMessage("A note cannot be empty.");
      setMessageHasError(true);
      return;
    }

    try {
      setNoteSubmitting(true);
      setMessage("");
      const response = await fetch(`/api/returns/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add note");
      }

      setNoteContent("");
      setMessage("Note added.");
      setMessageHasError(false);
      await loadRequest();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add note.");
      setMessageHasError(true);
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function saveEdits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setEditSubmitting(true);
      setMessage("");
      const response = await fetch(`/api/returns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_DETAILS", ...editForm }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update return request");
      }

      setEditing(false);
      setMessage("Request details updated.");
      setMessageHasError(false);
      await loadRequest();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to update return request."
      );
      setMessageHasError(true);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function archiveRequest(): Promise<boolean> {
    try {
      setEditSubmitting(true);
      setMessage("");
      const response = await fetch(`/api/returns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ARCHIVE" }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to archive return request");
      }

      router.replace("/");
      return true;
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to archive return request."
      );
      setMessageHasError(true);
      return false;
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6 text-slate-600">Loading return request...</main>;
  }

  if (error || !request) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm" role="alert">
          {error || "Return request not found."}
          <Link href="/" className="mt-4 block font-medium text-indigo-700 hover:underline">
            Back to ReturnDesk
          </Link>
        </div>
      </main>
    );
  }

  const canEdit = ["OPEN", "IN_REVIEW"].includes(request.status);
  const canArchive = ["OPEN", "REJECTED"].includes(request.status);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-indigo-700 hover:underline">
          ← Back to ReturnDesk
        </Link>

        <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Return request</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {request.orderNumber}
            </h1>
            <p className="mt-2 text-sm text-slate-600">Reference ID: {request.id}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusBadgeClass(request.status)}`}>
            {request.status.replaceAll("_", " ")}
          </span>
        </header>

        {message && (
          <p className={`mt-5 rounded-lg border p-3 text-sm ${messageHasError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role={messageHasError ? "alert" : "status"}>
            {message}
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">Request details</h2>
              {canEdit && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  Edit details
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveEdits} className="mt-5 grid gap-4 sm:grid-cols-2">
                {([
                  ["orderNumber", "Order number"],
                  ["itemName", "Item name"],
                  ["customerName", "Customer name"],
                  ["customerEmail", "Customer email"],
                ] as const).map(([field, label]) => (
                  <label key={field} className="text-sm font-medium text-slate-700">
                    {label}
                    <input
                      type={field === "customerEmail" ? "email" : "text"}
                      value={editForm[field]}
                      onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      required
                    />
                  </label>
                ))}
                <label className="text-sm font-medium text-slate-700">
                  Return reason
                  <select value={editForm.reason} onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
                    {reasonOptions.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={editSubmitting} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60">
                    {editSubmitting ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" disabled={editSubmitting} onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><dt className="text-sm text-slate-500">Item</dt><dd className="mt-1 font-medium">{request.itemName}</dd></div>
                <div><dt className="text-sm text-slate-500">Reason</dt><dd className="mt-1 font-medium">{request.reason.replaceAll("_", " ")}</dd></div>
                <div><dt className="text-sm text-slate-500">Customer</dt><dd className="mt-1 font-medium">{request.customerName}</dd></div>
                <div><dt className="text-sm text-slate-500">Email</dt><dd className="mt-1 break-words font-medium">{request.customerEmail}</dd></div>
                <div><dt className="text-sm text-slate-500">Resolution</dt><dd className="mt-1 font-medium">{request.resolution?.replaceAll("_", " ") || "Not decided"}</dd></div>
                <div><dt className="text-sm text-slate-500">Refund amount</dt><dd className="mt-1 font-medium">{request.refundAmount ?? "—"}</dd></div>
                <div><dt className="text-sm text-slate-500">Created</dt><dd className="mt-1 font-medium">{new Date(request.createdAt).toLocaleString()}</dd></div>
                <div><dt className="text-sm text-slate-500">Last updated</dt><dd className="mt-1 font-medium">{new Date(request.updatedAt).toLocaleString()}</dd></div>
              </dl>
            )}
          </section>

          <aside className="space-y-6">
            {canArchive && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-950">Desk actions</h2>
                <p className="mt-2 text-sm text-slate-600">Archive removes this request from the active desk without deleting it.</p>
                <button type="button" onClick={() => setArchiveConfirmationOpen(true)} disabled={editSubmitting} className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">
                  Archive request
                </button>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Add note</h2>
              <form onSubmit={addNote} className="mt-3 space-y-3">
                <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} rows={4} placeholder="Add an internal note" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                <button type="submit" disabled={noteSubmitting} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">
                  {noteSubmitting ? "Adding..." : "Add note"}
                </button>
              </form>
            </section>
          </aside>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-950">Notes</h2>
          {request.notes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No notes have been added to this request.</p>
          ) : (
            <ol className="mt-4 divide-y divide-slate-200">
              {request.notes.map((note) => (
                <li key={note.id} className="py-4 first:pt-0">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{note.content}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {archiveConfirmationOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-archive-dialog-title"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
              <h2 id="detail-archive-dialog-title" className="text-lg font-semibold text-slate-950">
                Archive this return request?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                This removes it from the active desk but permanently retains the
                request and its notes in the database.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (await archiveRequest()) {
                      setArchiveConfirmationOpen(false);
                    }
                  }}
                  disabled={editSubmitting}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {editSubmitting ? "Archiving..." : "Archive request"}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveConfirmationOpen(false)}
                  disabled={editSubmitting}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
              {messageHasError && message && (
                <p className="mt-3 text-sm text-red-700" role="alert">
                  {message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ReturnDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-6 text-slate-600">
          Loading return request...
        </main>
      }
    >
      <ReturnDetailContent />
    </Suspense>
  );
}

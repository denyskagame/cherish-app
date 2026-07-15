"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookHeart,
  BookMarked,
  Check,
  Eye,
  EyeOff,
  Flag,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { getFont } from "@/lib/fonts";

type Status = "APPROVED" | "PENDING" | "HIDDEN" | "FLAGGED";

export interface AdminMessage {
  id: string;
  guestName: string;
  bodyText: string;
  bodyOriginal: string | null;
  fontId: string;
  locale: string;
  wasAiEnhanced: boolean;
  status: Status;
  createdAt: string;
}

// Admin moderation queue (docs/03 §11): every message including hidden/flagged,
// filterable by status, with approve / hide / flag / delete and a per-event
// moderation toggle. Destructive actions are audited server-side. AI triage is
// deferred, so moderation here is a manual review of the PENDING queue.
const FILTERS: { key: "ALL" | Status; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "HIDDEN", label: "Hidden" },
];

const STATUS_STYLE: Record<Status, string> = {
  APPROVED: "border-success/40 text-success",
  PENDING: "border-brand/40 text-brand",
  FLAGGED: "border-danger/40 text-danger",
  HIDDEN: "border-border text-text-muted",
};

export function MessageModeration({
  eventId,
  eventSlug,
  initialMessages,
  initialModerate,
}: {
  eventId: string;
  eventSlug: string;
  initialMessages: AdminMessage[];
  initialModerate: boolean;
}) {
  const base = `/api/admin/events/${eventId}`;
  const [messages, setMessages] = useState<AdminMessage[]>(initialMessages);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [moderate, setModerate] = useState(initialModerate);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: messages.length };
    for (const m of messages) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [messages]);

  const shown = useMemo(
    () => (filter === "ALL" ? messages : messages.filter((m) => m.status === filter)),
    [messages, filter],
  );

  const pending = messages.filter((m) => m.status === "PENDING");
  const approvedCount = messages.filter((m) => m.status === "APPROVED").length;

  async function setStatus(id: string, status: Status) {
    setMessages((xs) => xs.map((m) => (m.id === id ? { ...m, status } : m)));
    await fetch(`${base}/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/messages/${id}`, { method: "DELETE" });
      if (res.ok) setMessages((xs) => xs.filter((m) => m.id !== id));
      setConfirmDel(null);
    } finally {
      setBusy(false);
    }
  }

  async function approveAllPending() {
    setBusy(true);
    try {
      const ids = pending.map((m) => m.id);
      setMessages((xs) =>
        xs.map((m) => (m.status === "PENDING" ? { ...m, status: "APPROVED" } : m)),
      );
      await Promise.all(
        ids.map((id) =>
          fetch(`${base}/messages/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "APPROVED" }),
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleModeration(next: boolean) {
    setModerate(next);
    await fetch(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moderateMessages: next }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-text-muted text-[11px] tracking-[0.28em] uppercase">
            The Guest Book
          </p>
          <h1 className="font-display text-text mt-2 text-3xl sm:text-4xl">Messages</h1>
          <p className="text-text-muted mt-2 text-sm">
            {messages.length === 0
              ? "No messages yet."
              : `${messages.length} message${messages.length === 1 ? "" : "s"} from your guests.`}
          </p>
          {approvedCount > 0 ? (
            <Link
              href={`/keepsake/${eventSlug}`}
              target="_blank"
              className="border-brand/40 text-brand hover:bg-brand/10 mt-4 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 py-2 text-sm font-medium transition"
            >
              <BookMarked size={15} /> Keepsake book
              <span className="text-text-muted font-normal">· {approvedCount} pages</span>
            </Link>
          ) : (
            <span
              className="border-border text-text-muted/50 mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 py-2 text-sm"
              title="Approve some messages first"
            >
              <BookMarked size={15} /> Keepsake book
            </span>
          )}
        </div>

        {/* Moderation toggle */}
        <div className="text-right">
          <p className="text-text-muted mb-1.5 text-[11px] tracking-[0.14em] uppercase">
            Review before showing
          </p>
          <div className="border-border bg-card inline-flex overflow-hidden rounded-full border p-1 text-sm">
            {[
              { v: false, l: "Off" },
              { v: true, l: "On" },
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => toggleModeration(o.v)}
                aria-pressed={moderate === o.v}
                className={
                  "rounded-full px-4 py-1 font-medium transition " +
                  (moderate === o.v
                    ? "bg-brand text-[#141210]"
                    : "text-text-muted hover:text-text")
                }
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {moderate && (
        <p className="border-brand/30 bg-brand/5 text-text-muted mt-5 rounded-[var(--radius-sm)] border p-3 text-xs">
          New messages wait in <span className="text-brand">Pending</span> until you
          approve them — nothing shows to guests automatically.
        </p>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "rounded-full border px-3 py-1.5 text-xs transition " +
              (filter === f.key
                ? "border-brand/50 bg-brand/15 text-brand"
                : "border-border text-text-muted hover:text-text")
            }
          >
            {f.label}
            {counts[f.key] ? (
              <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
            ) : null}
          </button>
        ))}
        {pending.length > 0 && (
          <button
            onClick={approveAllPending}
            disabled={busy}
            className="border-success/40 text-success hover:bg-success/10 ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50"
          >
            <Check size={13} /> Approve all pending ({pending.length})
          </button>
        )}
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="text-text-muted card-surface mt-6 grid place-items-center gap-3 py-14 text-center text-sm">
          <BookHeart size={26} className="text-text-muted/50" />
          {messages.length === 0 ? "The book is empty." : "Nothing in this view."}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((m) => {
            const font = getFont(m.fontId);
            return (
              <li
                key={m.id}
                className="border-border bg-card relative overflow-hidden rounded-[var(--radius)] border p-5"
              >
                <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand/20 via-brand to-brand/20" />
                <div className="flex items-start justify-between gap-3">
                  <p
                    style={{
                      fontFamily: font.family,
                      fontSize: font.size,
                      fontWeight: font.weight,
                      lineHeight: 1.7,
                    }}
                    className="text-text min-w-0 flex-1"
                  >
                    {m.bodyText}
                  </p>
                  <span
                    className={
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-wide uppercase " +
                      STATUS_STYLE[m.status]
                    }
                  >
                    {m.status.toLowerCase()}
                  </span>
                </div>

                <div className="border-border mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="font-display text-brand text-sm italic">
                    — {m.guestName}
                    <span className="text-text-muted/70 ml-2 text-[11px] not-italic">
                      {new Date(m.createdAt).toLocaleDateString(m.locale, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    {m.status !== "APPROVED" && (
                      <ActionBtn
                        label="Approve"
                        onClick={() => setStatus(m.id, "APPROVED")}
                        className="hover:text-success"
                      >
                        <Check size={15} />
                      </ActionBtn>
                    )}
                    {m.status === "APPROVED" && (
                      <ActionBtn
                        label="Hide"
                        onClick={() => setStatus(m.id, "HIDDEN")}
                        className="hover:text-text"
                      >
                        <EyeOff size={15} />
                      </ActionBtn>
                    )}
                    {m.status === "HIDDEN" && (
                      <ActionBtn
                        label="Show"
                        onClick={() => setStatus(m.id, "APPROVED")}
                        className="hover:text-success"
                      >
                        <Eye size={15} />
                      </ActionBtn>
                    )}
                    {m.status !== "FLAGGED" && (
                      <ActionBtn
                        label="Flag"
                        onClick={() => setStatus(m.id, "FLAGGED")}
                        className="hover:text-danger"
                      >
                        <Flag size={15} />
                      </ActionBtn>
                    )}
                    {m.status === "FLAGGED" && (
                      <ActionBtn
                        label="Requeue"
                        onClick={() => setStatus(m.id, "PENDING")}
                        className="hover:text-brand"
                      >
                        <RotateCcw size={15} />
                      </ActionBtn>
                    )}
                    {confirmDel === m.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => remove(m.id)}
                          disabled={busy}
                          className="text-danger font-medium hover:underline"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          className="text-text-muted hover:text-text"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <ActionBtn
                        label="Delete"
                        onClick={() => setConfirmDel(m.id)}
                        className="hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </ActionBtn>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function ActionBtn({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={"text-text-muted p-1.5 transition " + className}
    >
      {children}
    </button>
  );
}

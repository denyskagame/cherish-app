"use client";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Check,
  Download,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Dropdown } from "./Dropdown";

// The Guest CRM (docs/05 §8): a searchable roster over the event's Guest rows,
// with a robust CSV importer (idempotent upsert, docs/01 §3) as the primary way
// to bring in a list the couple already built elsewhere. Table+seat live here and
// in the seating editor — both PATCH the same guest API. Export is a plain roster.

export interface GuestRow {
  id: string;
  fullName: string;
  tableId: string | null;
  seatNumber: number | null;
  groupLabel: string | null;
  partySize: number;
  email: string | null;
}
export interface TableLite {
  id: string;
  number: number;
  name: string;
}

interface ImportSummary {
  created: number;
  updated: number;
  errors: string[];
}

/** Accent- and case-insensitive fold, so "Zoe" matches "Zoé". */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function GuestsManager({
  eventId,
  initialGuests,
  initialTables,
  labelStyle,
}: {
  eventId: string;
  initialGuests: GuestRow[];
  initialTables: TableLite[];
  labelStyle: "number" | "name";
}) {
  const base = `/api/admin/events/${eventId}`;
  const [guests, setGuests] = useState<GuestRow[]>(initialGuests);
  const [tables, setTables] = useState<TableLite[]>(initialTables);
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("all"); // all | unseated | <tableId>

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tableById = useMemo(
    () => new Map(tables.map((t) => [t.id, t])),
    [tables],
  );
  const tableLabel = (id: string | null) => {
    if (!id) return null;
    const t = tableById.get(id);
    if (!t) return null;
    return labelStyle === "name" && t.name ? t.name : `Table ${t.number}`;
  };

  const tableOptions = useMemo(
    () => [
      { value: "", label: "— No table —" },
      ...tables.map((t) => ({
        value: t.id,
        label: labelStyle === "name" && t.name ? t.name : `Table ${t.number}`,
      })),
    ],
    [tables, labelStyle],
  );

  const filterOptions = useMemo(
    () => [
      { value: "all", label: "All guests" },
      { value: "unseated", label: "Not seated" },
      ...tables.map((t) => ({
        value: t.id,
        label: labelStyle === "name" && t.name ? t.name : `Table ${t.number}`,
      })),
    ],
    [tables, labelStyle],
  );

  const filtered = useMemo(() => {
    const q = fold(query);
    return guests.filter((g) => {
      if (tableFilter === "unseated" && g.tableId) return false;
      if (
        tableFilter !== "all" &&
        tableFilter !== "unseated" &&
        g.tableId !== tableFilter
      )
        return false;
      if (!q) return true;
      return (
        fold(g.fullName).includes(q) ||
        fold(g.groupLabel ?? "").includes(q) ||
        fold(g.email ?? "").includes(q)
      );
    });
  }, [guests, query, tableFilter]);

  const seatedCount = guests.filter((g) => g.tableId).length;

  async function refresh() {
    const [gRes, tRes] = await Promise.all([
      fetch(`${base}/guests`),
      fetch(`${base}/tables`),
    ]);
    if (gRes.ok) setGuests((await gRes.json()).guests);
    if (tRes.ok) {
      const list: TableLite[] = (await tRes.json()).tables;
      setTables(list.map((t) => ({ id: t.id, number: t.number, name: t.name })));
    }
  }

  async function upload(file: File) {
    setImporting(true);
    setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${base}/guests/import`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setSummary({ created: 0, updated: 0, errors: [data.error ?? "Upload failed"] });
      } else {
        setSummary(data);
        await refresh();
      }
    } catch {
      setSummary({ created: 0, updated: 0, errors: ["Upload failed"] });
    } finally {
      setImporting(false);
    }
  }

  function onPick(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  function downloadTemplate() {
    // Only full_name is required. Row 1 assigns by table name, row 2 by number,
    // and both leave optional columns blank to show they're not needed.
    const csv = Papa.unparse({
      fields: [
        "full_name",
        "table_name",
        "table_number",
        "seat_number",
        "group_label",
        "party_size",
        "email",
      ],
      data: [
        ["Aline Dubois", "Garden Roses", "", "2", "College Friends", "1", "aline@example.com"],
        ["Marc Tremblay", "", "5", "", "", "", ""],
      ],
    });
    downloadCsv(csv, "cherish-guest-template.csv");
  }

  function exportGuests() {
    const rows = [...guests]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((g) => ({
        full_name: g.fullName,
        table: g.tableId ? (tableById.get(g.tableId)?.number ?? "") : "",
        table_name: g.tableId ? (tableById.get(g.tableId)?.name ?? "") : "",
        seat_number: g.seatNumber ?? "",
        group_label: g.groupLabel ?? "",
        party_size: g.partySize,
        email: g.email ?? "",
      }));
    downloadCsv(Papa.unparse(rows), "cherish-guests.csv");
  }

  async function saveEdit(id: string, data: Partial<GuestRow>) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...updated } : g)));
        setEditId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function addGuest(data: {
    fullName: string;
    tableId: string | null;
    seatNumber: number | null;
    groupLabel: string | null;
  }) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setGuests((gs) => [created, ...gs]);
        setAdding(false);
        return null;
      }
      const err = await res.json();
      return err.error === "duplicate_name"
        ? "A guest with that name already exists."
        : "Could not add guest.";
    } finally {
      setBusy(false);
    }
  }

  async function removeGuest(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/guests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGuests((gs) => gs.filter((g) => g.id !== id));
        setEditId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-text-muted text-[11px] tracking-[0.28em] uppercase">
            The Guest List
          </p>
          <h1 className="font-display text-text mt-2 text-3xl sm:text-4xl">Guests</h1>
          <p className="text-text-muted mt-2 text-sm">
            {guests.length === 0
              ? "No guests yet — import a CSV to begin."
              : `${guests.length} guest${guests.length === 1 ? "" : "s"} · ${seatedCount} seated`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setShowImport((s) => !s);
              setSummary(null);
            }}
            className="border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition"
          >
            <Upload size={15} /> Import CSV
          </button>
          <button
            onClick={exportGuests}
            disabled={guests.length === 0}
            className="border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => {
              setAdding((a) => !a);
              setEditId(null);
            }}
            className="bg-brand inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[#141210] transition hover:brightness-110"
          >
            <Plus size={15} /> Add guest
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <section className="card-surface mt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-text text-lg">Import a guest list</h2>
              <p className="text-text-muted mt-1 text-sm">
                Upload a CSV. Re-uploading a corrected file updates guests instead of
                duplicating them.
              </p>
            </div>
            <button
              onClick={() => setShowImport(false)}
              aria-label="Close import"
              className="text-text-muted hover:text-text"
            >
              <X size={18} />
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPick(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={
              "mt-4 grid cursor-pointer place-items-center rounded-[var(--radius-sm)] border border-dashed px-6 py-9 text-center transition " +
              (dragOver ? "border-brand bg-brand/5" : "border-border hover:border-brand/50")
            }
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files);
                e.target.value = "";
              }}
            />
            <FileUp size={22} className="text-brand" />
            <p className="text-text mt-2 text-sm">
              {importing ? "Importing…" : "Drop a CSV here, or click to choose a file"}
            </p>
            <p className="text-text-muted mt-1 text-xs">
              Only <span className="text-text">full_name</span> is required. Optional:
              table_name or table_number, seat_number, group_label, party_size, email
            </p>
          </div>

          <button
            onClick={downloadTemplate}
            className="text-brand mt-3 inline-flex items-center gap-1 text-xs hover:underline"
          >
            <Download size={13} /> Download template
          </button>

          {summary && (
            <div className="border-border mt-4 rounded-[var(--radius-sm)] border p-3 text-sm">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span className="text-success">✓ {summary.created} added</span>
                <span className="text-text">↻ {summary.updated} updated</span>
                {summary.errors.length > 0 && (
                  <span className="text-danger">⚠ {summary.errors.length} skipped</span>
                )}
              </div>
              {summary.errors.length > 0 && (
                <ul className="text-text-muted mt-2 max-h-32 space-y-0.5 overflow-auto text-xs">
                  {summary.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* Add guest form */}
      {adding && (
        <GuestForm
          tableOptions={tableOptions}
          busy={busy}
          onCancel={() => setAdding(false)}
          onSubmit={(v) =>
            addGuest({
              fullName: v.fullName,
              tableId: v.tableId || null,
              seatNumber: v.seatNumber,
              groupLabel: v.groupLabel || null,
            })
          }
        />
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, group, or email…"
            className="border-border bg-button-dark text-text placeholder:text-text-muted w-full rounded-[var(--radius-sm)] border py-2 pr-3 pl-9 text-sm"
          />
        </div>
        <Dropdown
          value={tableFilter}
          options={filterOptions}
          onChange={setTableFilter}
          ariaLabel="Filter guests"
          className="w-44"
        />
      </div>

      {/* List */}
      <div className="border-border mt-4 overflow-hidden rounded-[var(--radius-lg)] border">
        {filtered.length === 0 ? (
          <div className="text-text-muted grid place-items-center gap-2 px-5 py-16 text-center text-sm">
            <Users size={26} className="text-text-muted/50" />
            {guests.length === 0
              ? "Your guest list is empty."
              : "No guests match your search."}
          </div>
        ) : (
          <ul>
            {filtered.map((g) => {
              const tl = tableLabel(g.tableId);
              const editing = editId === g.id;
              return (
                <li key={g.id} className="border-border border-b last:border-0">
                  {editing ? (
                    <GuestForm
                      inline
                      tableOptions={tableOptions}
                      busy={busy}
                      initial={{
                        fullName: g.fullName,
                        tableId: g.tableId ?? "",
                        seatNumber: g.seatNumber,
                        groupLabel: g.groupLabel ?? "",
                      }}
                      onCancel={() => setEditId(null)}
                      onDelete={() => removeGuest(g.id)}
                      onSubmit={async (v) => {
                        await saveEdit(g.id, {
                          fullName: v.fullName,
                          tableId: v.tableId || null,
                          seatNumber: v.tableId ? v.seatNumber : null,
                          groupLabel: v.groupLabel || null,
                        });
                        return null;
                      }}
                    />
                  ) : (
                    <div className="hover:bg-button-dark/40 flex items-center gap-3 px-4 py-3 transition">
                      <div className="min-w-0 flex-1">
                        <div className="text-text truncate text-sm font-medium">
                          {g.fullName}
                          {g.partySize > 1 && (
                            <span className="text-text-muted ml-2 text-xs">
                              +{g.partySize - 1}
                            </span>
                          )}
                        </div>
                        <div className="text-text-muted mt-0.5 truncate text-xs">
                          {[g.groupLabel, g.email].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      {tl ? (
                        <span className="border-brand/30 text-brand shrink-0 rounded-full border px-2.5 py-1 text-xs">
                          {tl}
                          {g.seatNumber ? ` · seat ${g.seatNumber}` : ""}
                        </span>
                      ) : (
                        <span className="border-border text-text-muted shrink-0 rounded-full border px-2.5 py-1 text-xs">
                          Not seated
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditId(g.id);
                          setAdding(false);
                        }}
                        aria-label={`Edit ${g.fullName}`}
                        className="text-text-muted hover:text-brand shrink-0 p-1.5"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared add/edit form (also used inline inside a list row).

interface FormValues {
  fullName: string;
  tableId: string;
  seatNumber: number | null;
  groupLabel: string;
}

function GuestForm({
  initial,
  tableOptions,
  busy,
  inline = false,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: FormValues;
  tableOptions: readonly { value: string; label: string }[];
  busy: boolean;
  inline?: boolean;
  onSubmit: (v: FormValues) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<FormValues>(
    initial ?? { fullName: "", tableId: "", seatNumber: null, groupLabel: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const submit = async () => {
    if (!v.fullName.trim()) {
      setError("A name is required.");
      return;
    }
    const err = await onSubmit({ ...v, fullName: v.fullName.trim() });
    setError(err);
  };

  const field =
    "border-border bg-button-dark text-text placeholder:text-text-muted rounded-[var(--radius-sm)] border px-3 py-2 text-sm";

  return (
    <div className={inline ? "bg-button-dark/30 px-4 py-4" : "card-surface mt-6"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          autoFocus
          value={v.fullName}
          onChange={(e) => setV({ ...v, fullName: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Full name"
          className={field + " sm:col-span-2"}
        />
        <input
          value={v.groupLabel}
          onChange={(e) => setV({ ...v, groupLabel: e.target.value })}
          placeholder="Group (e.g. College Friends)"
          className={field}
        />
        <div className="flex gap-3">
          <Dropdown
            value={v.tableId}
            options={tableOptions}
            onChange={(tableId) =>
              setV({ ...v, tableId, seatNumber: tableId ? v.seatNumber : null })
            }
            ariaLabel="Table"
            className="flex-1"
          />
          <input
            type="number"
            min={1}
            value={v.seatNumber ?? ""}
            disabled={!v.tableId}
            onChange={(e) =>
              setV({
                ...v,
                seatNumber: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Seat"
            className={field + " w-20 disabled:opacity-40"}
          />
        </div>
      </div>

      {error && <p className="text-danger mt-2 text-xs">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="bg-brand inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[#141210] transition hover:brightness-110 disabled:opacity-50"
        >
          <Check size={14} /> Save
        </button>
        <button
          onClick={onCancel}
          className="text-text-muted hover:text-text px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
        {onDelete && (
          <div className="ml-auto">
            {confirmDel ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">Remove?</span>
                <button
                  onClick={onDelete}
                  disabled={busy}
                  className="text-danger font-medium hover:underline"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="text-text-muted hover:text-text"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="text-text-muted hover:text-danger inline-flex items-center gap-1.5 text-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

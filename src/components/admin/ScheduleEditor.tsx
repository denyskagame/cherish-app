"use client";
import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { AlertTriangle, Check, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { SCHEDULE_ICONS, ICON_EMOJI, iconEmoji } from "@/lib/schedule";

// Schedule editor (docs/02 §9): a time-ordered list; add items with a datetime
// picker (interpreted in the EVENT timezone), an icon picker, location, and EN+FR
// title/description. Overlapping items are flagged but not blocked.

export interface ScheduleItemRow {
  id: string;
  startsAt: string; // ISO UTC
  endsAt: string | null;
  title: string;
  titleFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  icon: string | null;
  location: string | null;
}

interface FormValues {
  startsAt: string; // wall-clock "yyyy-MM-ddTHH:mm" in event tz
  endsAt: string;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  icon: string;
  location: string;
}

export function ScheduleEditor({
  eventId,
  timezone,
  weddingDate,
  initialItems,
}: {
  eventId: string;
  timezone: string;
  weddingDate: string; // ISO
  initialItems: ScheduleItemRow[];
}) {
  const base = `/api/admin/events/${eventId}/schedule`;
  const [items, setItems] = useState<ScheduleItemRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toWall = (iso: string) =>
    formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd'T'HH:mm");
  const defaultStart = toWall(weddingDate);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [items],
  );

  // Flag items whose [start,end) window overlaps another (non-blocking warning).
  const overlaps = useMemo(() => {
    const flagged = new Set<string>();
    const withEnd = sorted.map((i) => ({
      id: i.id,
      s: new Date(i.startsAt).getTime(),
      e: i.endsAt ? new Date(i.endsAt).getTime() : new Date(i.startsAt).getTime() + 30 * 60_000,
    }));
    for (let a = 0; a < withEnd.length; a++)
      for (let b = a + 1; b < withEnd.length; b++)
        if (withEnd[a].s < withEnd[b].e && withEnd[b].s < withEnd[a].e) {
          flagged.add(withEnd[a].id);
          flagged.add(withEnd[b].id);
        }
    return flagged;
  }, [sorted]);

  async function addItem(v: FormValues) {
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(v)),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((xs) => [...xs, created]);
        setAdding(false);
        return null;
      }
      return "Could not add item.";
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(id: string, v: FormValues) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(v)),
      });
      if (res.ok) {
        const echo = payloadEcho(await res.json());
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...echo } : x)));
        setEditId(null);
        return null;
      }
      return "Could not save item.";
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((xs) => xs.filter((x) => x.id !== id));
        setEditId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const timeFmt = "EEE, MMM d · h:mm a";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-text-muted text-[11px] tracking-[0.28em] uppercase">
            The Day
          </p>
          <h1 className="font-display text-text mt-2 text-3xl sm:text-4xl">Schedule</h1>
          <p className="text-text-muted mt-2 text-sm">
            Times shown at the venue ({timezone.replace(/_/g, " ")}).
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((a) => !a);
            setEditId(null);
          }}
          className="bg-brand inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[#141210] transition hover:brightness-110"
        >
          <Plus size={15} /> Add item
        </button>
      </div>

      {adding && (
        <ItemForm
          busy={busy}
          defaultStart={defaultStart}
          onCancel={() => setAdding(false)}
          onSubmit={addItem}
        />
      )}

      {items.length === 0 && !adding ? (
        <div className="text-text-muted card-surface mt-6 grid place-items-center gap-3 py-14 text-center text-sm">
          <CalendarClock size={26} className="text-text-muted/50" />
          No schedule items yet. Add the first moment above.
        </div>
      ) : (
        <ul className="border-border mt-8 overflow-hidden rounded-[var(--radius-lg)] border">
          {sorted.map((it) => (
            <li key={it.id} className="border-border border-b last:border-0">
              {editId === it.id ? (
                <ItemForm
                  inline
                  busy={busy}
                  defaultStart={defaultStart}
                  initial={{
                    startsAt: toWall(it.startsAt),
                    endsAt: it.endsAt ? toWall(it.endsAt) : "",
                    title: it.title,
                    titleFr: it.titleFr ?? "",
                    description: it.description ?? "",
                    descriptionFr: it.descriptionFr ?? "",
                    icon: it.icon ?? "",
                    location: it.location ?? "",
                  }}
                  onCancel={() => setEditId(null)}
                  onDelete={() => removeItem(it.id)}
                  onSubmit={(v) => saveItem(it.id, v)}
                />
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="bg-seat-inactive mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm">
                    {iconEmoji(it.icon)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-text text-sm font-medium">{it.title}</div>
                    <div className="text-text-muted mt-0.5 text-xs">
                      {formatInTimeZone(new Date(it.startsAt), timezone, timeFmt)}
                      {it.endsAt &&
                        ` – ${formatInTimeZone(new Date(it.endsAt), timezone, "h:mm a")}`}
                      {it.location && ` · ${it.location}`}
                    </div>
                    {it.description && (
                      <div className="text-text-muted mt-1 text-xs">{it.description}</div>
                    )}
                    {overlaps.has(it.id) && (
                      <div className="text-danger/90 mt-1.5 inline-flex items-center gap-1 text-[11px]">
                        <AlertTriangle size={12} /> Overlaps another item
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditId(it.id);
                      setAdding(false);
                    }}
                    aria-label="Edit"
                    className="text-text-muted hover:text-brand shrink-0 p-1"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function payload(v: FormValues) {
  return {
    startsAt: v.startsAt,
    endsAt: v.endsAt || null,
    title: v.title.trim(),
    titleFr: v.titleFr.trim() || null,
    description: v.description.trim() || null,
    descriptionFr: v.descriptionFr.trim() || null,
    icon: v.icon || null,
    location: v.location.trim() || null,
  };
}

/** Normalize the API echo (a ScheduleItem row) back into our row shape. */
function payloadEcho(row: {
  startsAt: string;
  endsAt: string | null;
  title: string;
  titleFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  icon: string | null;
  location: string | null;
}): Omit<ScheduleItemRow, "id"> {
  return {
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    title: row.title,
    titleFr: row.titleFr,
    description: row.description,
    descriptionFr: row.descriptionFr,
    icon: row.icon,
    location: row.location,
  };
}

function ItemForm({
  initial,
  defaultStart,
  busy,
  inline = false,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: FormValues;
  defaultStart: string;
  busy: boolean;
  inline?: boolean;
  onSubmit: (v: FormValues) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<FormValues>(
    initial ?? {
      startsAt: defaultStart,
      endsAt: "",
      title: "",
      titleFr: "",
      description: "",
      descriptionFr: "",
      icon: "",
      location: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const field =
    "border-border bg-button-dark text-text placeholder:text-text-muted w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm";

  const submit = async () => {
    if (!v.title.trim()) return setError("A title is required.");
    if (!v.startsAt) return setError("A start time is required.");
    setError(await onSubmit(v));
  };

  return (
    <div className={inline ? "bg-button-dark/30 px-4 py-4" : "card-surface mt-6"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          autoFocus
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          placeholder="Title (EN) — e.g. First Dance"
          className={field}
        />
        <input
          value={v.titleFr}
          onChange={(e) => setV({ ...v, titleFr: e.target.value })}
          placeholder="Titre (FR) — ex. Première danse"
          className={field}
        />
        <div>
          <label className="text-text-muted mb-1 block text-xs">Starts</label>
          <input
            type="datetime-local"
            value={v.startsAt}
            onChange={(e) => setV({ ...v, startsAt: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className="text-text-muted mb-1 block text-xs">
            Ends (optional)
          </label>
          <input
            type="datetime-local"
            value={v.endsAt}
            onChange={(e) => setV({ ...v, endsAt: e.target.value })}
            className={field}
          />
        </div>
        <input
          value={v.location}
          onChange={(e) => setV({ ...v, location: e.target.value })}
          placeholder="Location (optional)"
          className={field + " sm:col-span-2"}
        />
        <textarea
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          placeholder="Description (EN, optional)"
          rows={2}
          className={field}
        />
        <textarea
          value={v.descriptionFr}
          onChange={(e) => setV({ ...v, descriptionFr: e.target.value })}
          placeholder="Description (FR, optional)"
          rows={2}
          className={field}
        />
      </div>

      {/* Icon picker */}
      <div className="mt-3">
        <label className="text-text-muted mb-1.5 block text-xs">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setV({ ...v, icon: "" })}
            className={
              "grid h-9 w-9 place-items-center rounded-full border text-sm transition " +
              (v.icon === ""
                ? "border-brand/50 bg-brand/15"
                : "border-border hover:border-brand/40")
            }
            aria-label="No icon"
          >
            •
          </button>
          {SCHEDULE_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setV({ ...v, icon: ic })}
              className={
                "grid h-9 w-9 place-items-center rounded-full border text-sm transition " +
                (v.icon === ic
                  ? "border-brand/50 bg-brand/15"
                  : "border-border hover:border-brand/40")
              }
              aria-label={ic}
            >
              {ICON_EMOJI[ic]}
            </button>
          ))}
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

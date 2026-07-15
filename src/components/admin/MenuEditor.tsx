"use client";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { COURSE_ORDER } from "@/lib/menu";

// Menu editor (docs/02 §9): items grouped by course, inline add/edit with EN+FR
// name/description, hide/show, delete, and reorder within a course. Display-only
// menu — deliberately NO dietary or meal-selection fields.

export interface MenuItemRow {
  id: string;
  course: string;
  courseFr: string | null;
  name: string;
  nameFr: string | null;
  description: string;
  descriptionFr: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface FormValues {
  course: string;
  courseFr: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
}

const empty: FormValues = {
  course: "Starters",
  courseFr: "",
  name: "",
  nameFr: "",
  description: "",
  descriptionFr: "",
};

export function MenuEditor({
  eventId,
  initialItems,
}: {
  eventId: string;
  initialItems: MenuItemRow[];
}) {
  const base = `/api/admin/events/${eventId}/menu`;
  const [items, setItems] = useState<MenuItemRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Group into course sections, ordered by the canonical dinner sequence.
  const sections = useMemo(() => {
    const rank = (c: string) => {
      const i = (COURSE_ORDER as readonly string[]).indexOf(c);
      return i === -1 ? 999 : i;
    };
    const byCourse = new Map<string, MenuItemRow[]>();
    for (const it of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const arr = byCourse.get(it.course);
      if (arr) arr.push(it);
      else byCourse.set(it.course, [it]);
    }
    return [...byCourse.entries()].sort(
      ([a], [b]) => rank(a) - rank(b) || a.localeCompare(b),
    );
  }, [items]);

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
        const updated = await res.json();
        setItems((xs) => xs.map((x) => (x.id === id ? updated : x)));
        setEditId(null);
        return null;
      }
      return "Could not save item.";
    } finally {
      setBusy(false);
    }
  }

  async function patchItem(id: string, data: Partial<MenuItemRow>) {
    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((xs) => xs.map((x) => (x.id === id ? updated : x)));
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

  // Swap an item with its neighbour in the same course (reorder within course).
  async function move(courseItems: MenuItemRow[], index: number, dir: -1 | 1) {
    const a = courseItems[index];
    const b = courseItems[index + dir];
    if (!a || !b) return;
    setItems((xs) =>
      xs.map((x) =>
        x.id === a.id
          ? { ...x, sortOrder: b.sortOrder }
          : x.id === b.id
            ? { ...x, sortOrder: a.sortOrder }
            : x,
      ),
    );
    await fetch(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: [
          { id: a.id, sortOrder: b.sortOrder },
          { id: b.id, sortOrder: a.sortOrder },
        ],
      }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-text-muted text-[11px] tracking-[0.28em] uppercase">
            The Evening
          </p>
          <h1 className="font-display text-text mt-2 text-3xl sm:text-4xl">Menu</h1>
          <p className="text-text-muted mt-2 text-sm">
            What guests will see — display only, no meal selection.
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
          onCancel={() => setAdding(false)}
          onSubmit={addItem}
        />
      )}

      {items.length === 0 && !adding ? (
        <div className="text-text-muted card-surface mt-6 grid place-items-center gap-3 py-14 text-center text-sm">
          <UtensilsCrossed size={26} className="text-text-muted/50" />
          No menu items yet. Add your first course above.
        </div>
      ) : (
        <div className="mt-8 space-y-7">
          {sections.map(([course, courseItems]) => (
            <section key={course}>
              <h2 className="font-display text-brand mb-3 text-lg italic">
                {course}
              </h2>
              <ul className="border-border overflow-hidden rounded-[var(--radius-lg)] border">
                {courseItems.map((it, i) => (
                  <li key={it.id} className="border-border border-b last:border-0">
                    {editId === it.id ? (
                      <ItemForm
                        inline
                        busy={busy}
                        initial={{
                          course: it.course,
                          courseFr: it.courseFr ?? "",
                          name: it.name,
                          nameFr: it.nameFr ?? "",
                          description: it.description,
                          descriptionFr: it.descriptionFr ?? "",
                        }}
                        onCancel={() => setEditId(null)}
                        onDelete={() => removeItem(it.id)}
                        onSubmit={(v) => saveItem(it.id, v)}
                      />
                    ) : (
                      <div
                        className={
                          "flex items-start gap-3 px-4 py-3 " +
                          (it.isActive ? "" : "opacity-50")
                        }
                      >
                        <div className="flex flex-col">
                          <button
                            onClick={() => move(courseItems, i, -1)}
                            disabled={i === 0}
                            aria-label="Move up"
                            className="text-text-muted hover:text-brand disabled:opacity-25"
                          >
                            <ChevronUp size={15} />
                          </button>
                          <button
                            onClick={() => move(courseItems, i, 1)}
                            disabled={i === courseItems.length - 1}
                            aria-label="Move down"
                            className="text-text-muted hover:text-brand disabled:opacity-25"
                          >
                            <ChevronDown size={15} />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-text text-sm font-medium">
                            {it.name}
                            {!it.isActive && (
                              <span className="text-text-muted ml-2 text-[10px] tracking-wide uppercase">
                                Hidden
                              </span>
                            )}
                          </div>
                          {it.description && (
                            <div className="text-text-muted mt-0.5 text-xs italic">
                              {it.description}
                            </div>
                          )}
                          {(it.nameFr || it.descriptionFr) && (
                            <div className="text-text-muted/70 mt-1 text-[11px]">
                              FR: {it.nameFr || "—"}
                              {it.descriptionFr ? ` · ${it.descriptionFr}` : ""}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => patchItem(it.id, { isActive: !it.isActive })}
                          aria-label={it.isActive ? "Hide" : "Show"}
                          className="text-text-muted hover:text-brand shrink-0 p-1"
                        >
                          {it.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
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
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function payload(v: FormValues) {
  return {
    course: v.course.trim(),
    courseFr: v.courseFr.trim() || null,
    name: v.name.trim(),
    nameFr: v.nameFr.trim() || null,
    description: v.description.trim(),
    descriptionFr: v.descriptionFr.trim() || null,
  };
}

function ItemForm({
  initial,
  busy,
  inline = false,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: FormValues;
  busy: boolean;
  inline?: boolean;
  onSubmit: (v: FormValues) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<FormValues>(initial ?? empty);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const field =
    "border-border bg-button-dark text-text placeholder:text-text-muted w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm";

  const submit = async () => {
    if (!v.name.trim()) return setError("A dish name is required.");
    if (!v.course.trim()) return setError("A course is required.");
    setError(await onSubmit(v));
  };

  return (
    <div className={inline ? "bg-button-dark/30 px-4 py-4" : "card-surface mt-6"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-text-muted mb-1 block text-xs">Course</label>
          <input
            value={v.course}
            onChange={(e) => setV({ ...v, course: e.target.value })}
            placeholder="Starters"
            className={field}
            list="course-suggestions"
          />
          <datalist id="course-suggestions">
            {COURSE_ORDER.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COURSE_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setV({ ...v, course: c })}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] transition " +
                  (v.course === c
                    ? "border-brand/50 bg-brand/15 text-brand"
                    : "border-border text-text-muted hover:text-text")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <input
          autoFocus
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="Dish name (EN)"
          className={field}
        />
        <input
          value={v.nameFr}
          onChange={(e) => setV({ ...v, nameFr: e.target.value })}
          placeholder="Nom du plat (FR)"
          className={field}
        />
        <textarea
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          placeholder="Description (EN)"
          rows={2}
          className={field + " sm:col-span-1"}
        />
        <textarea
          value={v.descriptionFr}
          onChange={(e) => setV({ ...v, descriptionFr: e.target.value })}
          placeholder="Description (FR)"
          rows={2}
          className={field + " sm:col-span-1"}
        />
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

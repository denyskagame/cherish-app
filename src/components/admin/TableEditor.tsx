"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Table, VenueFeature } from "@prisma/client";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  RoomOutline,
  ROOM_SHAPES,
  normalizeRoomShape,
} from "@/components/guest/RoomOutline";
import { Dropdown } from "./Dropdown";
import {
  makeAdminT,
  type AdminLocale,
  type AdminT,
  type AdminKey,
} from "@/lib/i18n/admin";
import { newTablePosition, place, clamp01 } from "@/lib/seating-arrange";

// Drag-and-drop room editor (docs/01 §10). Bilingual (FR|EN), with undo of layout
// changes and landmark-aware auto-arrange.
type Shape = "round" | "rectangle";
type Orientation = "horizontal" | "vertical";

export interface GuestLite {
  id: string;
  fullName: string;
  tableId: string | null;
  seatNumber: number | null;
  groupLabel: string | null;
}

export interface RoomShell {
  shape: string;
  width: number;
  height: number;
}

type Snap = { tables: Table[]; features: VenueFeature[]; room: RoomShell };

const FEATURE_TYPES = [
  "stage",
  "danceFloor",
  "dj",
  "buffet",
  "bar",
  "entrance",
  "custom",
] as const;
const LOCALE_KEY = "cherish.admin.locale";
const CANVAS_PPU = 1;

const BTN =
  "rounded-[var(--radius-sm)] border-border text-text border px-3 py-2 text-sm transition active:scale-[.96] hover:bg-button-dark hover:border-brand/50";

export function TableEditor({
  eventId,
  eventSlug,
  coupleNames,
  initialLocale,
  initialTables,
  initialGuests,
  initialFeatures,
  initialRoom,
  initialWarnings,
}: {
  eventId: string;
  eventSlug: string;
  coupleNames: string;
  initialLocale: AdminLocale;
  initialTables: Table[];
  initialGuests: GuestLite[];
  initialFeatures: VenueFeature[];
  initialRoom: RoomShell;
  initialWarnings: string[];
}) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [guests, setGuests] = useState<GuestLite[]>(initialGuests);
  const [features, setFeatures] = useState<VenueFeature[]>(initialFeatures);
  const [room, setRoom] = useState<RoomShell>({
    ...initialRoom,
    shape: normalizeRoomShape(initialRoom.shape),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>(initialWarnings);
  const [unseated, setUnseated] = useState<number | null>(null);
  const [checkedOk, setCheckedOk] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [locale, setLocale] = useState<AdminLocale>(initialLocale);
  const [history, setHistory] = useState<Snap[]>([]);

  const t = useMemo<AdminT>(() => makeAdminT(locale), [locale]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if ((saved === "en" || saved === "fr") && saved !== initialLocale) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of saved admin locale
      setLocale(saved);
    }
  }, [initialLocale]);

  const switchLocale = (l: AdminLocale) => {
    setLocale(l);
    window.localStorage.setItem(LOCALE_KEY, l);
  };

  const base = `/api/admin/events/${eventId}`;
  const jsonHeaders = { "Content-Type": "application/json" };

  const pushHistory = () =>
    setHistory((h) => [...h.slice(-24), { tables, features, room }]);

  const patchTable = useCallback(
    async (id: string, data: Partial<Table>) => {
      setSaving(true);
      try {
        await fetch(`${base}/tables/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  const patchFeature = useCallback(
    async (id: string, data: Partial<VenueFeature>) => {
      setSaving(true);
      try {
        await fetch(`${base}/venue-features/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  const debounced = useCallback((key: string, fn: () => void) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, 400);
  }, []);

  const updateTableLocal = (id: string, data: Partial<Table>) =>
    setTables((ts) => ts.map((tb) => (tb.id === id ? { ...tb, ...data } : tb)));
  const updateFeatureLocal = (id: string, data: Partial<VenueFeature>) =>
    setFeatures((fs) => fs.map((f) => (f.id === id ? { ...f, ...data } : f)));

  const onDragEnd = (e: DragEndEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = String(e.active.id);
    pushHistory();
    if (id.startsWith("feat:")) {
      const fid = id.slice(5);
      const f = features.find((x) => x.id === fid);
      if (!f) return;
      const x = clamp01(f.x + e.delta.x / rect.width);
      const y = clamp01(f.y + e.delta.y / rect.height);
      updateFeatureLocal(fid, { x, y });
      debounced(fid, () => patchFeature(fid, { x, y }));
    } else {
      const tbl = tables.find((x) => x.id === id);
      if (!tbl) return;
      const positionX = place(tbl.positionX + e.delta.x / rect.width);
      const positionY = place(tbl.positionY + e.delta.y / rect.height);
      updateTableLocal(id, { positionX, positionY });
      debounced(id, () => patchTable(id, { positionX, positionY }));
    }
  };

  const addTable = async () => {
    const pos = newTablePosition(tables, features, room);
    const res = await fetch(`${base}/tables`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(pos),
    });
    if (res.ok) {
      const table: Table = await res.json();
      setTables((ts) => [...ts, table]);
      setSelectedFeatureId(null);
      setSelectedId(table.id);
    }
  };

  const deleteTable = async (id: string) => {
    await fetch(`${base}/tables/${id}`, { method: "DELETE" });
    setTables((ts) => ts.filter((tb) => tb.id !== id));
    setGuests((gs) =>
      gs.map((g) => (g.tableId === id ? { ...g, tableId: null } : g)),
    );
    if (selectedId === id) setSelectedId(null);
  };

  const addFeature = async () => {
    const res = await fetch(`${base}/venue-features`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ type: "custom", label: t("feat.newZone") }),
    });
    if (res.ok) {
      const f: VenueFeature = await res.json();
      setFeatures((fs) => [...fs, f]);
      setSelectedId(null);
      setSelectedFeatureId(f.id);
    }
  };

  const deleteFeature = async (id: string) => {
    await fetch(`${base}/venue-features/${id}`, { method: "DELETE" });
    setFeatures((fs) => fs.filter((f) => f.id !== id));
    if (selectedFeatureId === id) setSelectedFeatureId(null);
  };

  // ── Room shell ────────────────────────────────────────────────────────────
  const sendRoom = useCallback(
    async (r: RoomShell) => {
      setSaving(true);
      try {
        await fetch(`${base}/room`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomShape: r.shape,
            roomWidth: r.width,
            roomHeight: r.height,
          }),
        });
      } finally {
        setSaving(false);
      }
    },
    [base],
  );
  const patchRoom = (patch: Partial<RoomShell>) => {
    if (patch.shape !== undefined) pushHistory(); // discrete shape swaps are undoable
    const nextRoom = { ...room, ...patch };
    setRoom(nextRoom);
    debounced("room", () => sendRoom(nextRoom));
  };

  const revalidate = async () => {
    const res = await fetch(`${base}/tables?validate=1`);
    if (!res.ok) return;
    const data = await res.json();
    const list: string[] = data.warnings ?? [];
    const unseatedCount: number = data.unseated ?? 0;
    setWarnings(list);
    setUnseated(unseatedCount);
    const clean = list.length === 0 && unseatedCount === 0;
    setCheckedOk(clean);
    if (clean) setTimeout(() => setCheckedOk(false), 4000);
  };

  // Find a guest across the room and jump to their table.
  const tableById = new Map(tables.map((tb) => [tb.id, tb]));
  const searchMatches = guestSearch.trim()
    ? guests
        .filter((g) =>
          g.fullName.toLowerCase().includes(guestSearch.trim().toLowerCase()),
        )
        .slice(0, 8)
    : [];
  const selectGuest = (g: GuestLite) => {
    setGuestSearch("");
    if (g.tableId) {
      setSelectedFeatureId(null);
      setSelectedId(g.tableId);
    }
  };

  // ── Undo (layout) ─────────────────────────────────────────────────────────
  const canUndo = history.length > 0;
  const undo = () => {
    if (!canUndo) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRoom(prev.room);
    const pT = new Map(prev.tables.map((tb) => [tb.id, tb]));
    setTables((ts) =>
      ts.map((tb) => {
        const p = pT.get(tb.id);
        return p
          ? {
              ...tb,
              positionX: p.positionX,
              positionY: p.positionY,
              rotation: p.rotation,
              shape: p.shape,
              orientation: p.orientation,
              seatsCount: p.seatsCount,
              name: p.name,
              nameFr: p.nameFr,
              locationHint: p.locationHint,
            }
          : tb;
      }),
    );
    const pF = new Map(prev.features.map((f) => [f.id, f]));
    setFeatures((fs) =>
      fs.map((f) => {
        const p = pF.get(f.id);
        return p
          ? { ...f, x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation }
          : f;
      }),
    );
    setSelectedId(null);
    setSelectedFeatureId(null);
    void persistSnapshot(prev);
  };

  const persistSnapshot = async (s: Snap) => {
    setSaving(true);
    try {
      await sendRoom(s.room);
      await Promise.all([
        ...s.tables.map((tb) =>
          fetch(`${base}/tables/${tb.id}`, {
            method: "PATCH",
            headers: jsonHeaders,
            body: JSON.stringify({
              positionX: tb.positionX,
              positionY: tb.positionY,
              rotation: tb.rotation,
              shape: tb.shape,
              orientation: tb.orientation,
              seatsCount: tb.seatsCount,
              name: tb.name,
              nameFr: tb.nameFr,
              locationHint: tb.locationHint,
            }),
          }),
        ),
        ...s.features.map((f) =>
          fetch(`${base}/venue-features/${f.id}`, {
            method: "PATCH",
            headers: jsonHeaders,
            body: JSON.stringify({
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height,
              rotation: f.rotation,
            }),
          }),
        ),
      ]);
    } finally {
      setSaving(false);
    }
  };

  // ── Guest ops ─────────────────────────────────────────────────────────────
  const addGuest = async (fullName: string, tableId: string, seatNumber: number | null) => {
    const res = await fetch(`${base}/guests`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ fullName, tableId, seatNumber }),
    });
    if (res.ok) {
      const created: GuestLite = await res.json();
      setGuests((gs) => [...gs, created]);
      return true;
    }
    return false;
  };
  const updateGuest = async (id: string, data: Partial<GuestLite>) => {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...data } : g)));
    await fetch(`${base}/guests/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(data),
    });
  };
  const removeGuest = async (id: string) => {
    setGuests((gs) => gs.filter((g) => g.id !== id));
    await fetch(`${base}/guests/${id}`, { method: "DELETE" });
  };

  const selected = useMemo(
    () => tables.find((tb) => tb.id === selectedId) ?? null,
    [tables, selectedId],
  );
  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId],
  );
  const seatedByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of guests) if (g.tableId) m[g.tableId] = (m[g.tableId] ?? 0) + 1;
    return m;
  }, [guests]);
  const unassigned = useMemo(() => guests.filter((g) => !g.tableId), [guests]);

  const dispW = Math.round(room.width * CANVAS_PPU);
  const dispH = Math.round(room.height * CANVAS_PPU);

  return (
    <div>
      {/* Title */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-brand text-[11px] font-semibold tracking-[0.22em] uppercase">
            {coupleNames}
          </p>
          <h1 className="font-display text-text mt-1.5 text-[32px] leading-none">
            {t("title.roomLayout")}
          </h1>
          <div className="via-brand/60 mt-3 h-px w-16 bg-gradient-to-r from-brand to-transparent" />
          <p className="text-text-muted mt-2 text-sm">
            {t("stats.summary", {
              tables: tables.length,
              landmarks: features.length,
              guests: guests.length,
            })}
          </p>
        </div>
        <div className="border-border bg-card flex overflow-hidden rounded-full border text-xs">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              aria-pressed={locale === l}
              className={
                "px-3 py-1.5 font-medium transition " +
                (locale === l ? "bg-brand text-[#141210]" : "text-text-muted hover:text-text")
              }
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={addTable} className={BTN}>+ {t("btn.addTable")}</button>
        <button onClick={addFeature} className={BTN}>+ {t("btn.addLandmark")}</button>
        {/* Auto-arrange hidden for now — re-enable via arrangeByDesign() in
            @/lib/seating-arrange when ready. */}
        <button onClick={revalidate} className={BTN}>{t("btn.check")}</button>
        <a
          href={`/${eventSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-brand ml-auto text-sm underline-offset-2 hover:underline"
        >
          {t("btn.preview")} ↗
        </a>
        <span className="text-text-muted w-40 text-right text-xs">
          {saving ? t("status.saving") : checkedOk ? (
            <span className="text-success">{t("status.allGood")}</span>
          ) : (
            t("status.saved")
          )}
        </span>
      </div>

      {/* Find a guest → jump to their table */}
      <div className="relative mb-3 max-w-xs">
        <input
          value={guestSearch}
          onChange={(e) => setGuestSearch(e.target.value)}
          placeholder={t("search.placeholder")}
          className="border-border bg-button-dark text-text placeholder:text-text-muted w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
        />
        {guestSearch.trim() && (
          <ul className="border-border bg-card absolute z-40 mt-1 w-full overflow-hidden rounded-[var(--radius-sm)] border shadow-[var(--shadow-lift)]">
            {searchMatches.length === 0 ? (
              <li className="text-text-muted px-3 py-2 text-sm">{t("search.none")}</li>
            ) : (
              searchMatches.map((g) => {
                const tbl = g.tableId ? tableById.get(g.tableId) : null;
                return (
                  <li key={g.id}>
                    <button
                      onClick={() => selectGuest(g)}
                      className="hover:bg-button-dark flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                    >
                      <span className="text-text truncate">{g.fullName}</span>
                      <span className="text-text-muted shrink-0 text-xs">
                        {tbl ? `${t("insp.table")} ${tbl.number}` : t("search.unseated")}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {/* Room shell — one line */}
      <div className="border-border mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-sm)] border p-2.5 text-xs">
        <span className="text-text font-medium">{t("room.shell")}</span>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">{t("room.shape")}</span>
          <Dropdown
            value={normalizeRoomShape(room.shape)}
            options={ROOM_SHAPES.map((s) => ({ value: s.value, label: t(`shapeName.${s.value}`) }))}
            onChange={(v) => patchRoom({ shape: v })}
            ariaLabel={t("room.shape")}
            className="w-48"
          />
        </div>
        <label className="text-text-muted flex items-center gap-2">
          {t("room.width")} <span className="text-text tabular-nums">{room.width}</span>
          <input type="range" min={240} max={560} step={10} value={room.width} className="w-24"
            onChange={(e) => patchRoom({ width: Number(e.target.value) })} />
        </label>
        <label className="text-text-muted flex items-center gap-2">
          {t("room.height")} <span className="text-text tabular-nums">{room.height}</span>
          <input type="range" min={240} max={700} step={10} value={room.height} className="w-24"
            onChange={(e) => patchRoom({ height: Number(e.target.value) })} />
        </label>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-text-muted text-xs">{t("help.drag")}</p>
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label={t("btn.undo")}
          className="text-text-muted hover:text-brand disabled:text-text-muted flex shrink-0 items-center gap-1 text-xs whitespace-nowrap transition disabled:cursor-default disabled:opacity-40"
        >
          <span aria-hidden className="text-sm">↺</span> {t("btn.undo")}
        </button>
      </div>

      {/* Canvas + inspector side by side (both top-aligned with the room) */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={onDragEnd}>
            <div
              ref={canvasRef}
              className="relative mx-auto overflow-hidden"
              style={{ width: dispW, height: dispH, maxWidth: "100%" }}
            >
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${room.width} ${room.height}`}
                preserveAspectRatio="none"
              >
                <RoomOutline
                  shape={room.shape}
                  W={room.width}
                  H={room.height}
                  fill="#0f0f0f"
                  stroke="#C9A96E"
                  gold="#C9A96E"
                  strokeWidth={1.5}
                />
              </svg>
              {features.map((f) => (
                <DraggableFeature
                  key={f.id}
                  feature={f}
                  label={f.type === "custom" ? f.label : t(`feat.${f.type}` as AdminKey)}
                  selected={f.id === selectedFeatureId}
                  onSelect={() => {
                    setSelectedId(null);
                    setSelectedFeatureId(f.id);
                  }}
                />
              ))}
              {tables.map((tb) => (
                <DraggableTable
                  key={tb.id}
                  table={tb}
                  seated={seatedByTable[tb.id] ?? 0}
                  selected={tb.id === selectedId}
                  onSelect={() => {
                    setSelectedFeatureId(null);
                    setSelectedId(tb.id);
                  }}
                />
              ))}
            </div>
          </DndContext>

          {warnings.length > 0 && (
            <ul className="border-danger/40 bg-danger/10 text-danger mt-4 space-y-1 rounded-[var(--radius-sm)] border p-3 text-sm">
              {warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
          {unseated != null && unseated > 0 && (
            <p className="border-brand/40 bg-brand/10 text-brand mt-4 rounded-[var(--radius-sm)] border p-3 text-sm">
              {t("check.unseated", { n: unseated })}
            </p>
          )}
          {checkedOk && (
            <p className="border-success/40 bg-success/10 text-success mt-4 rounded-[var(--radius-sm)] border p-3 text-sm">
              {t("status.allGood")}
            </p>
          )}
        </div>

        <aside className="self-start lg:sticky lg:top-4 lg:w-80">
          {selected ? (
            <TableInspector
              key={selected.id}
              t={t}
              table={selected}
              guests={guests.filter((g) => g.tableId === selected.id)}
              unassigned={unassigned}
              onChange={(data) => {
                updateTableLocal(selected.id, data);
                patchTable(selected.id, data);
              }}
              onChangeNumber={(n) => changeTableNumber(selected.id, n)}
              onDelete={() => deleteTable(selected.id)}
              onAddGuest={(name, seat) => addGuest(name, selected.id, seat)}
              onAssign={(id, seat) => updateGuest(id, { tableId: selected.id, seatNumber: seat })}
              onUpdateGuest={updateGuest}
              onRemoveGuest={removeGuest}
            />
          ) : selectedFeature ? (
            <FeatureInspector
              key={selectedFeature.id}
              t={t}
              feature={selectedFeature}
              onChange={(data) => {
                updateFeatureLocal(selectedFeature.id, data);
                patchFeature(selectedFeature.id, data);
              }}
              onDelete={() => deleteFeature(selectedFeature.id)}
            />
          ) : (
            <div className="card-surface text-text-muted text-sm">
              <p className="text-text mb-1 font-medium">{t("insp.nothing")}</p>
              <p>{t("insp.nothingHelp")}</p>
              {unassigned.length > 0 && (
                <p className="text-brand mt-3">{t("insp.unseated", { n: unassigned.length })}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  // Change a table's number; the API swaps with the table that already holds it.
  async function changeTableNumber(id: string, newNumber: number) {
    setSaving(true);
    try {
      const res = await fetch(`${base}/tables/${id}`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ number: newNumber }),
      });
      if (!res.ok) return;
      const { table, swapped } = await res.json();
      setTables((ts) =>
        ts.map((tb) => {
          if (table && tb.id === table.id) return { ...tb, ...table };
          if (swapped && tb.id === swapped.id) return { ...tb, number: swapped.number };
          return tb;
        }),
      );
    } finally {
      setSaving(false);
    }
  }
}

/** Canvas footprint of a table token, per shape + orientation. */
function tableDims(tb: Table): { w: number; h: number; r: number } {
  if (tb.shape === "rectangle") {
    return tb.orientation === "vertical"
      ? { w: 40, h: 76, r: 8 }
      : { w: 76, h: 40, r: 8 };
  }
  return { w: 48, h: 48, r: 999 };
}


function DraggableTable({
  table,
  seated,
  selected,
  onSelect,
}: {
  table: Table;
  seated: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id });
  const d = tableDims(table);
  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      {...listeners}
      {...attributes}
      className="absolute touch-none transition"
      style={{
        left: `${table.positionX * 100}%`,
        top: `${table.positionY * 100}%`,
        width: d.w,
        height: d.h,
        transform: `translate(-50%, -50%) ${CSS.Translate.toString(transform) ?? ""}`,
        zIndex: isDragging ? 20 : selected ? 10 : 2,
      }}
      aria-label={`Table ${table.number}, ${table.name}, ${seated}/${table.seatsCount}`}
    >
      <span
        aria-hidden
        className={
          "absolute inset-0 border " +
          (selected ? "border-brand bg-brand/25 ring-brand/50 ring-2" : "border-[#3A3A3A] bg-[#1F1F1F]")
        }
        style={{
          borderRadius: d.r,
          transform:
            table.shape === "rectangle" && table.rotation
              ? `rotate(${table.rotation}deg)`
              : undefined,
        }}
      />
      <span className="pointer-events-none relative flex h-full w-full flex-col items-center justify-center leading-none">
        <span className="font-display text-text text-base">{table.number}</span>
        <span className={"mt-0.5 text-[8px] " + (seated > table.seatsCount ? "text-danger font-semibold" : "text-text-muted")}>
          {seated}/{table.seatsCount}
        </span>
      </span>
    </button>
  );
}

function DraggableFeature({
  feature,
  label,
  selected,
  onSelect,
}: {
  feature: VenueFeature;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `feat:${feature.id}` });
  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      {...listeners}
      {...attributes}
      className={
        "absolute touch-none rounded-md border border-dashed transition " +
        (selected ? "border-brand bg-brand/10" : "border-brand/40 bg-transparent")
      }
      style={{
        left: `${feature.x * 100}%`,
        top: `${feature.y * 100}%`,
        width: `${feature.width * 100}%`,
        height: `${feature.height * 100}%`,
        transform:
          `${CSS.Translate.toString(transform) ?? ""} ${feature.rotation ? `rotate(${feature.rotation}deg)` : ""}`.trim() ||
          undefined,
        zIndex: isDragging ? 15 : 1,
      }}
      aria-label={`Landmark: ${label}`}
    >
      <span className="pointer-events-none flex h-full w-full items-center justify-center">
        <span
          className="text-brand text-[9px] tracking-wide whitespace-nowrap uppercase opacity-80"
          style={{ transform: feature.height > feature.width * 1.15 ? "rotate(-90deg)" : undefined }}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

function FeatureInspector({
  t,
  feature,
  onChange,
  onDelete,
}: {
  t: AdminT;
  feature: VenueFeature;
  onChange: (data: Partial<VenueFeature>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="card-surface flex flex-col gap-3">
      <h3 className="font-display text-text text-lg">{t("insp.landmark")}</h3>
      <div>
        <span className="text-text-muted text-xs">{t("insp.type")}</span>
        <div className="mt-1">
          <Dropdown
            value={feature.type}
            options={FEATURE_TYPES.map((ty) => ({ value: ty, label: t(`feat.${ty}`) }))}
            onChange={(v) => onChange({ type: v })}
            ariaLabel={t("insp.type")}
          />
        </div>
      </div>
      {feature.type === "custom" && (
        <label className="text-text-muted text-xs">
          {t("insp.label")}
          <input
            defaultValue={feature.label}
            onBlur={(e) => onChange({ label: e.target.value || "Zone" })}
            className="border-border bg-button-dark text-text mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
          />
        </label>
      )}
      <div className="flex gap-2">
        <label className="text-text-muted flex-1 text-xs">
          {t("room.width")}
          <input type="range" min={2} max={60} defaultValue={Math.round(feature.width * 100)}
            onChange={(e) => onChange({ width: Number(e.target.value) / 100 })} className="mt-1 w-full" />
        </label>
        <label className="text-text-muted flex-1 text-xs">
          {t("room.height")}
          <input type="range" min={2} max={40} defaultValue={Math.round(feature.height * 100)}
            onChange={(e) => onChange({ height: Number(e.target.value) / 100 })} className="mt-1 w-full" />
        </label>
      </div>
      <label className="text-text-muted text-xs">
        {t("insp.rotation")}: {Math.round(feature.rotation)}°
        <input type="range" min={0} max={345} step={15} defaultValue={feature.rotation}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })} className="mt-1 w-full" />
      </label>
      <button onClick={onDelete} className="text-danger mt-1 self-start text-sm underline-offset-2 hover:underline">
        {t("insp.deleteLandmark")}
      </button>
    </div>
  );
}

function TableInspector({
  t,
  table,
  guests,
  unassigned,
  onChange,
  onChangeNumber,
  onDelete,
  onAddGuest,
  onAssign,
  onUpdateGuest,
  onRemoveGuest,
}: {
  t: AdminT;
  table: Table;
  guests: GuestLite[];
  unassigned: GuestLite[];
  onChange: (data: Partial<Table>) => void;
  onChangeNumber: (n: number) => void;
  onDelete: () => void;
  onAddGuest: (name: string, seat: number | null) => Promise<boolean>;
  onAssign: (id: string, seat: number | null) => void;
  onUpdateGuest: (id: string, data: Partial<GuestLite>) => void;
  onRemoveGuest: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const seated = [...guests].sort((a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99));
  const nextSeat = () => {
    const used = new Set(guests.map((g) => g.seatNumber).filter(Boolean));
    for (let s = 1; s <= table.seatsCount; s++) if (!used.has(s)) return s;
    return null;
  };
  const submitGuest = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setErr(null);
    const ok = await onAddGuest(name, nextSeat());
    setAdding(false);
    if (ok) setNewName("");
    else setErr(t("insp.dupGuest"));
  };

  return (
    <div className="card-surface flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-text text-lg">{t("insp.table")} {table.number}</h3>
          <span className="text-text-muted text-xs">
            {t("insp.seated", { n: guests.length, cap: table.seatsCount })}
          </span>
        </div>

        <label className="text-text-muted text-xs">
          {t("insp.tableNumber")}
          <input
            key={table.number}
            type="number"
            min={1}
            max={999}
            defaultValue={table.number}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (n && n !== table.number) onChangeNumber(n);
            }}
            className="border-border bg-button-dark text-text mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
          />
        </label>

        <label className="text-text-muted text-xs">
          {t("insp.nameEn")}
          <input defaultValue={table.name} onBlur={(e) => onChange({ name: e.target.value })}
            className="border-border bg-button-dark text-text mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
        </label>
        <label className="text-text-muted text-xs">
          {t("insp.nameFr")}
          <input defaultValue={table.nameFr ?? ""} onBlur={(e) => onChange({ nameFr: e.target.value || null })}
            className="border-border bg-button-dark text-text mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
        </label>

        <div className="flex gap-2">
          <label className="text-text-muted flex-1 text-xs">
            {t("insp.seats")}
            <input type="number" min={1} max={20} defaultValue={table.seatsCount}
              onBlur={(e) => onChange({ seatsCount: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="border-border bg-button-dark text-text mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
          </label>
          <div className="flex-1">
            <span className="text-text-muted text-xs">{t("insp.shape")}</span>
            <div className="mt-1">
              <Dropdown
                value={table.shape}
                options={[
                  { value: "round", label: t("shape.round") },
                  { value: "rectangle", label: t("shape.rectangle") },
                ]}
                onChange={(v) => onChange({ shape: v as Shape })}
                ariaLabel={t("insp.shape")}
              />
            </div>
          </div>
        </div>

        {table.shape === "rectangle" && (
          <>
            <div>
              <span className="text-text-muted text-xs">{t("insp.seatLayout")}</span>
              <div className="mt-1">
                <Dropdown
                  value={table.orientation}
                  options={[
                    { value: "horizontal", label: t("layout.topBottom") },
                    { value: "vertical", label: t("layout.leftRight") },
                  ]}
                  onChange={(v) => onChange({ orientation: v as Orientation })}
                  ariaLabel={t("insp.seatLayout")}
                />
              </div>
            </div>
            <label className="text-text-muted text-xs">
              {t("insp.rotation")}: {Math.round(table.rotation)}°
              <input type="range" min={0} max={345} step={15} defaultValue={table.rotation}
                onChange={(e) => onChange({ rotation: Number(e.target.value) })} className="mt-1 w-full" />
            </label>
          </>
        )}

        <label className="text-text-muted text-xs">
          {t("insp.locationHint")}
          <input defaultValue={table.locationHint ?? ""} placeholder={t("insp.locationHintPh")}
            onBlur={(e) => onChange({ locationHint: e.target.value || null })}
            className="border-border bg-button-dark text-text placeholder:text-text-muted mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
        </label>
        <label className="text-text-muted text-xs">
          {t("insp.locationHintFr")}
          <input defaultValue={table.locationHintFr ?? ""}
            onBlur={(e) => onChange({ locationHintFr: e.target.value || null })}
            className="border-border bg-button-dark text-text placeholder:text-text-muted mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="border-border border-t pt-3">
        <h4 className="text-text mb-2 text-sm font-medium">{t("insp.guests")}</h4>
        {seated.length === 0 ? (
          <p className="text-text-muted text-xs">{t("insp.noOne")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {seated.map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <input type="number" min={1} defaultValue={g.seatNumber ?? ""} aria-label={`Seat ${g.fullName}`}
                  onBlur={(e) => onUpdateGuest(g.id, { seatNumber: e.target.value ? Number(e.target.value) : null })}
                  className="border-border bg-button-dark text-text w-12 rounded-[var(--radius-sm)] border px-2 py-1 text-center text-xs" />
                <span className="text-text flex-1 truncate text-sm">{g.fullName}</span>
                <button onClick={() => onUpdateGuest(g.id, { tableId: null, seatNumber: null })} className="text-text-muted hover:text-brand text-xs">{t("insp.unseat")}</button>
                <button onClick={() => onRemoveGuest(g.id)} className="text-danger text-sm leading-none">×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitGuest()}
            placeholder={t("insp.addGuestPh")}
            className="border-border bg-button-dark text-text flex-1 rounded-[var(--radius-sm)] border px-3 py-2 text-sm" />
          <button onClick={submitGuest} disabled={adding || !newName.trim()} className="bg-brand rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[#141210] disabled:opacity-50">{t("insp.add")}</button>
        </div>
        {err && <p className="text-danger mt-1 text-xs">{err}</p>}
      </div>

      {unassigned.length > 0 && (
        <div className="border-border border-t pt-3">
          <h4 className="text-text mb-2 text-sm font-medium">{t("insp.notSeated", { n: unassigned.length })}</h4>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {unassigned.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2">
                <span className="text-text truncate text-sm">{g.fullName}</span>
                <button onClick={() => onAssign(g.id, nextSeat())} className="border-border hover:bg-button-dark text-brand shrink-0 rounded-full border px-2 py-0.5 text-xs">{t("insp.seatHere")}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onDelete} className="text-danger mt-1 self-start text-sm underline-offset-2 hover:underline">{t("insp.deleteTable")}</button>
    </div>
  );
}

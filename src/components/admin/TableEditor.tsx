"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
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
import {
  resolveSeatPositions,
  seatBoxBody,
  toSeatLayout,
  type SeatSpot,
} from "@/lib/seat-box";
import { smoothPath, type RoomDrawing } from "@/lib/draw";

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

type Pt = [number, number];

/** Perpendicular distance from point p to the line a→b. */
function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer–Douglas–Peucker: drop points that don't add shape, killing the jitter
 *  that makes a curve look "cornered". */
function rdp(points: Pt[], eps: number): Pt[] {
  if (points.length < 3) return points;
  const a = points[0];
  const b = points[points.length - 1];
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [a, b];
}

/** Turn a raw stroke into a clean shape on release: a near-straight stroke snaps
 *  to a straight line (and locks to true vertical/horizontal when close); a
 *  curved stroke is de-noised so it renders as one smooth curve, no corners. */
function finalizeStroke(points: Pt[]): Pt[] {
  if (points.length < 2) return points;
  const a = points[0];
  const b = points[points.length - 1];
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (chord < 0.015) return points;

  let dev = 0;
  for (const p of points) dev = Math.max(dev, perpDist(p, a, b));

  // Straight-ish stroke → a straight line, axis-aligned if within ~14°.
  if (dev / chord < 0.09) {
    const deg = Math.abs((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
    if (Math.abs(deg - 90) < 14) {
      const mx = (a[0] + b[0]) / 2;
      return [[mx, a[1]], [mx, b[1]]]; // true vertical
    }
    if (deg < 14 || deg > 166) {
      const my = (a[1] + b[1]) / 2;
      return [[a[0], my], [b[0], my]]; // true horizontal
    }
    return [a, b]; // clean straight diagonal
  }

  // Curve → simplify away the jitter, keep the shape; the spline smooths the rest.
  return rdp(points, 0.008);
}

type Snap = {
  tables: Table[];
  features: VenueFeature[];
  room: RoomShell;
  drawings: RoomDrawing[];
};

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
// Alignment grid (normalized 0..1). Tables snap to it on drop; the grid is drawn
// only while dragging. 0.04 → 25 columns/rows.
const GRID = 0.04;
const GRID_FRACS = Array.from(
  { length: Math.round(1 / GRID) - 1 },
  (_, i) => (i + 1) * GRID,
);

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
  initialDrawings,
  labelStyle,
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
  initialDrawings: RoomDrawing[];
  labelStyle: "number" | "name";
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
  const [dragging, setDragging] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [drawings, setDrawings] = useState<RoomDrawing[]>(initialDrawings);
  const [drawMode, setDrawMode] = useState(false);
  const [drawingNow, setDrawingNow] = useState<[number, number][] | null>(null);
  const drawRef = useRef<[number, number][]>([]);
  const [move, setMove] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const moveRef = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);

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
    setHistory((h) => [...h.slice(-24), { tables, features, room, drawings }]);

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
    setDragging(false);
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

  const clearAllTables = async () => {
    setClearConfirm(false);
    pushHistory();
    setTables([]);
    setGuests((gs) => gs.map((g) => ({ ...g, tableId: null })));
    setSelectedId(null);
    await fetch(`${base}/tables/bulk-delete`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ all: true }),
    });
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

  // ── Freehand drawing (walls / aisles / the DJ corner…) ──────────────────────
  const saveDrawings = useCallback(
    async (next: RoomDrawing[]) => {
      setSaving(true);
      try {
        await fetch(`${base}/room`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomDrawings: next }),
        });
      } finally {
        setSaving(false);
      }
    },
    [base],
  );
  const drawPoint = (e: RPointerEvent): [number, number] | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return [
      clamp01((e.clientX - rect.left) / rect.width),
      clamp01((e.clientY - rect.top) / rect.height),
    ];
  };
  const onDrawDown = (e: RPointerEvent) => {
    const pt = drawPoint(e);
    if (!pt) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawRef.current = [pt];
    setDrawingNow([pt]);
  };
  const onDrawMove = (e: RPointerEvent) => {
    if (drawRef.current.length === 0) return;
    const pt = drawPoint(e);
    if (!pt) return;
    const last = drawRef.current[drawRef.current.length - 1];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 0.006) return; // throttle
    drawRef.current = [...drawRef.current, pt];
    setDrawingNow(drawRef.current);
  };
  const onDrawUp = () => {
    const pts = finalizeStroke(drawRef.current); // straighten / de-noise on release
    drawRef.current = [];
    setDrawingNow(null);
    if (pts.length >= 2) {
      pushHistory(); // so the new drawing can be undone
      const next = [...drawings, { id: crypto.randomUUID(), points: pts }];
      setDrawings(next);
      saveDrawings(next);
    }
  };
  const deleteDrawing = (id: string) => {
    pushHistory();
    const next = drawings.filter((d) => d.id !== id);
    setDrawings(next);
    saveDrawings(next);
  };
  // Drag a drawn shape to move it; a click without moving deletes it.
  const onDrawingDown = (e: RPointerEvent, id: string) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    moveRef.current = { id, sx: e.clientX, sy: e.clientY, moved: false };
    setMove({ id, dx: 0, dy: 0 });
  };
  const onDrawingMove = (e: RPointerEvent) => {
    const m = moveRef.current;
    if (!m) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - m.sx) / rect.width;
    const dy = (e.clientY - m.sy) / rect.height;
    if (Math.hypot(dx, dy) > 0.008) m.moved = true;
    setMove({ id: m.id, dx, dy });
  };
  const onDrawingUp = () => {
    const m = moveRef.current;
    const mv = move;
    moveRef.current = null;
    setMove(null);
    if (!m) return;
    if (!m.moved) {
      deleteDrawing(m.id);
      return;
    }
    if (!mv) return;
    pushHistory();
    const next = drawings.map((d) =>
      d.id === m.id
        ? {
            ...d,
            points: d.points.map(
              ([x, y]) =>
                [clamp01(x + mv.dx), clamp01(y + mv.dy)] as [number, number],
            ),
          }
        : d,
    );
    setDrawings(next);
    saveDrawings(next);
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
    setDrawings(prev.drawings);
    setSelectedId(null);
    setSelectedFeatureId(null);
    void persistSnapshot(prev);
  };

  const persistSnapshot = async (s: Snap) => {
    setSaving(true);
    try {
      await sendRoom(s.room);
      await saveDrawings(s.drawings);
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

  // Ctrl/⌘+Z → undo (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if (e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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

  // Seat map (shown below the room) for the selected table.
  const selectedTableGuests = useMemo(
    () => (selected ? guests.filter((g) => g.tableId === selected.id) : []),
    [guests, selected],
  );
  const seatConflicts = useMemo(() => {
    const c = new Map<number, number>();
    for (const g of selectedTableGuests)
      if (g.seatNumber != null) c.set(g.seatNumber, (c.get(g.seatNumber) ?? 0) + 1);
    return [...c.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  }, [selectedTableGuests]);
  const handleSeatClick = (seat: number) => {
    if (!selected) return;
    if (selectedTableGuests.some((g) => g.seatNumber === seat)) return;
    const unnumbered = selectedTableGuests.find((g) => g.seatNumber == null);
    if (unnumbered) updateGuest(unnumbered.id, { seatNumber: seat });
    else if (unassigned.length)
      updateGuest(unassigned[0].id, { tableId: selected.id, seatNumber: seat });
  };
  // Persist a custom seat position (normalized 0..1) for the selected table.
  const handleSeatMove = (seat: number, x: number, y: number) => {
    if (!selected) return;
    const current = Array.isArray(selected.seatLayout)
      ? (selected.seatLayout as unknown as (SeatSpot | null)[])
      : [];
    const layout: (SeatSpot | null)[] = Array.from(
      { length: selected.seatsCount },
      (_, i) => current[i] ?? null,
    );
    layout[seat - 1] = { x, y };
    updateTableLocal(selected.id, {
      seatLayout: layout as unknown as Table["seatLayout"],
    });
    patchTable(selected.id, {
      seatLayout: layout,
    } as unknown as Partial<Table>);
  };

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
        <button
          onClick={() => {
            setDrawMode((m) => !m);
            setSelectedId(null);
            setSelectedFeatureId(null);
          }}
          aria-pressed={drawMode}
          className={
            drawMode
              ? "bg-brand rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[#141210]"
              : BTN
          }
        >
          ✎ {t("btn.draw")}
        </button>
        {/* Auto-arrange hidden for now — re-enable via arrangeByDesign() in
            @/lib/seating-arrange when ready. */}
        <button onClick={revalidate} className={BTN}>{t("btn.check")}</button>
        {tables.length > 0 &&
          (clearConfirm ? (
            <span className="border-danger/40 flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs">
              <span className="text-text-muted">
                {t("confirm.clearAll", { n: tables.length })}
              </span>
              <button onClick={clearAllTables} className="text-danger font-medium">
                {t("common.yes")}
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="text-text-muted hover:text-text"
              >
                {t("common.no")}
              </button>
            </span>
          ) : (
            <button
              onClick={() => setClearConfirm(true)}
              className="border-border text-text-muted hover:border-danger/50 hover:text-danger rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition"
            >
              {t("btn.clearTables")}
            </button>
          ))}
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
          <input type="range" min={240} max={600} step={10} value={room.width} className="w-24"
            onChange={(e) => patchRoom({ width: Number(e.target.value) })} />
        </label>
        <label className="text-text-muted flex items-center gap-2">
          {t("room.height")} <span className="text-text tabular-nums">{room.height}</span>
          <input type="range" min={240} max={700} step={10} value={room.height} className="w-24"
            onChange={(e) => patchRoom({ height: Number(e.target.value) })} />
        </label>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={"text-xs " + (drawMode ? "text-brand" : "text-text-muted")}>
          {drawMode ? t("help.drawMode") : t("help.drag")}
        </p>
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
          <DndContext
            sensors={sensors}
            modifiers={[restrictToParentElement]}
            onDragStart={() => setDragging(true)}
            onDragEnd={onDragEnd}
          >
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
                {/* Alignment grid — fades in only while dragging. */}
                <g
                  style={{
                    opacity: dragging || drawMode || move ? 1 : 0,
                    transition: "opacity .18s ease-out",
                  }}
                >
                  {GRID_FRACS.map((fx) => (
                    <line
                      key={`v${fx}`}
                      x1={fx * room.width}
                      y1={0}
                      x2={fx * room.width}
                      y2={room.height}
                      stroke="#C9A96E"
                      strokeOpacity={0.14}
                      strokeWidth={0.75}
                    />
                  ))}
                  {GRID_FRACS.map((fy) => (
                    <line
                      key={`h${fy}`}
                      x1={0}
                      y1={fy * room.height}
                      x2={room.width}
                      y2={fy * room.height}
                      stroke="#C9A96E"
                      strokeOpacity={0.14}
                      strokeWidth={0.75}
                    />
                  ))}
                </g>
                {/* Freehand drawings — smooth curves through the drawn points */}
                {drawings.map((dr) => (
                  <path
                    key={dr.id}
                    d={smoothPath(dr.points, room.width, room.height)}
                    fill="none"
                    stroke="#C9A96E"
                    strokeOpacity={0.85}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={
                      move?.id === dr.id
                        ? `translate(${move.dx * room.width} ${move.dy * room.height})`
                        : undefined
                    }
                  />
                ))}
                {drawingNow && drawingNow.length >= 2 && (
                  <path
                    d={smoothPath(drawingNow, room.width, room.height)}
                    fill="none"
                    stroke="#C9A96E"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 3"
                  />
                )}
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

              {/* Draw mode: an overlay captures the stroke (and blocks table drag) */}
              {drawMode && (
                <div
                  className="absolute inset-0 z-30 cursor-crosshair touch-none"
                  onPointerDown={onDrawDown}
                  onPointerMove={onDrawMove}
                  onPointerUp={onDrawUp}
                  onPointerCancel={onDrawUp}
                />
              )}
              {/* Not drawing: drag a drawn shape to move it, or click to remove it */}
              {!drawMode && drawings.length > 0 && (
                <svg
                  className="absolute inset-0 z-30 h-full w-full"
                  viewBox={`0 0 ${room.width} ${room.height}`}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: "none" }}
                >
                  {drawings.map((dr) => (
                    <path
                      key={dr.id}
                      d={smoothPath(dr.points, room.width, room.height)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      strokeLinecap="round"
                      transform={
                        move?.id === dr.id
                          ? `translate(${move.dx * room.width} ${move.dy * room.height})`
                          : undefined
                      }
                      style={{
                        pointerEvents: "stroke",
                        cursor: move?.id === dr.id ? "grabbing" : "grab",
                      }}
                      onPointerDown={(e) => onDrawingDown(e, dr.id)}
                      onPointerMove={onDrawingMove}
                      onPointerUp={onDrawingUp}
                      onPointerCancel={onDrawingUp}
                    >
                      <title>Drag to move · click to remove</title>
                    </path>
                  ))}
                </svg>
              )}
            </div>
          </DndContext>

          {/* Zoomed table for the selected table — below the room, like the
              guest's tap-to-zoom view, so you can see exactly how guests sit. */}
          {selected && (
            <div className="border-border card-surface mt-4">
              <div className="mb-1 text-center">
                <p className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
                  {t("insp.seatMapTitle")}
                </p>
                {labelStyle === "name" &&
                ((locale === "fr" && selected.nameFr) || selected.name) ? (
                  <>
                    <h4 className="font-display text-brand text-2xl leading-tight italic">
                      {(locale === "fr" && selected.nameFr) || selected.name}
                    </h4>
                    <p className="text-text-muted mt-0.5 text-xs">
                      {t("insp.table")} {selected.number}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-display text-brand text-2xl leading-none">
                      {t("insp.table")} {selected.number}
                    </h4>
                    {selected.name && (
                      <p className="font-display text-text-muted mt-0.5 text-sm italic">
                        {(locale === "fr" && selected.nameFr) || selected.name}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                {/* The zoomed table */}
                <div className="mx-auto h-56 w-56 shrink-0">
                  <SeatMap
                    table={selected}
                    guests={selectedTableGuests}
                    onSeatClick={handleSeatClick}
                    onSeatMove={handleSeatMove}
                  />
                </div>

                {/* Who's here */}
                <div className="min-w-0 flex-1 self-stretch">
                  <div className="flex items-center justify-between">
                    <p className="text-text-muted text-[11px] tracking-[0.14em] uppercase">
                      {t("insp.guests")}
                    </p>
                    <span className="text-text-muted text-xs">
                      {t("insp.seated", { n: selectedTableGuests.length, cap: selected.seatsCount })}
                    </span>
                  </div>
                  <p className="text-text-muted mt-1 text-[11px]">
                    {t("insp.tapSeatToAssign")}
                  </p>
                  {seatConflicts.map((s) => (
                    <p key={s} className="text-danger mt-1 text-[11px]">
                      ⚠ {t("insp.seatConflict", { n: s })}
                    </p>
                  ))}

                  {selectedTableGuests.length === 0 ? (
                    <p className="text-text-muted mt-3 text-sm">{t("insp.noOne")}</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {[...selectedTableGuests]
                        .sort((a, b) => (a.seatNumber ?? 99) - (b.seatNumber ?? 99))
                        .map((g) => (
                          <li
                            key={g.id}
                            className="border-border flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-1.5"
                          >
                            <span className="bg-button-dark text-text-muted grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
                              {seatInitials(g.fullName)}
                            </span>
                            <span className="text-text flex-1 truncate text-sm">
                              {g.fullName}
                            </span>
                            <span className="text-text-muted shrink-0 text-[11px] tracking-wide uppercase">
                              {t("insp.seats")} {g.seatNumber ?? "·"}
                            </span>
                            <button
                              onClick={() => updateGuest(g.id, { seatNumber: null })}
                              className="text-text-muted hover:text-brand shrink-0 text-xs"
                              title={t("insp.unseat")}
                            >
                              ↺
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

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
      className="absolute touch-none"
      style={{
        left: `${table.positionX * 100}%`,
        top: `${table.positionY * 100}%`,
        width: d.w,
        height: d.h,
        transform: `translate(-50%, -50%) ${CSS.Translate.toString(transform) ?? ""}`,
        zIndex: isDragging ? 20 : selected ? 10 : 2,
        // No transition while dragging (instant follow); on drop, ease from the
        // drop point to the snapped grid position.
        transition: isDragging
          ? undefined
          : "left .2s ease-out, top .2s ease-out, transform .2s ease-out",
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

/** First+last initials for a seat chip. */
function seatInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Rotate (x,y) by `deg` around the box centre — used to convert a screen point
 *  back into the seat map's un-rotated coordinate space. */
function rotatePoint(x: number, y: number, deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const dx = x - 50;
  const dy = y - 50;
  return {
    x: 50 + dx * Math.cos(r) - dy * Math.sin(r),
    y: 50 + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

/** A clickable, drag-to-arrange seat map: each seat shows its occupant's initials
 *  (gold), empty seats show the seat number; a shared seat turns red. Tap an empty
 *  seat to seat the next guest; drag any seat to place it exactly where you want. */
function SeatMap({
  table,
  guests,
  onSeatClick,
  onSeatMove,
}: {
  table: Table;
  guests: GuestLite[];
  onSeatClick: (seat: number) => void;
  onSeatMove?: (seat: number, x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{
    seat: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  const pos = resolveSeatPositions(
    table.shape,
    table.orientation,
    table.seatsCount,
    toSeatLayout(table.seatLayout),
  );
  const bySeat = new Map<number, GuestLite[]>();
  for (const g of guests)
    if (g.seatNumber != null)
      bySeat.set(g.seatNumber, [...(bySeat.get(g.seatNumber) ?? []), g]);
  const bodyShape = seatBoxBody(table.shape, table.orientation);
  const body = bodyShape.kind === "rect" ? bodyShape : null;
  // Rotate the whole map to match the table on the canvas; seat labels are
  // counter-rotated so they stay upright.
  const rot = table.shape === "rectangle" ? (table.rotation ?? 0) : 0;

  const svgPoint = (e: RPointerEvent): { x: number; y: number } | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };
  const onDown = (e: RPointerEvent, s: number, base: { x: number; y: number }) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startRef.current = svgPoint(e);
    setDrag({ seat: s, x: base.x, y: base.y, moved: false });
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag || !startRef.current) return;
    const pt = svgPoint(e);
    if (!pt) return;
    // Convert the screen point into the group's un-rotated coordinate.
    const u = rot ? rotatePoint(pt.x, pt.y, -rot) : pt;
    const moved =
      Math.hypot(pt.x - startRef.current.x, pt.y - startRef.current.y) > 3;
    setDrag({ seat: drag.seat, x: u.x, y: u.y, moved: drag.moved || moved });
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    startRef.current = null;
    if (d.moved && onSeatMove) {
      const cl = (v: number) => Math.max(3, Math.min(97, v));
      onSeatMove(d.seat, cl(d.x) / 100, cl(d.y) / 100);
    } else {
      onSeatClick(d.seat);
    }
  };

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" className="mx-auto block h-full w-full">
      <g transform={rot ? `rotate(${rot} 50 50)` : undefined}>
        {body ? (
          <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={4} fill="#161616" stroke="#C9A96E" strokeOpacity={0.5} strokeWidth={1} />
        ) : (
          <circle cx={50} cy={50} r={21} fill="#161616" stroke="#C9A96E" strokeOpacity={0.5} strokeWidth={1} />
        )}
        {pos.map((p, i) => {
          const s = i + 1;
          const occ = bySeat.get(s) ?? [];
          const filled = occ.length >= 1;
          const conflict = occ.length > 1;
          const live = drag?.seat === s ? { x: drag.x, y: drag.y } : p;
          return (
            <g
              key={i}
              onPointerDown={(e) => onDown(e, s, p)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ cursor: drag?.seat === s ? "grabbing" : "grab", touchAction: "none" }}
            >
              <title>{filled ? occ.map((g) => g.fullName).join(", ") : `Seat ${s} — empty`}</title>
              <circle
                cx={live.x}
                cy={live.y}
                r={8.5}
                fill={filled ? (conflict ? "#E86B6B" : "#C9A96E") : "#242424"}
                stroke={conflict ? "#E86B6B" : filled ? "#A8823A" : "#3A3A3A"}
                strokeWidth={filled ? 1 : 0.8}
              />
              <text
                x={live.x}
                y={live.y + 1.9}
                textAnchor="middle"
                fontSize={filled ? 5 : 5.4}
                fontFamily="'Instrument Sans',sans-serif"
                fontWeight={filled ? 600 : 400}
                fill={filled ? "#141210" : "#8f8f8f"}
                transform={rot ? `rotate(${-rot} ${live.x} ${live.y})` : undefined}
              >
                {filled ? seatInitials(occ[0].fullName) : s}
              </text>
            </g>
          );
        })}
      </g>
      <text x={50} y={51.8} textAnchor="middle" fontSize={9} fontFamily="'Fraunces',serif" fill="#C9A96E">
        {table.number}
      </text>
    </svg>
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

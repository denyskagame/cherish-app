import type { Table, VenueFeature } from "@prisma/client";

// Pure geometry for placing tables in the room editor (kept out of the client
// component so it can be unit-checked). All coordinates are normalized 0..1.

export const place = (v: number) => Math.min(0.98, Math.max(0.02, v));
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Interior the arrangement keeps tables within, and spacing rules. A table (with
// its ring of seats) spans ~0.07 in normalized units, so margins clear the whole
// table — not just its centre — off landmarks and neighbours.
const INT = { x0: 0.14, x1: 0.86, y0: 0.17, y1: 0.9 };
const MIN_GAP = 0.14; // min centre-to-centre distance between tables
const LM_MARGIN = 0.08; // keep table centres this far off a landmark box

type RoomDims = { width: number; height: number };
type Pt = { x: number; y: number };

/** True if a normalized point falls inside (or near) any landmark box. */
export function overLandmark(
  x: number,
  y: number,
  features: VenueFeature[],
  m = LM_MARGIN,
): boolean {
  return features.some(
    (f) =>
      x >= f.x - m && x <= f.x + f.width + m && y >= f.y - m && y <= f.y + f.height + m,
  );
}

/** Columns for N tables, biased by room proportions (wider room → more columns). */
function colsFor(n: number, room: RoomDims) {
  const aspect = Math.max(0.4, room.width / room.height);
  return Math.max(1, Math.min(6, Math.round(Math.sqrt(Math.max(n, 1) * aspect))));
}

/** An aligned grid of `cols × rows` cells filling the interior evenly. */
function makeGrid(cols: number, rows: number): Pt[] {
  const colGap = cols > 1 ? (INT.x1 - INT.x0) / (cols - 1) : 0;
  const rowGap = rows > 1 ? (INT.y1 - INT.y0) / (rows - 1) : 0;
  const cells: Pt[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({
        x: cols > 1 ? INT.x0 + colGap * c : (INT.x0 + INT.x1) / 2,
        y: rows > 1 ? INT.y0 + rowGap * r : (INT.y0 + INT.y1) / 2,
      });
  return cells;
}

/** Landmark-free cells of the smallest aligned grid that fits `n` tables (so the
 *  layout stays a clean, aligned grid rather than scattering). Returns the most
 *  spacious option found if none fully fits. */
function bestFreeCells(n: number, features: VenueFeature[], room: RoomDims): Pt[] {
  const base = colsFor(n, room);
  const maxRows = Math.floor((INT.y1 - INT.y0) / MIN_GAP) + 1;
  let best: Pt[] = [];
  for (let cols = base; cols <= 6; cols++) {
    for (let rows = Math.ceil(n / cols); rows <= maxRows; rows++) {
      const free = makeGrid(cols, rows).filter((c) => !overLandmark(c.x, c.y, features));
      if (free.length >= n) return free;
      if (free.length > best.length) best = free;
    }
  }
  return best;
}

/** Spiral out from a point until it clears landmarks + placed tables (fallback). */
function findFreeSpot(x: number, y: number, features: VenueFeature[], placed: Pt[]): Pt {
  const bad = (px: number, py: number) =>
    overLandmark(px, py, features) ||
    placed.some((q) => Math.hypot(q.x - px, q.y - py) < MIN_GAP);
  const cx = Math.min(INT.x1, Math.max(INT.x0, x));
  const cy = Math.min(INT.y1, Math.max(INT.y0, y));
  if (!bad(cx, cy)) return { x: cx, y: cy };
  for (let radius = 0.05; radius <= 0.5; radius += 0.04)
    for (let a = 0; a < 360; a += 24) {
      const px = Math.min(INT.x1, Math.max(INT.x0, cx + radius * Math.cos((a * Math.PI) / 180)));
      const py = Math.min(INT.y1, Math.max(INT.y0, cy + radius * Math.sin((a * Math.PI) / 180)));
      if (!bad(px, py)) return { x: px, y: py };
    }
  return { x: cx, y: cy };
}

/** Position for a single new table — first free grid cell (aligned), else spiral. */
export function newTablePosition(
  existing: Table[],
  features: VenueFeature[],
  room: RoomDims,
) {
  const placed = existing.map((t) => ({ x: t.positionX, y: t.positionY }));
  for (const c of bestFreeCells(existing.length + 1, features, room)) {
    if (placed.some((q) => Math.hypot(q.x - c.x, q.y - c.y) < MIN_GAP)) continue;
    return { positionX: place(c.x), positionY: place(c.y) };
  }
  const p = findFreeSpot(0.5, 0.5, features, placed);
  return { positionX: place(p.x), positionY: place(p.y) };
}

/** Auto-arrange: a clean aligned grid sized to the room. Cells that hit a
 *  landmark are skipped (leaving a tidy gap) so tables stay on their rows/columns
 *  — a professional banquet layout, never on top of the stage/floor/etc. */
/** Assign tables (in numeric order) to the given ordered cells, skipping landmark
 *  cells; nudge into a gap only if we run out of cells. */
function assign(tables: Table[], orderedCells: Pt[], features: VenueFeature[]): Table[] {
  const free = orderedCells.filter((c) => !overLandmark(c.x, c.y, features));
  const ordered = [...tables].sort((a, b) => a.number - b.number);
  const placed: Pt[] = [];
  const byId = new Map<string, Pt>();
  ordered.forEach((t, i) => {
    const p =
      i < free.length
        ? free[i]
        : findFreeSpot((INT.x0 + INT.x1) / 2, (INT.y0 + INT.y1) / 2, features, placed);
    placed.push(p);
    byId.set(t.id, p);
  });
  return tables.map((t) => {
    const p = byId.get(t.id) ?? { x: 0.5, y: 0.5 };
    return { ...t, positionX: place(p.x), positionY: place(p.y) };
  });
}

export function arrangeAvoidingLandmarks(
  tables: Table[],
  features: VenueFeature[],
  room: RoomDims,
): Table[] {
  if (tables.length === 0) return tables;
  return assign(tables, bestFreeCells(tables.length, features, room), features);
}

// ── Multiple auto-arrange "designs" the operator can cycle through ────────────
export const ARRANGE_DESIGNS = ["grid", "rows", "perimeter"] as const;
export type ArrangeDesign = (typeof ARRANGE_DESIGNS)[number];

export function arrangeByDesign(
  design: ArrangeDesign,
  tables: Table[],
  features: VenueFeature[],
  room: RoomDims,
): Table[] {
  const n = tables.length;
  if (n === 0) return tables;
  if (design === "grid") return arrangeAvoidingLandmarks(tables, features, room);

  if (design === "rows") {
    // Wide banquet rows — more columns, fewer rows.
    const cols = Math.min(6, Math.max(3, Math.ceil(n / 3)));
    const maxRows = Math.floor((INT.y1 - INT.y0) / MIN_GAP) + 1;
    const rows = Math.min(maxRows, Math.ceil(n / cols) + 2);
    return assign(tables, makeGrid(cols, rows), features); // row-major
  }

  // perimeter — tables hug the edges around an open centre (dance floor).
  const cols = Math.min(6, Math.max(3, colsFor(n, room) + 1));
  const maxRows = Math.floor((INT.y1 - INT.y0) / MIN_GAP) + 1;
  const rows = Math.min(maxRows, Math.max(3, Math.ceil((n - 2 * cols) / 2) + 2));
  const cxm = (INT.x0 + INT.x1) / 2;
  const cym = (INT.y0 + INT.y1) / 2;
  const cells = makeGrid(cols, rows).sort(
    (a, b) => Math.hypot(b.x - cxm, b.y - cym) - Math.hypot(a.x - cxm, a.y - cym),
  ); // outer cells first
  return assign(tables, cells, features);
}

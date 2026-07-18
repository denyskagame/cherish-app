// Single source of truth for how seats sit around a table, so the admin seat map
// and every guest view render the SAME arrangement (scaled). All coordinates live
// in a 0..100 "seat box"; each renderer scales it (admin ×1, guest zoom ×3, the
// room map by a per-table factor). A custom seat spot (normalized 0..1) overrides
// the computed position, so "seat on the edge" looks identical everywhere.

export type SeatSpot = { x: number; y: number };
export type Pt = { x: number; y: number };

export type BoxBody =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number };

/** The table body within the 0..100 box. */
export function seatBoxBody(shape: string, orientation: string): BoxBody {
  if (shape === "rectangle") {
    return orientation === "vertical"
      ? { kind: "rect", x: 34, y: 18, w: 32, h: 64 }
      : { kind: "rect", x: 18, y: 34, w: 64, h: 32 };
  }
  return { kind: "circle", cx: 50, cy: 50, r: 21 };
}

/** Auto seat centres in the 0..100 box (ring for round, edges for rectangle). */
export function computedSeatPositions(
  shape: string,
  orientation: string,
  seatsCount: number,
): Pt[] {
  const n = Math.max(1, seatsCount);
  const out: Pt[] = [];
  const spread = (count: number, fixed: number, axis: "x" | "y") => {
    for (let k = 0; k < count; k++) {
      const tt = count === 1 ? 0.5 : k / (count - 1);
      const v = 16 + tt * 68;
      out.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
    }
  };
  if (shape === "rectangle") {
    const per = Math.ceil(n / 2);
    const rest = n - per;
    if (orientation === "vertical") {
      spread(per, 22, "y");
      spread(rest, 78, "y");
    } else {
      spread(per, 22, "x");
      spread(rest, 78, "x");
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      out.push({ x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a) });
    }
  }
  return out;
}

/** Seat centres (0..100), using the custom spot where the couple placed one. */
export function resolveSeatPositions(
  shape: string,
  orientation: string,
  seatsCount: number,
  layout: (SeatSpot | null)[] | null | undefined,
): Pt[] {
  const base = computedSeatPositions(shape, orientation, seatsCount);
  const custom = Array.isArray(layout) ? layout : [];
  return base.map((p, i) => {
    const c = custom[i];
    return c && typeof c.x === "number" ? { x: c.x * 100, y: c.y * 100 } : p;
  });
}

/** Coerce a table's JSON `seatLayout` column into a typed array. */
export function toSeatLayout(raw: unknown): (SeatSpot | null)[] {
  return Array.isArray(raw) ? (raw as (SeatSpot | null)[]) : [];
}

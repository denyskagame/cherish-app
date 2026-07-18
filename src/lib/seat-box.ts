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

/** Rectangle body size (fraction 0..1 of the box) → box dimensions, with the
 *  orientation-based default when the couple hasn't resized it. */
function rectDims(
  orientation: string,
  bodyW?: number | null,
  bodyH?: number | null,
): { w: number; h: number } {
  const w = (bodyW ?? (orientation === "vertical" ? 0.32 : 0.64)) * 100;
  const h = (bodyH ?? (orientation === "vertical" ? 0.64 : 0.32)) * 100;
  return { w, h };
}

/** The table body within the 0..100 box. */
export function seatBoxBody(
  shape: string,
  orientation: string,
  bodyW?: number | null,
  bodyH?: number | null,
): BoxBody {
  if (shape === "rectangle") {
    const { w, h } = rectDims(orientation, bodyW, bodyH);
    return { kind: "rect", x: 50 - w / 2, y: 50 - h / 2, w, h };
  }
  return { kind: "circle", cx: 50, cy: 50, r: 21 };
}

/** Auto seat centres in the 0..100 box (ring for round, hugging the rectangle's
 *  edges — which follow its size). */
export function computedSeatPositions(
  shape: string,
  orientation: string,
  seatsCount: number,
  bodyW?: number | null,
  bodyH?: number | null,
): Pt[] {
  const n = Math.max(1, seatsCount);
  const out: Pt[] = [];
  if (shape === "rectangle") {
    const { w, h } = rectDims(orientation, bodyW, bodyH);
    const GAP = 12;
    const per = Math.ceil(n / 2);
    const rest = n - per;
    const along = (count: number, fixed: number, axis: "x" | "y", span: number) => {
      const lo = 50 - span / 2 + 4;
      const hi = 50 + span / 2 - 4;
      for (let k = 0; k < count; k++) {
        const tt = count === 1 ? 0.5 : k / (count - 1);
        const v = Math.max(6, Math.min(94, lo + tt * (hi - lo)));
        out.push(axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v });
      }
    };
    if (orientation === "vertical") {
      along(per, 50 - w / 2 - GAP, "y", h);
      along(rest, 50 + w / 2 + GAP, "y", h);
    } else {
      along(per, 50 - h / 2 - GAP, "x", w);
      along(rest, 50 + h / 2 + GAP, "x", w);
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
  bodyW?: number | null,
  bodyH?: number | null,
): Pt[] {
  const base = computedSeatPositions(shape, orientation, seatsCount, bodyW, bodyH);
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

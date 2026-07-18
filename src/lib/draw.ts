// Freehand room drawings (walls / aisles / the DJ corner…), shared by the admin
// editor and the guest room map so both render the identical smooth curve.

export interface RoomDrawing {
  id: string;
  points: [number, number][];
}

/** Coerce a JSON column into a typed drawings array. */
export function toRoomDrawings(raw: unknown): RoomDrawing[] {
  return Array.isArray(raw) ? (raw as RoomDrawing[]) : [];
}

/** Catmull-Rom → cubic Bézier: renders the drawn points as one smooth curve. */
export function smoothPath(
  points: [number, number][],
  W: number,
  H: number,
): string {
  if (points.length < 2) return "";
  const p = points.map(([x, y]) => [x * W, y * H] as [number, number]);
  if (p.length === 2) return `M ${p[0][0]} ${p[0][1]} L ${p[1][0]} ${p[1][1]}`;
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

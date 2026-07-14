// The room shell outline — six selectable shapes (docs/01 §9). Returns SVG
// elements to embed inside an <svg viewBox="0 0 W H">. Shared by the guest room
// map and the admin editor canvas so both draw the identical shape.

export const ROOM_SHAPES = [
  { value: "rounded", label: "Simple rounded room" },
  { value: "double-frame", label: "Double gold frame" },
  { value: "chapel", label: "Arched head (chapel)" },
  { value: "bay", label: "Bay window / rounded top" },
  { value: "octagon", label: "Corner-cut ballroom" },
  { value: "marquee", label: "Marquee / tent" },
] as const;

/** Map any legacy/unknown value to a supported shape. */
export function normalizeRoomShape(shape: string): string {
  return ROOM_SHAPES.some((s) => s.value === shape) ? shape : "rounded";
}

/** Outline path `d` for the shapes that aren't a plain rounded rectangle. */
function outlinePath(shape: string, W: number, H: number): string | null {
  const m = 4;
  const L = m,
    R = W - m,
    T = m,
    B = H - m;
  switch (shape) {
    case "octagon": {
      const c = Math.min(W, H) * 0.16;
      return `M ${L + c} ${T} H ${R - c} L ${R} ${T + c} V ${B - c} L ${R - c} ${B} H ${L + c} L ${L} ${B - c} V ${T + c} Z`;
    }
    case "marquee": {
      const shoulder = T + H * 0.11;
      return `M ${L} ${shoulder} L ${W / 2} ${T} L ${R} ${shoulder} V ${B} H ${L} Z`;
    }
    case "chapel": {
      const t2 = T + H * 0.06;
      const aL = W * 0.34,
        aR = W * 0.66;
      return `M ${L} ${t2} H ${aL} Q ${W / 2} ${T - H * 0.01} ${aR} ${t2} H ${R} V ${B} H ${L} Z`;
    }
    case "bay": {
      const t2 = T + H * 0.055;
      return `M ${L} ${t2} Q ${W / 2} ${T - H * 0.005} ${R} ${t2} V ${B} H ${L} Z`;
    }
    default:
      return null;
  }
}

interface Props {
  shape: string;
  W: number;
  H: number;
  fill: string;
  stroke: string;
  gold: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export function RoomOutline({
  shape,
  W,
  H,
  fill,
  stroke,
  gold,
  strokeWidth = 1.25,
  strokeOpacity = 0.55,
}: Props) {
  const s = normalizeRoomShape(shape);
  const m = 4;

  if (s === "rounded" || s === "double-frame") {
    return (
      <>
        <rect
          x={m}
          y={m}
          width={W - m * 2}
          height={H - m * 2}
          rx={16}
          fill={fill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
        {s === "double-frame" && (
          <rect
            x={m + 9}
            y={m + 9}
            width={W - m * 2 - 18}
            height={H - m * 2 - 18}
            rx={11}
            fill="none"
            stroke={gold}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        )}
      </>
    );
  }

  const d = outlinePath(s, W, H);
  return (
    <>
      <path
        d={d ?? ""}
        fill={fill}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
      />
      {s === "marquee" && (
        <line
          x1={W / 2}
          y1={m}
          x2={W / 2}
          y2={m + H * 0.11}
          stroke={gold}
          strokeOpacity={0.5}
          strokeWidth={0.8}
        />
      )}
    </>
  );
}

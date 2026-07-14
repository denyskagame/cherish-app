"use client";
import type { Table, VenueFeature } from "@prisma/client";
import { RoomOutline } from "./RoomOutline";

// The room map (docs/01 §7): the operator-defined room shell (shape + size) with
// landmarks and every table from normalized coordinates, mixed round/rectangle
// shapes, on the dark Cherish Noir canvas. The guest's table is outlined in gold
// and is the ONLY interactive one (tap → zoom). Crucially, only the guest's OWN
// seat is gold — every other seat (including at their table) is inactive grey.
const PANEL = "#0f0f0f"; // room fill — same as card surfaces (a touch above pure black)
const INACTIVE = "#242424";
const INACTIVE_STROKE = "#333333";
const MUTED = "#9a9a9a";
const MINE_BODY = "#1a1a1a";

// Landmark names are translated by type (the stored label is used only for a
// "custom" zone), so the room reads in the guest's language.
const LM_LABELS: Record<string, { en: string; fr: string }> = {
  stage: { en: "Stage", fr: "Scène" },
  danceFloor: { en: "Dance Floor", fr: "Piste de danse" },
  dj: { en: "DJ", fr: "DJ" },
  buffet: { en: "Buffet", fr: "Buffet" },
  bar: { en: "Bar", fr: "Bar" },
  entrance: { en: "Entrance", fr: "Entrée" },
};
function landmarkLabel(f: VenueFeature, locale: "en" | "fr"): string {
  if (f.type === "custom") return f.label;
  return LM_LABELS[f.type]?.[locale] ?? f.label;
}

function halfExtents(t: Table) {
  if (t.shape === "rectangle") {
    return t.orientation === "vertical"
      ? { hw: 11, hh: 24 }
      : { hw: 24, hh: 11 };
  }
  return { hw: 13, hh: 13 };
}

/** Seat centers for a table, relative to its centre (before rotation). */
function seatOffsets(t: Table) {
  const n = t.seatsCount;
  const g = halfExtents(t);
  const out: { dx: number; dy: number }[] = [];
  if (t.shape === "rectangle") {
    const gap = 7;
    const per = Math.ceil(n / 2);
    const rest = n - per;
    if (t.orientation === "vertical") {
      const place = (count: number, dx: number) => {
        for (let k = 0; k < count; k++) {
          const tt = count === 1 ? 0.5 : k / (count - 1);
          out.push({ dx, dy: -g.hh + tt * 2 * g.hh });
        }
      };
      place(per, -g.hw - gap);
      place(rest, g.hw + gap);
    } else {
      const place = (count: number, dy: number) => {
        for (let k = 0; k < count; k++) {
          const tt = count === 1 ? 0.5 : k / (count - 1);
          out.push({ dx: -g.hw + tt * 2 * g.hw, dy });
        }
      };
      place(per, -g.hh - gap);
      place(rest, g.hh + gap);
    }
  } else {
    const orbit = g.hw + 7;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      out.push({ dx: orbit * Math.cos(a), dy: orbit * Math.sin(a) });
    }
  }
  return out;
}

function Landmark({
  f,
  W,
  H,
  brand,
  locale,
}: {
  f: VenueFeature;
  W: number;
  H: number;
  brand: string;
  locale: "en" | "fr";
}) {
  const x = f.x * W,
    y = f.y * H,
    w = f.width * W,
    h = f.height * H;
  const cx = x + w / 2,
    cy = y + h / 2;
  const rot = f.rotation ?? 0;
  const label = landmarkLabel(f, locale).toUpperCase();
  if (f.type === "entrance") {
    return (
      <text
        x={cx}
        y={y + h}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="'Instrument Sans',sans-serif"
        fill={MUTED}
        letterSpacing="0.14em"
        transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}
      >
        ▼ {label}
      </text>
    );
  }
  const dashed = f.type === "danceFloor";
  // Label runs along the box's long axis: vertical when the box is taller than
  // wide, horizontal otherwise — then rotates with the box.
  const labelBase = h > w * 1.15 ? -90 : 0;
  return (
    <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill="none"
        stroke={brand}
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <text
        x={cx}
        y={cy + 3.2}
        textAnchor="middle"
        fontSize={9}
        fontFamily="'Instrument Sans',sans-serif"
        fill={brand}
        fillOpacity={0.85}
        letterSpacing="0.1em"
        transform={labelBase ? `rotate(${labelBase} ${cx} ${cy})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

interface Props {
  tables: Table[];
  features: VenueFeature[];
  guestTable?: number | null;
  guestSeat?: number | null;
  locale?: "en" | "fr";
  brand?: string;
  roomShape?: string;
  roomWidth?: number;
  roomHeight?: number;
  labelStyle?: "number" | "name";
  onTapMyTable?: () => void;
}

export function RoomMap({
  tables,
  features,
  guestTable,
  guestSeat,
  locale = "en",
  brand = "#C9A96E",
  roomShape = "rectangle",
  roomWidth = 360,
  roomHeight = 470,
  labelStyle = "number",
  onTapMyTable,
}: Props) {
  const W = roomWidth || 360;
  const H = roomHeight || 470;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Room map with your table highlighted"
    >
      <RoomOutline
        shape={roomShape}
        W={W}
        H={H}
        fill={PANEL}
        stroke={brand}
        gold={brand}
      />

      {features.map((f) => (
        <Landmark key={f.id} f={f} W={W} H={H} brand={brand} locale={locale} />
      ))}

      {tables.map((t) => {
        const cx = t.positionX * W;
        const cy = t.positionY * H;
        const mine = t.number === guestTable;
        const g = halfExtents(t);
        const seats = seatOffsets(t);
        const label = (locale === "fr" && t.nameFr) || t.name;
        const rot = t.shape === "rectangle" ? (t.rotation ?? 0) : 0;

        const body =
          t.shape === "rectangle" ? (
            <rect
              x={cx - g.hw}
              y={cy - g.hh}
              width={g.hw * 2}
              height={g.hh * 2}
              rx={4}
              fill={mine ? MINE_BODY : INACTIVE}
              stroke={mine ? brand : INACTIVE_STROKE}
              strokeWidth={mine ? 1.5 : 1}
            />
          ) : (
            <circle
              cx={cx}
              cy={cy}
              r={g.hw}
              fill={mine ? MINE_BODY : INACTIVE}
              stroke={mine ? brand : INACTIVE_STROKE}
              strokeWidth={mine ? 1.5 : 1}
            />
          );

        return (
          <g
            key={t.id}
            role={mine ? "button" : undefined}
            tabIndex={mine ? 0 : undefined}
            onClick={mine ? onTapMyTable : undefined}
            onKeyDown={
              mine
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") onTapMyTable?.();
                  }
                : undefined
            }
            style={mine ? { cursor: "pointer" } : undefined}
            aria-label={
              mine
                ? `Table ${t.number}, ${label} — your table, tap to see who you're with`
                : `Table ${t.number}, ${label}`
            }
          >
            <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
              {seats.map((s, i) => {
                const isMySeat = mine && i === (guestSeat ?? 0) - 1;
                const sx = cx + s.dx;
                const sy = cy + s.dy;
                return (
                  <g key={i}>
                    {/* Blinking ring — on the guest's seat only, not the table. */}
                    {isMySeat && (
                      <circle cx={sx} cy={sy} r={5} fill="none" stroke={brand} strokeWidth={1.5}>
                        <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isMySeat ? 4.6 : 2.8}
                      fill={isMySeat ? brand : INACTIVE}
                      stroke={isMySeat ? "#A8823A" : INACTIVE_STROKE}
                      strokeWidth={isMySeat ? 1 : 0.8}
                    />
                  </g>
                );
              })}
              {body}
            </g>
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize={12}
              fontFamily="'Fraunces',serif"
              fontWeight="600"
              fill={mine ? brand : MUTED}
            >
              {t.number}
            </text>
            {/* In name mode, caption the guest's own table with its name. */}
            {mine && labelStyle === "name" && (
              <text
                x={cx}
                y={
                  cy +
                  (t.shape === "rectangle"
                    ? g.hh + (t.orientation === "vertical" ? 14 : 24)
                    : g.hw + 32)
                }
                textAnchor="middle"
                fontSize={10.5}
                fontFamily="'Fraunces',serif"
                fontStyle="italic"
                fill={brand}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

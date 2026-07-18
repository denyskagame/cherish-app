"use client";
import { useLocale, useT } from "@/lib/i18n/client";
import { resolveSeatPositions, seatBoxBody } from "@/lib/seat-box";
import type { Seat } from "./types";

// Tap-to-zoom single-table view (docs/01 §8): the table with seats around it
// (initials in the dots), the guest's own seat gold + blinking, and a clear
// avatar list of who's at the table with the guest highlighted. Uses the shared
// seat box (0..100) scaled ×3, so the guest sees EXACTLY the admin's arrangement.
const SZ = 300;
const S = SZ / 100;
const CX = SZ / 2;
const CY = SZ / 2;

export function TableZoom({
  guest,
  brand = "#C9A96E",
  labelStyle = "number",
  onBack,
}: {
  guest: Seat;
  brand?: string;
  labelStyle?: "number" | "name";
  onBack: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const tableName =
    (locale === "fr" && guest.tableNameFr) || guest.tableName || "";
  const seats = guest.seatmates;
  const isRect = guest.tableShape === "rectangle";
  const rot = isRect ? (guest.tableRotation ?? 0) : 0;
  const body = seatBoxBody(
    guest.tableShape,
    guest.tableOrientation,
    guest.tableBodyW,
    guest.tableBodyH,
  );

  // Seat centres straight from the shared box (custom spot where set), ×3 to SZ.
  const boxPos = resolveSeatPositions(
    guest.tableShape,
    guest.tableOrientation,
    Math.max(guest.tableSeatsCount, seats.length, 1),
    guest.seatLayout,
    guest.tableBodyW,
    guest.tableBodyH,
  );
  const pos = seats.map((s, i) => {
    const idx = s.seatNumber != null ? s.seatNumber - 1 : i;
    const bp = boxPos[idx] ?? boxPos[i] ?? { x: 50, y: 50 };
    return { x: bp.x * S, y: bp.y * S };
  });

  return (
    <div className="fade-up flex w-full max-w-app flex-col items-center px-6">
      <button
        onClick={onBack}
        className="border-border text-text-muted hover:text-text hover:border-brand/50 mb-5 flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-sm transition"
      >
        <span aria-hidden>←</span> {t("seat.back")}
      </button>

      {labelStyle === "name" && tableName ? (
        <>
          <p className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
            {t("seat.tableName")}
          </p>
          <h2 className="font-display text-brand text-3xl leading-tight italic">
            {tableName}
          </h2>
          <p className="text-text-muted mt-1 text-xs">
            {t("seat.table")} {guest.tableNumber}
          </p>
        </>
      ) : (
        <>
          <p className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
            {t("seat.table")}
          </p>
          <h2 className="font-display text-brand text-3xl leading-none">
            {guest.tableNumber}
          </h2>
          {tableName && (
            <p className="font-display text-text-muted mt-1 text-center text-sm italic">
              {tableName}
            </p>
          )}
        </>
      )}

      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        width="100%"
        className="mt-3 max-w-[300px]"
        role="img"
        aria-label={t("seat.whoElse")}
      >
        {/* table body — same box as the admin seat map, rotated to match */}
        <g transform={rot ? `rotate(${rot} ${CX} ${CY})` : undefined}>
          {body.kind === "rect" ? (
            <rect
              x={body.x * S}
              y={body.y * S}
              width={body.w * S}
              height={body.h * S}
              rx={12}
              fill="#161616"
              stroke={brand}
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
          ) : (
            <circle
              cx={body.cx * S}
              cy={body.cy * S}
              r={body.r * S}
              fill="#161616"
              stroke={brand}
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
          )}

          {seats.map((s, i) => {
            const p = pos[i];
            return (
              <g key={i}>
                {s.isYou && (
                  <circle cx={p.x} cy={p.y} r={20} fill="none" stroke={brand} strokeWidth={2}>
                    <animate attributeName="r" values="18;26;18" dur="1.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0;1" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={18}
                  fill={s.isYou ? brand : "#242424"}
                  stroke={s.isYou ? "#A8823A" : "#3A3A3A"}
                  strokeWidth={s.isYou ? 1.5 : 1}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'Instrument Sans',sans-serif"
                  fontWeight="600"
                  fill={s.isYou ? "#141210" : "#D4CFC7"}
                  transform={rot ? `rotate(${-rot} ${p.x} ${p.y})` : undefined}
                >
                  {s.initials}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* who's here */}
      <p className="text-text-muted mt-6 mb-2 w-full max-w-sm text-[11px] tracking-[0.14em] uppercase">
        {t("seat.whoElse")}
      </p>
      <ul className="w-full max-w-sm space-y-1.5">
        {seats.map((s) => (
          <li
            key={`${s.seatNumber}-${s.name}`}
            className={
              "flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 " +
              (s.isYou ? "border-brand/30 bg-brand/10" : "border-border")
            }
          >
            <span
              className={
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold " +
                (s.isYou ? "bg-brand text-[#141210]" : "bg-button-dark text-text-muted")
              }
            >
              {s.initials}
            </span>
            <span
              className={
                "flex-1 truncate text-sm " +
                (s.isYou ? "text-brand font-medium" : "text-text")
              }
            >
              {s.name}
              {s.isYou && (
                <span className="text-brand/70 ml-1.5 text-xs">{t("seat.you")}</span>
              )}
            </span>
            <span className="text-text-muted shrink-0 text-[11px] tracking-wide uppercase">
              {t("seat.seat")} {s.seatNumber ?? "·"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

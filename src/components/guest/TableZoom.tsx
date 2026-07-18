"use client";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Seat } from "./types";

// Tap-to-zoom single-table view (docs/01 §8): the table with seats around it
// (initials in the dots), the guest's own seat gold + blinking, and a clear
// avatar list of who's at the table with the guest highlighted.
const SZ = 300;
const CX = SZ / 2;
const CY = SZ / 2;

export function TableZoom({
  guest,
  brand = "#C9A96E",
  onBack,
}: {
  guest: Seat;
  brand?: string;
  onBack: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const tableName =
    (locale === "fr" && guest.tableNameFr) || guest.tableName || "";
  const seats = guest.seatmates;
  const n = Math.max(seats.length, 1);
  const isRect = guest.tableShape === "rectangle";

  // Seat dot positions in ring/edge order — but honor a custom spot the couple
  // placed for that seat (stored normalized 0..1; the seat box maps to 0..SZ).
  const layout = guest.seatLayout ?? [];
  const pos = seats.map((s, i) => {
    const custom = s.seatNumber != null ? layout[s.seatNumber - 1] : null;
    if (custom && typeof custom.x === "number") {
      return { x: custom.x * SZ, y: custom.y * SZ };
    }
    if (isRect) {
      const per = Math.ceil(n / 2);
      const top = i < per;
      const row = top ? per : n - per;
      const idx = top ? i : i - per;
      const tt = row === 1 ? 0.5 : idx / (row - 1);
      return { x: 46 + tt * (SZ - 92), y: top ? CY - 70 : CY + 70 };
    }
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: CX + 112 * Math.cos(a), y: CY + 112 * Math.sin(a) };
  });

  return (
    <div className="fade-up flex w-full max-w-app flex-col items-center px-6">
      <button
        onClick={onBack}
        className="border-border text-text-muted hover:text-text hover:border-brand/50 mb-5 flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-sm transition"
      >
        <span aria-hidden>←</span> {t("seat.back")}
      </button>

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

      <svg
        viewBox={`0 0 ${SZ} ${SZ}`}
        width="100%"
        className="mt-3 max-w-[300px]"
        role="img"
        aria-label={t("seat.whoElse")}
      >
        {/* table body */}
        {isRect ? (
          <rect
            x={CX - 84}
            y={CY - 40}
            width={168}
            height={80}
            rx={12}
            fill="#161616"
            stroke={brand}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ) : (
          <circle
            cx={CX}
            cy={CY}
            r={62}
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
              >
                {s.initials}
              </text>
            </g>
          );
        })}
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

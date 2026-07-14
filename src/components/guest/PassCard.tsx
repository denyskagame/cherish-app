"use client";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Seat } from "./types";

// The Pass Card (docs/01 §6): the answer, styled as a keepsake boarding-pass —
// near-black card, gold accents, Fraunces. Greets the guest by name, then the
// large table + seat numbers, table name, group, and the location cue. The side
// notches + dashed rule give the ticket feel.
export function PassCard({
  guest,
  coupleNames,
  labelStyle = "number",
}: {
  guest: Seat;
  coupleNames: string;
  labelStyle?: "number" | "name";
}) {
  const t = useT();
  const locale = useLocale();
  const tableName =
    (locale === "fr" && guest.tableNameFr) || guest.tableName || "";
  const locationHint =
    (locale === "fr" && guest.locationHintFr) || guest.locationHint || "";

  return (
    <section
      className="card-surface fade-up relative w-full max-w-app"
      aria-label={t("seat.tableName")}
    >
      {/* header — the event + a warm greeting by name */}
      <p className="font-display text-brand text-center text-[11px] tracking-[0.3em]">
        {coupleNames.toUpperCase()}
      </p>
      <p className="text-text-muted mt-4 text-center text-[10px] tracking-[0.22em] uppercase">
        {t("seat.welcome")}
      </p>
      <h2 className="font-display text-text mt-1 text-center text-[26px] leading-tight">
        {guest.name}
      </h2>

      {/* perforation with punched side notches */}
      <div className="relative my-5">
        <span className="bg-bg absolute top-1/2 -left-[21px] h-5 w-5 -translate-y-1/2 rounded-full" />
        <div className="border-border border-t border-dashed" />
        <span className="bg-bg absolute top-1/2 -right-[21px] h-5 w-5 -translate-y-1/2 rounded-full" />
      </div>

      {labelStyle === "name" ? (
        /* Name-led: the table's name is the headline, seat below. */
        <div className="text-center">
          <div className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
            {t("seat.tableName")}
          </div>
          <div className="font-display text-brand mt-1.5 text-[30px] leading-tight italic">
            {tableName || "—"}
          </div>
          <div className="mt-4 inline-flex items-baseline gap-2">
            <span className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
              {t("seat.seat")}
            </span>
            <span className="font-display text-text text-4xl leading-none">
              {guest.seatNumber ?? "—"}
            </span>
            {guest.tableNumber != null && (
              <span className="text-text-muted ml-2 text-xs">
                · {t("seat.table")} {guest.tableNumber}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Number-led: big table + seat numbers, name as subtitle. */
        <>
          <div className="flex items-stretch justify-center">
            <div className="flex-1 text-center">
              <div className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
                {t("seat.table")}
              </div>
              <div className="font-display text-brand mt-1 text-[64px] leading-none">
                {guest.tableNumber ?? "—"}
              </div>
            </div>
            <div className="bg-border mx-4 w-px" />
            <div className="flex-1 text-center">
              <div className="text-text-muted text-[10px] tracking-[0.22em] uppercase">
                {t("seat.seat")}
              </div>
              <div className="font-display text-text mt-1 text-[64px] leading-none">
                {guest.seatNumber ?? "—"}
              </div>
            </div>
          </div>
          {tableName && (
            <p className="font-display text-text mt-5 text-center text-xl italic">
              {tableName}
            </p>
          )}
        </>
      )}
      {guest.groupLabel && (
        <p className="text-text-muted mt-1 text-center text-xs">
          {t("seat.seatedWith")}{" "}
          <span className="text-text">{guest.groupLabel}</span>
        </p>
      )}
      {locationHint && (
        <p className="border-border text-text-muted mt-4 border-t border-dashed pt-3 text-center text-sm">
          <span className="text-brand">✦</span> {locationHint}
        </p>
      )}
    </section>
  );
}

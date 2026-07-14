"use client";
import { useState } from "react";
import type { Table, VenueFeature } from "@prisma/client";
import { useLocale, useT } from "@/lib/i18n/client";
import { PassCard } from "./PassCard";
import { RoomMap } from "./RoomMap";
import { TableZoom } from "./TableZoom";
import type { EventInfo, Seat } from "./types";

// The identified-guest experience (docs/01 §1): the pass card, the room map
// auto-revealed below it, and tap-to-zoom seatmates. (Directions live on the
// venue signage, so there's no directions button here.)
export function SeatFoundScreen({
  guest,
  coupleNames,
  tables,
  features,
  event,
  brand,
  onSearchAgain,
}: {
  guest: Seat;
  coupleNames: string;
  tables: Table[];
  features: VenueFeature[];
  event: EventInfo;
  brand: string;
  onSearchAgain: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center gap-5 px-4">
      {/* In the seatmates zoom the pass card is redundant — hide it for focus. */}
      {!zoomed && (
        <PassCard
          guest={guest}
          coupleNames={coupleNames}
          labelStyle={event.tableLabelStyle}
        />
      )}

      {zoomed ? (
        <TableZoom guest={guest} brand={brand} onBack={() => setZoomed(false)} />
      ) : (
        <div className="reveal-down flex w-full flex-col items-center">
          <div className="mb-3 text-center">
            <h3 className="font-display text-text text-lg">{t("seat.roomTitle")}</h3>
            <p className="text-text-muted mt-0.5 text-sm">{t("seat.tapYourTable")}</p>
          </div>
          {/* Room map — wide, so the whole room is easy to read */}
          <div className="w-full">
            <RoomMap
              tables={tables}
              features={features}
              guestTable={guest.tableNumber}
              guestSeat={guest.seatNumber}
              locale={locale}
              brand={brand}
              roomShape={event.roomShape}
              roomWidth={event.roomWidth}
              roomHeight={event.roomHeight}
              labelStyle={event.tableLabelStyle}
              onTapMyTable={() => setZoomed(true)}
            />
          </div>
          <button
            onClick={onSearchAgain}
            className="border-border text-text-muted hover:text-text hover:border-brand/50 mt-5 rounded-full border px-4 py-2 text-sm transition"
          >
            {t("seat.searchAgain")}
          </button>
        </div>
      )}
    </div>
  );
}

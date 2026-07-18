// Shapes returned by GET /api/events/[eventSlug]/guest and shared across the
// guest seat-finder components (docs/01).

export type TableShape = "round" | "rectangle";
export type TableOrientation = "horizontal" | "vertical";

/** A custom seat spot, normalized 0..1 within the seat box. */
export type SeatSpot = { x: number; y: number };

/** One seat at the guest's own table, for the tap-to-zoom view. */
export interface Seatmate {
  seatNumber: number | null;
  name: string;
  initials: string;
  isYou: boolean;
}

/** The identified guest's seat — everything the pass card + zoom need. */
export interface Seat {
  id: string;
  name: string;
  tableNumber: number | null;
  tableName: string | null;
  tableNameFr: string | null;
  seatNumber: number | null;
  groupLabel: string | null;
  locationHint: string | null;
  locationHintFr: string | null;
  tableShape: TableShape;
  tableOrientation: TableOrientation;
  tableRotation: number;
  tableSeatsCount: number;
  seatLayout: (SeatSpot | null)[] | null;
  seatmates: Seatmate[];
}

export interface AmbiguousOption {
  id: string;
  name: string;
  tableNumber: number | null;
  tableName: string | null;
}

export type LookupResult =
  | { found: true; guest: Seat }
  | { found: "ambiguous"; options: AmbiguousOption[] }
  | { found: false }
  | { error: string };

export interface EventInfo {
  slug: string;
  coupleNames: string;
  venueName: string;
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  roomShape: string;
  roomWidth: number;
  roomHeight: number;
  tableLabelStyle: "number" | "name";
  featureSeating: boolean;
  featureMenu: boolean;
  featureSchedule: boolean;
  featureMessages: boolean;
}

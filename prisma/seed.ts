import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../src/lib/fuzzy-name";

// Seeds one COUPLE/FREE org + one Event (slug = EVENT_SLUG) and the wedding data
// (docs/08 §16). Idempotent: re-running resets this event's children and recreates
// them. The data below is PLACEHOLDER — replace with the real wedding's guests,
// menu, and schedule before the rehearsal (docs/08 §16: "before Day 13").
const prisma = new PrismaClient();

const EVENT_SLUG = process.env.EVENT_SLUG ?? "aline-norbert-2026";

// 16 tables (docs/08 §16). shape: "round" | "rectangle"; orientation used by
// rectangles. locationHint is the plain-language cue the pass card shows.
// TODO(venue): replace names/shapes/positions/hints with the real Aline & Norbert floor plan.
const TABLES = [
  { number: 1,  name: "Head Table",        nameFr: "Table d'honneur",     seatsCount: 10, shape: "rectangle", orientation: "horizontal", positionX: 0.50, positionY: 0.08, locationHint: "front and centre, on the stage" },
  { number: 2,  name: "Garden Roses",      nameFr: "Roses du jardin",     seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.20, positionY: 0.26, locationHint: "left side, near the head table" },
  { number: 3,  name: "White Lilies",      nameFr: "Lys blancs",          seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.40, positionY: 0.26, locationHint: "left-centre, near the head table" },
  { number: 4,  name: "Champagne Peonies", nameFr: "Pivoines champagne",  seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.60, positionY: 0.26, locationHint: "right-centre, near the head table" },
  { number: 5,  name: "Golden Tulips",     nameFr: "Tulipes dorées",      seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.80, positionY: 0.26, locationHint: "right side, near the head table" },
  { number: 6,  name: "Cherry Blossoms",   nameFr: "Fleurs de cerisier",  seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.20, positionY: 0.44, locationHint: "left side, middle of the room" },
  { number: 7,  name: "Wild Orchids",      nameFr: "Orchidées sauvages",  seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.40, positionY: 0.44, locationHint: "left-centre, middle of the room" },
  { number: 8,  name: "Blue Hydrangea",    nameFr: "Hortensias bleus",    seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.60, positionY: 0.44, locationHint: "right-centre, middle of the room" },
  { number: 9,  name: "Sunflowers",        nameFr: "Tournesols",          seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.80, positionY: 0.44, locationHint: "right side, middle of the room" },
  { number: 10, name: "Lavender",          nameFr: "Lavande",             seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.20, positionY: 0.60, locationHint: "left side, near the bar" },
  { number: 11, name: "Magnolias",         nameFr: "Magnolias",           seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.40, positionY: 0.60, locationHint: "left-centre, near the dance floor" },
  { number: 12, name: "Dahlias",           nameFr: "Dahlias",             seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.60, positionY: 0.60, locationHint: "right-centre, near the dance floor" },
  { number: 13, name: "Ranunculus",        nameFr: "Renoncules",          seatsCount: 8,  shape: "round",     orientation: "horizontal", positionX: 0.80, positionY: 0.60, locationHint: "right side, near the buffet" },
  { number: 14, name: "Long Table A",      nameFr: "Grande table A",      seatsCount: 12, shape: "rectangle", orientation: "vertical",   positionX: 0.30, positionY: 0.80, locationHint: "back-left, along the wall" },
  { number: 15, name: "Long Table B",      nameFr: "Grande table B",      seatsCount: 12, shape: "rectangle", orientation: "vertical",   positionX: 0.70, positionY: 0.80, locationHint: "back-right, along the wall" },
  { number: 16, name: "Kids Table",        nameFr: "Table des enfants",   seatsCount: 6,  shape: "round",     orientation: "horizontal", positionX: 0.50, positionY: 0.88, locationHint: "near the entrance, by the DJ" },
];

// Venue landmarks (docs/01 §9) — rendered as minimalist gold line-style zones.
// TODO(venue): replace with the real room landmarks + positions.
const VENUE_FEATURES = [
  { type: "stage",      label: "Stage",       x: 0.30, y: 0.02, width: 0.40, height: 0.10 },
  { type: "danceFloor", label: "Dance Floor", x: 0.38, y: 0.66, width: 0.24, height: 0.14 },
  { type: "dj",         label: "DJ",          x: 0.46, y: 0.94, width: 0.08, height: 0.05 },
  { type: "buffet",     label: "Buffet",      x: 0.88, y: 0.55, width: 0.10, height: 0.18 },
  { type: "bar",        label: "Bar",         x: 0.02, y: 0.55, width: 0.10, height: 0.18 },
  { type: "entrance",   label: "Entrance",    x: 0.44, y: 0.97, width: 0.12, height: 0.03 },
];

// Placeholder guests — accented names exercise normalizeName(); table 4 has a
// full ring of seatmates (for the zoom view) and table 14 is a rectangle.
const GUESTS = [
  { fullName: "José García", tableNumber: 4, seatNumber: 1, groupLabel: "College Friends" },
  { fullName: "Anne-Marie Tremblay", tableNumber: 4, seatNumber: 2, groupLabel: "College Friends" },
  { fullName: "Michael Chen", tableNumber: 4, seatNumber: 3, groupLabel: "College Friends" },
  { fullName: "Priya Sharma", tableNumber: 4, seatNumber: 4, groupLabel: "College Friends" },
  { fullName: "Sophie Martin", tableNumber: 4, seatNumber: 5, groupLabel: "College Friends" },
  { fullName: "James Okafor", tableNumber: 4, seatNumber: 6, groupLabel: "College Friends" },
  { fullName: "François Léveillé", tableNumber: 14, seatNumber: 1, groupLabel: "Work" },
  { fullName: "Emma Wilson", tableNumber: 16, seatNumber: 1, groupLabel: "Neighbours" },
];

const MENU = [
  { course: "Starters", courseFr: "Entrées", name: "Heirloom Tomato & Burrata", nameFr: "Tomates anciennes et burrata", description: "Basil oil, aged balsamic, sea salt.", descriptionFr: "Huile de basilic, balsamique vieilli, fleur de sel.", sortOrder: 0 },
  { course: "Mains", courseFr: "Plats", name: "Roasted Supreme of Chicken", nameFr: "Suprême de poulet rôti", description: "Wild mushroom jus, potato purée, glazed vegetables.", descriptionFr: "Jus de champignons sauvages, purée de pommes de terre, légumes glacés.", sortOrder: 1 },
  { course: "Desserts", courseFr: "Desserts", name: "Vanilla Bean Crème Brûlée", nameFr: "Crème brûlée à la vanille", description: "Fresh berries, shortbread.", descriptionFr: "Petits fruits frais, sablé.", sortOrder: 2 },
];

const SCHEDULE = [
  { startsAt: "2026-07-11T20:00:00Z", title: "Ceremony", titleFr: "Cérémonie", icon: "rings", location: "Rose Garden", sortOrder: 0 },
  { startsAt: "2026-07-11T21:00:00Z", title: "Cocktail Hour", titleFr: "Cocktail", icon: "sparkler", location: "Terrace", sortOrder: 1 },
  { startsAt: "2026-07-11T22:00:00Z", title: "Dinner", titleFr: "Souper", icon: "dinner", location: "Main Hall", sortOrder: 2 },
  { startsAt: "2026-07-11T23:00:00Z", title: "Toasts", titleFr: "Discours", icon: "toast", location: "Main Hall", sortOrder: 3 },
  { startsAt: "2026-07-12T00:00:00Z", title: "First Dance", titleFr: "Première danse", icon: "dance", location: "Main Hall", sortOrder: 4 },
  { startsAt: "2026-07-12T00:30:00Z", title: "Cake Cutting", titleFr: "Gâteau", icon: "cake", location: "Main Hall", sortOrder: 5 },
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "the-brothers-wedding" },
    update: {},
    create: {
      name: "The Brother's Wedding",
      slug: "the-brothers-wedding",
      type: "COUPLE",
      plan: "FREE",
    },
  });

  // Reset: remove any prior events for this org (cascade clears tables, guests,
  // menu, schedule) so reseeding is clean even if the slug changed.
  await prisma.event.deleteMany({ where: { organizationId: org.id } });

  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      slug: EVENT_SLUG,
      coupleNames: "Aline & Norbert",
      partnerAName: "Aline",
      partnerBName: "Norbert",
      // TODO: placeholder date/venue — replace with the real wedding details.
      weddingDate: new Date("2026-07-11T20:00:00Z"),
      timezone: "America/Toronto",
      venueName: "The Rosewater Room",
      venueAddress: "123 Blossom Lane, Toronto, ON",
      defaultLocale: "en",
      enabledLocales: ["en", "fr"],
      status: "LIVE",
    },
  });

  const tableIdByNumber = new Map<number, string>();
  for (const t of TABLES) {
    const created = await prisma.table.create({ data: { eventId: event.id, ...t } });
    tableIdByNumber.set(t.number, created.id);
  }

  await prisma.venueFeature.createMany({
    data: VENUE_FEATURES.map((f) => ({ eventId: event.id, ...f })),
  });

  for (const g of GUESTS) {
    await prisma.guest.create({
      data: {
        eventId: event.id,
        fullName: g.fullName,
        nameNormalized: normalizeName(g.fullName),
        tableId: tableIdByNumber.get(g.tableNumber) ?? null,
        seatNumber: g.seatNumber,
        groupLabel: g.groupLabel,
      },
    });
  }

  await prisma.menuItem.createMany({
    data: MENU.map((m) => ({ eventId: event.id, ...m })),
  });

  await prisma.scheduleItem.createMany({
    data: SCHEDULE.map((s) => ({ eventId: event.id, ...s, startsAt: new Date(s.startsAt) })),
  });

  console.log(
    `Seeded org "${org.name}" → event "${event.coupleNames}" (${EVENT_SLUG}): ` +
      `${TABLES.length} tables, ${VENUE_FEATURES.length} venue features, ${GUESTS.length} guests, ${MENU.length} menu items, ${SCHEDULE.length} schedule items.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

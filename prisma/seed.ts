import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../src/lib/fuzzy-name";

// Seeds one COUPLE/FREE org + one Event (slug = EVENT_SLUG) and the wedding data
// (docs/08 §16). Idempotent: re-running resets this event's children and recreates
// them. The data below is PLACEHOLDER — replace with the real wedding's guests,
// menu, and schedule before the rehearsal (docs/08 §16: "before Day 13").
const prisma = new PrismaClient();

const EVENT_SLUG = process.env.EVENT_SLUG ?? "aline-norbert-2026";

const TABLES = [
  { number: 1, name: "Garden Roses", nameFr: "Roses du jardin", seatsCount: 8, positionX: 0.25, positionY: 0.33 },
  { number: 2, name: "White Lilies", nameFr: "Lys blancs", seatsCount: 8, positionX: 0.75, positionY: 0.33 },
  { number: 3, name: "Champagne Peonies", nameFr: "Pivoines champagne", seatsCount: 8, positionX: 0.25, positionY: 0.62 },
  { number: 4, name: "Golden Tulips", nameFr: "Tulipes dorées", seatsCount: 8, positionX: 0.75, positionY: 0.62 },
  { number: 5, name: "Cherry Blossoms", nameFr: "Fleurs de cerisier", seatsCount: 10, positionX: 0.5, positionY: 0.88 },
];

// Placeholder guests — includes accented names to exercise normalizeName().
const GUESTS = [
  { fullName: "José García", tableNumber: 1, seatNumber: 1, groupLabel: "Family" },
  { fullName: "Anne-Marie Tremblay", tableNumber: 1, seatNumber: 2, groupLabel: "Family" },
  { fullName: "Michael Chen", tableNumber: 2, seatNumber: 1, groupLabel: "College Friends" },
  { fullName: "Priya Sharma", tableNumber: 2, seatNumber: 2, groupLabel: "College Friends" },
  { fullName: "François Léveillé", tableNumber: 3, seatNumber: 1, groupLabel: "Work" },
  { fullName: "Emma Wilson", tableNumber: 5, seatNumber: 1, groupLabel: "Neighbours" },
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
      `${TABLES.length} tables, ${GUESTS.length} guests, ${MENU.length} menu items, ${SCHEDULE.length} schedule items.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from "@prisma/client";

// Wipe all wedding data for a clean start (npm run db:reset). Deleting events
// cascades to tables, guests, venue features, menu items, schedule items,
// messages, and photo uploads. The organization and admin login are kept, so you
// can log in and build a fresh event from the dashboard.
const prisma = new PrismaClient();

async function main() {
  const before = {
    events: await prisma.event.count(),
    guests: await prisma.guest.count(),
    tables: await prisma.table.count(),
    messages: await prisma.message.count(),
    photos: await prisma.photoUpload.count(),
  };
  const del = await prisma.event.deleteMany({});
  const orgs = await prisma.organization.count();

  console.log("Deleted (cascade):", before);
  console.log(`Removed ${del.count} event(s). Organizations kept: ${orgs}.`);
  console.log("Ready — open /admin to create the wedding from scratch.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

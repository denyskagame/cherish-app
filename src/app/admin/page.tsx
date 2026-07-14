import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  LayoutGrid,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { isAdminAuthenticated } from "@/lib/auth";
import { resolveOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { CopyField } from "@/components/admin/CopyField";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const org = await resolveOrganization();
  if (!org) {
    return (
      <main className="text-text-muted mx-auto max-w-5xl px-5 py-16 text-center">
        No organization found.
      </main>
    );
  }

  const event = await prisma.event.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
  });

  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <p className="text-brand text-[11px] font-semibold tracking-[0.25em] uppercase">
          New wedding
        </p>
        <h1 className="font-display text-text mt-2 text-3xl">Create your wedding</h1>
        <p className="text-text-muted mt-2 text-sm">
          Start with the essentials — you can refine everything later in Settings.
        </p>
        <div className="mt-6">
          <CreateEventForm />
        </div>
      </main>
    );
  }

  const [tables, guests, guestsSeated, landmarks] = await Promise.all([
    prisma.table.count({ where: { eventId: event.id } }),
    prisma.guest.count({ where: { eventId: event.id } }),
    prisma.guest.count({ where: { eventId: event.id, tableId: { not: null } } }),
    prisma.venueFeature.count({ where: { eventId: event.id } }),
  ]);

  const seating = `/admin/${event.slug}/seating`;
  const guestsPage = `/admin/${event.slug}/guests`;
  const settings = `/admin/${event.slug}/settings`;
  const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${event.slug}`;

  const dateLine = formatInTimeZone(
    event.weddingDate,
    event.timezone,
    "EEEE, MMMM d, yyyy",
  ).toUpperCase();
  const timeLine = formatInTimeZone(event.weddingDate, event.timezone, "h:mm a");
  const days = differenceInCalendarDays(event.weddingDate, new Date());

  const steps = [
    {
      icon: SlidersHorizontal,
      label: "Event details",
      desc: "Names, date, venue & languages",
      done: true,
      href: settings,
    },
    {
      icon: LayoutGrid,
      label: "Room & tables",
      desc: tables > 0 ? `${tables} tables · ${landmarks} landmarks` : "Lay out the room",
      done: tables > 0,
      href: seating,
    },
    {
      icon: Users,
      label: "Seat your guests",
      desc: guests > 0 ? `${guestsSeated} of ${guests} seated` : "Import & seat guests",
      done: guests > 0,
      href: guests > 0 ? seating : guestsPage,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const soon = [
    { icon: UtensilsCrossed, label: "Menu", desc: "The courses guests will see" },
    { icon: CalendarClock, label: "Schedule", desc: "The day-of timeline" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      {/* Hero */}
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-text-muted text-[11px] tracking-[0.28em] uppercase">
            The Wedding
          </p>
          <h1 className="font-display text-text mt-2 text-4xl leading-[1.05] italic sm:text-5xl">
            {event.coupleNames}
          </h1>
          <div className="via-brand/50 mt-5 h-px w-24 bg-gradient-to-r from-brand to-transparent" />
          <p className="text-text-muted mt-4 text-xs tracking-[0.14em]">
            {dateLine} <span className="text-brand/60 px-1">·</span> {timeLine}
          </p>
          <p className="text-text mt-1 text-sm">{event.venueName}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-display text-brand text-5xl leading-none">
              {days > 0 ? days : days === 0 ? "0" : "—"}
            </div>
            <div className="text-text-muted mt-1.5 text-[10px] tracking-[0.2em] uppercase">
              {days > 1
                ? "days to go"
                : days === 1
                  ? "one day to go"
                  : days === 0
                    ? "today"
                    : "past"}
            </div>
          </div>
          <span
            className={
              "self-start rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] uppercase " +
              (event.status === "LIVE"
                ? "border-success/50 text-success"
                : "border-border text-text-muted")
            }
          >
            {event.status}
          </span>
        </div>
      </section>

      {/* Setup checklist */}
      <section className="card-surface mt-10 !p-0">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-display text-text text-lg">Prepare the experience</h2>
            <p className="text-text-muted mt-0.5 text-xs">
              {doneCount} of {steps.length} essentials ready
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="bg-button-dark h-1.5 w-28 overflow-hidden rounded-full">
              <div
                className="bg-brand h-full rounded-full transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <ul>
          {steps.map((s) => (
            <li key={s.label} className="border-border border-b last:border-0">
              <Link
                href={s.href}
                className="hover:bg-button-dark/50 group flex items-center gap-4 px-5 py-4 transition"
              >
                <span
                  className={
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border " +
                    (s.done
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-border text-text-muted")
                  }
                >
                  <s.icon size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-text text-sm font-medium">{s.label}</div>
                  <div className="text-text-muted truncate text-xs">{s.desc}</div>
                </div>
                {s.done ? (
                  <span className="text-brand flex items-center gap-1 text-xs">
                    <Check size={14} /> Done
                  </span>
                ) : (
                  <span className="text-text-muted group-hover:text-brand flex items-center gap-1 text-xs transition">
                    Set up <ArrowRight size={13} />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-border bg-bg/40 border-t px-5 py-3">
          <p className="text-text-muted/70 mb-2 text-[10px] tracking-[0.16em] uppercase">
            Coming soon
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {soon.map((s) => (
              <div key={s.label} className="text-text-muted/60 flex items-center gap-2 text-sm">
                <s.icon size={15} strokeWidth={1.75} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Share + quick actions */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-surface flex flex-col">
          <h3 className="text-text-muted text-[11px] tracking-[0.16em] uppercase">
            Guest link
          </h3>
          <p className="text-text-muted mt-1 text-xs">
            One QR / link for every guest — seat, and more.
          </p>
          <div className="mt-3">
            <CopyField value={guestUrl} />
          </div>
          <a
            href={`/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand mt-3 inline-flex items-center gap-1 self-start text-sm hover:underline"
          >
            Open guest view <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="card-surface flex flex-col justify-between">
          <div>
            <h3 className="text-text-muted text-[11px] tracking-[0.16em] uppercase">
              At a glance
            </h3>
            <div className="mt-3 flex items-stretch">
              {[
                { v: guests, l: "Guests" },
                { v: tables, l: "Tables" },
                {
                  v: guests > 0 ? `${Math.round((guestsSeated / guests) * 100)}%` : "—",
                  l: "Seated",
                },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={
                    "flex-1 text-center " + (i > 0 ? "border-border border-l" : "")
                  }
                >
                  <div className="font-display text-text text-2xl">{s.v}</div>
                  <div className="text-text-muted mt-0.5 text-[11px]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <Link
            href={seating}
            className="border-border text-text hover:bg-button-dark hover:border-brand/50 mt-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-4 py-2.5 text-sm transition"
          >
            <LayoutGrid size={15} /> Open room layout
          </Link>
        </div>
      </section>
    </main>
  );
}

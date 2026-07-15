"use client";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, Check } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { iconEmoji } from "@/lib/schedule";
import { Flourish, Rings } from "./ornaments";

interface ScheduleData {
  timezone: string;
  items: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    title: string;
    description: string | null;
    icon: string | null;
    location: string | null;
  }[];
}

// Guest schedule (docs/02 §8) as an editorial timeline: a gold-lit time rail on
// the left, a hairline spine of nodes, and the item happening now glowing with a
// pulse while past moments recede. Every time formats in the EVENT timezone (via
// date-fns-tz), never the guest's device. Recomputed on a 30s tick.
export function ScheduleTimeline({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    fetch(`/api/events/${slug}/schedule?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : { timezone: "UTC", items: [] }))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ timezone: "UTC", items: [] }));
    return () => {
      alive = false;
    };
  }, [slug, locale]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const tz = data?.timezone ?? "UTC";
  const nextId = data?.items.find((i) => new Date(i.startsAt).getTime() > now)?.id;

  function fmtTime(ms: number) {
    if (locale === "fr")
      return { time: formatInTimeZone(ms, tz, "HH'h'mm"), mer: "" };
    return {
      time: formatInTimeZone(ms, tz, "h:mm"),
      mer: formatInTimeZone(ms, tz, "a"),
    };
  }
  function countdown(startMs: number): string {
    const mins = Math.round((startMs - now) / 60_000);
    if (mins < 1) return t("schedule.startingSoon");
    if (mins < 60) return t("schedule.inMin", { n: mins });
    return t("schedule.inHr", { h: Math.floor(mins / 60), m: mins % 60 });
  }

  return (
    <div className="mx-auto w-full max-w-app px-4">
      <header className="mb-8 text-center">
        <Rings size={26} />
        <h1 className="gold-foil font-display mt-3 text-[30px] leading-tight">
          {t("schedule.title")}
        </h1>
        <p className="font-display text-text-muted mt-1 text-[13px] italic">
          {t("schedule.subtitle")}
        </p>
        <Flourish className="mt-4" />
      </header>

      {data === null ? (
        <ScheduleSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState label={t("schedule.empty")} />
      ) : (
        <ol className="relative">
          {/* the spine, aligned to the node centres */}
          <span className="via-border absolute top-2 bottom-6 left-[4.9rem] w-px bg-gradient-to-b from-brand/50 to-transparent" />

          {data.items.map((item) => {
            const start = new Date(item.startsAt).getTime();
            const end = item.endsAt
              ? new Date(item.endsAt).getTime()
              : start + 30 * 60_000;
            const isNow = now >= start && now < end;
            const isPast = now >= end;
            const isNext = item.id === nextId;
            const { time, mer } = fmtTime(start);

            return (
              <li key={item.id} className="fade-up relative flex gap-4 pb-7 last:pb-0">
                {/* time rail */}
                <div
                  className={
                    "w-12 shrink-0 pt-1 text-right " + (isPast ? "opacity-45" : "")
                  }
                >
                  <div
                    className={
                      "font-display text-[15px] leading-none " +
                      (isNow ? "text-brand" : "text-text")
                    }
                  >
                    {time}
                  </div>
                  {mer && (
                    <div className="text-text-muted mt-0.5 text-[9px] tracking-[0.14em] uppercase">
                      {mer}
                    </div>
                  )}
                </div>

                {/* node on the spine */}
                <div className="relative flex w-6 shrink-0 justify-center pt-0.5">
                  {isNow ? (
                    <span className="bg-brand relative grid h-7 w-7 place-items-center rounded-full text-[13px] shadow-[0_0_14px_rgba(201,169,110,0.55)]">
                      <span className="border-brand/60 absolute inset-0 animate-ping rounded-full border" />
                      {iconEmoji(item.icon)}
                    </span>
                  ) : isPast ? (
                    <span className="border-border bg-card text-text-muted grid h-7 w-7 place-items-center rounded-full border">
                      <Check size={13} className="text-brand/70" />
                    </span>
                  ) : (
                    <span
                      className={
                        "bg-card grid h-7 w-7 place-items-center rounded-full border text-[13px] " +
                        (isNext ? "border-brand/70" : "border-border")
                      }
                    >
                      {iconEmoji(item.icon)}
                    </span>
                  )}
                </div>

                {/* content */}
                <div
                  className={
                    "min-w-0 flex-1 rounded-[var(--radius-sm)] border px-4 py-3 transition " +
                    (isNow
                      ? "border-brand/50 bg-brand/[0.06] shadow-[var(--shadow-card)]"
                      : isPast
                        ? "border-border/60 bg-transparent opacity-60"
                        : "border-border bg-card")
                  }
                >
                  {isNow && (
                    <div className="text-brand mb-1 text-[10px] font-bold tracking-[0.16em] uppercase">
                      {t("schedule.now")}
                    </div>
                  )}
                  <div className="font-display text-text text-[17px] leading-tight">
                    {item.title}
                  </div>
                  {item.location && (
                    <div className="text-text-muted mt-1 text-[11px] tracking-wide">
                      📍 {item.location}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-text-muted mt-1.5 text-xs leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {isNext && !isNow && (
                    <div className="border-brand/25 mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]">
                      <span className="bg-brand h-1.5 w-1.5 animate-pulse rounded-full" />
                      <span className="text-brand font-semibold tracking-[0.1em] uppercase">
                        {t("schedule.upNext")}
                      </span>
                      <span className="text-text-muted">· {countdown(start)}</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="relative space-y-7">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="bg-button-dark mt-1 h-4 w-12 shrink-0 animate-pulse rounded" />
          <div className="bg-button-dark h-7 w-7 shrink-0 animate-pulse rounded-full" />
          <div className="border-border flex-1 rounded-[var(--radius-sm)] border px-4 py-3">
            <div className="bg-button-dark h-4 w-1/2 animate-pulse rounded" />
            <div className="bg-button-dark/60 mt-2 h-3 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-text-muted grid place-items-center gap-3 py-12 text-center text-sm">
      <CalendarClock size={24} className="text-text-muted/50" />
      {label}
    </div>
  );
}

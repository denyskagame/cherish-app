"use client";
import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MenuCourse } from "@/lib/menu";
import { Corner, Flourish, Rings } from "./ornaments";

// Guest menu (docs/02 §4) styled as a real keepsake wedding menu card: a black,
// gold-foiled card with a hairline frame and corner flourishes, the couple's
// names as the crown, each course announced by a letter-spaced gold label, dishes
// centred in Fraunces with an italic description. Display-only — no dietary tags,
// no meal selection.
export function MenuScreen({
  slug,
  coupleNames,
  dates,
}: {
  slug: string;
  coupleNames: string;
  dates: Record<"en" | "fr", string>;
}) {
  const t = useT();
  const locale = useLocale();
  const [courses, setCourses] = useState<MenuCourse[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/events/${slug}/menu?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => alive && setCourses(data))
      .catch(() => alive && setCourses([]));
    return () => {
      alive = false;
    };
  }, [slug, locale]);

  return (
    <div className="mx-auto w-full max-w-app px-4">
      <article className="fade-up relative overflow-hidden rounded-[var(--radius)] border border-brand/25 bg-gradient-to-b from-[#121212] via-[#0d0d0d] to-[#090909] px-7 py-9 shadow-[var(--shadow-lift)]">
        {/* inner hairline frame + corner flourishes */}
        <div className="pointer-events-none absolute inset-[11px] rounded-[10px] border border-brand/12" />
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />

        {/* Crown — rings, couple, date */}
        <header className="relative text-center">
          <Rings />
          <h1 className="gold-foil font-display mt-3 text-[22px] leading-tight tracking-[0.06em]">
            {coupleNames}
          </h1>
          <p className="text-text-muted mt-2 text-[10px] tracking-[0.34em] uppercase">
            {t("menu.title")}
          </p>
          <p className="font-display text-text-muted/80 mt-1 text-[12px] italic">
            {dates[locale]}
          </p>
          <Flourish className="mt-5" />
        </header>

        {courses === null ? (
          <MenuSkeleton />
        ) : courses.length === 0 ? (
          <EmptyState label={t("menu.empty")} />
        ) : (
          <div className="relative mt-7 space-y-8">
            {courses.map((c) => (
              <section key={c.course} className="text-center">
                <h2 className="gold-foil text-[11px] font-semibold tracking-[0.32em] uppercase">
                  {c.course}
                </h2>
                <span className="bg-brand/40 mx-auto mt-2 mb-4 block h-px w-6" />
                <div className="space-y-5">
                  {c.items.map((it) => (
                    <div key={it.id}>
                      <p className="font-display text-text text-[19px] leading-snug">
                        {it.name}
                      </p>
                      {it.description && (
                        <p className="text-text-muted mx-auto mt-1.5 max-w-[32ch] text-[12.5px] leading-relaxed italic">
                          {it.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="pt-2">
              <Flourish className="mb-4" />
              <p className="gold-foil font-display text-center text-[27px] leading-none italic">
                {t("menu.closer")}
              </p>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="mt-7 space-y-8">
      {[0, 1, 2].map((s) => (
        <div key={s} className="text-center">
          <div className="bg-button-dark mx-auto h-3 w-24 animate-pulse rounded" />
          <div className="bg-brand/40 mx-auto my-4 h-px w-6" />
          <div className="bg-button-dark mx-auto h-4 w-2/3 animate-pulse rounded" />
          <div className="bg-button-dark/60 mx-auto mt-2 h-3 w-1/2 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-text-muted mt-7 grid place-items-center gap-3 py-10 text-center text-sm">
      <UtensilsCrossed size={24} className="text-text-muted/50" />
      {label}
    </div>
  );
}

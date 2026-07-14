"use client";
import { useCallback, useState } from "react";
import type { Table, VenueFeature } from "@prisma/client";
import { I18nProvider, useLocale, useSetLocale } from "@/lib/i18n/client";
import type { I18nKey } from "@/lib/i18n/dictionaries";
import { WelcomeScreen } from "./WelcomeScreen";
import { DisambiguationSheet } from "./DisambiguationSheet";
import { SeatFoundScreen } from "./SeatFoundScreen";
import type {
  AmbiguousOption,
  EventInfo,
  LookupResult,
  Seat,
} from "./types";

type Dict = Record<I18nKey, string>;

interface Props {
  event: EventInfo;
  subtitles: Record<"en" | "fr", string>;
  tables: Table[];
  features: VenueFeature[];
  brand: string;
  initialLocale: "en" | "fr";
  enabledLocales: ("en" | "fr")[];
  dictionaries: Record<"en" | "fr", Dict>;
}

export function GuestApp(props: Props) {
  return (
    <I18nProvider
      initialLocale={props.initialLocale}
      enabledLocales={props.enabledLocales}
      dictionaries={props.dictionaries}
    >
      <GuestShell {...props} />
    </I18nProvider>
  );
}

type View =
  | { kind: "search" }
  | { kind: "ambiguous"; options: AmbiguousOption[] }
  | { kind: "found"; guest: Seat };

function GuestShell({
  event,
  subtitles,
  tables,
  features,
  brand,
  enabledLocales,
}: Props) {
  const locale = useLocale();
  const [view, setView] = useState<View>({ kind: "search" });
  const [searching, setSearching] = useState(false);
  const [errorKey, setErrorKey] = useState<I18nKey | null>(null);

  const lookup = useCallback(async (params: URLSearchParams) => {
    setSearching(true);
    setErrorKey(null);
    try {
      const res = await fetch(
        `/api/events/${event.slug}/guest?${params.toString()}`,
      );
      if (res.status === 429) {
        setErrorKey("welcome.rateLimited");
        return;
      }
      if (res.status === 400) {
        setErrorKey("welcome.tooShort");
        return;
      }
      if (!res.ok) {
        setErrorKey("welcome.error");
        return;
      }
      const data: LookupResult = await res.json();
      if ("found" in data && data.found === true) {
        setView({ kind: "found", guest: data.guest });
      } else if ("found" in data && data.found === "ambiguous") {
        setView({ kind: "ambiguous", options: data.options });
      } else {
        setErrorKey("welcome.notFound");
        setView({ kind: "search" });
      }
    } catch {
      setErrorKey("welcome.error");
    } finally {
      setSearching(false);
    }
    // event.slug is stable for the mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (query: string) => lookup(new URLSearchParams({ q: query }));
  const onSelectOption = (id: string) => lookup(new URLSearchParams({ id }));
  const reset = () => {
    setErrorKey(null);
    setView({ kind: "search" });
  };

  return (
    <main className="bg-bg flex min-h-dvh flex-col py-6">
      {enabledLocales.length > 1 && (
        <div className="mx-auto flex w-full max-w-[600px] justify-end px-4">
          <LocaleToggle />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        {view.kind === "found" ? (
          <SeatFoundScreen
            guest={view.guest}
            coupleNames={event.coupleNames}
            tables={tables}
            features={features}
            event={event}
            brand={brand}
            onSearchAgain={reset}
          />
        ) : (
          <WelcomeScreen
            coupleNames={event.coupleNames}
            subtitle={subtitles[locale]}
            searching={searching}
            errorKey={errorKey}
            onSearch={onSearch}
          />
        )}
      </div>

      {view.kind === "ambiguous" && (
        <DisambiguationSheet
          options={view.options}
          onSelect={onSelectOption}
          onCancel={reset}
        />
      )}
    </main>
  );
}

/** Discreet FR | EN pill — matches the admin switcher (docs/08 §B7). */
function LocaleToggle() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  return (
    <div className="border-border bg-card flex overflow-hidden rounded-full border text-xs">
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={
            "px-3 py-1.5 font-medium transition " +
            (locale === l ? "bg-brand text-[#141210]" : "text-text-muted hover:text-text")
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

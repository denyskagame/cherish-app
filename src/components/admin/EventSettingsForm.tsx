"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const TIMEZONES = [
  "America/Toronto",
  "America/Montreal",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Paris",
  "Europe/London",
];

const FEATURES = [
  ["featureSeating", "Seating"],
  ["featureMenu", "Menu"],
  ["featureSchedule", "Schedule"],
  ["featureMessages", "Message book"],
  ["featurePhotos", "Photos"],
  ["featureRsvp", "RSVP"],
] as const;

const FIELD =
  "border-border bg-button-dark text-text placeholder:text-text-muted mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm";

export interface EventSettings {
  id: string;
  slug: string;
  coupleNames: string;
  partnerAName: string;
  partnerBName: string;
  weddingDateLocal: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  defaultLocale: "en" | "fr";
  enabledLocales: string[];
  tableLabelStyle: "number" | "name";
  status: string;
  featureSeating: boolean;
  featureMenu: boolean;
  featureSchedule: boolean;
  featureMessages: boolean;
  featurePhotos: boolean;
  featureRsvp: boolean;
}

export function EventSettingsForm({ event }: { event: EventSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState(event.slug);
  const [origin, setOrigin] = useState("");
  // One-time read of a client-only source (window has no server equivalent).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);
  const [enFr, setEnFr] = useState({
    en: event.enabledLocales.includes("en"),
    fr: event.enabledLocales.includes("fr"),
  });
  const [features, setFeatures] = useState<Record<string, boolean>>({
    featureSeating: event.featureSeating,
    featureMenu: event.featureMenu,
    featureSchedule: event.featureSchedule,
    featureMessages: event.featureMessages,
    featurePhotos: event.featurePhotos,
    featureRsvp: event.featureRsvp,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const enabledLocales = [
      ...(enFr.en ? ["en"] : []),
      ...(enFr.fr ? ["fr"] : []),
    ];
    if (enabledLocales.length === 0) {
      setErr("Pick at least one language.");
      setBusy(false);
      return;
    }
    const cleanSlug = slug.replace(/^-|-$/g, "");
    if (!cleanSlug) {
      setErr("The guest link can't be empty.");
      setBusy(false);
      return;
    }
    const defaultLocale = String(f.get("defaultLocale") || "en");
    const body = {
      slug: cleanSlug,
      coupleNames: String(f.get("coupleNames") || "").trim(),
      partnerAName: String(f.get("partnerAName") || "").trim() || null,
      partnerBName: String(f.get("partnerBName") || "").trim() || null,
      weddingDate: String(f.get("weddingDate") || ""),
      timezone: String(f.get("timezone") || event.timezone),
      venueName: String(f.get("venueName") || "").trim(),
      venueAddress: String(f.get("venueAddress") || "").trim() || null,
      defaultLocale: enabledLocales.includes(defaultLocale)
        ? defaultLocale
        : enabledLocales[0],
      enabledLocales,
      tableLabelStyle: String(f.get("tableLabelStyle") || event.tableLabelStyle),
      status: String(f.get("status") || event.status),
      ...features,
    };
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaved(true);
      // If the slug changed, the current URL is stale — move to the new one.
      if (data.slug && data.slug !== event.slug) {
        router.push(`/admin/${data.slug}/settings`);
      }
      router.refresh();
    } else if (res.status === 409) {
      setErr("That guest link is already taken — try a different one.");
    } else {
      setErr("Please check the fields and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="card-surface flex flex-col gap-4">
      <label className="text-text-muted text-xs">
        Couple names *
        <input name="coupleNames" required defaultValue={event.coupleNames} className={FIELD} />
      </label>

      <div className="text-text-muted text-xs">
        Guest link (the QR / URL)
        <div className="mt-1 flex items-stretch">
          <span className="border-border bg-bg/40 text-text-muted/80 flex items-center rounded-l-[var(--radius-sm)] border border-r-0 px-2.5 text-xs">
            {(origin || "…").replace(/^https?:\/\//, "")}/
          </span>
          <input
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))
            }
            className="border-border bg-button-dark text-text w-full rounded-r-[var(--radius-sm)] border px-3 py-2 text-sm"
            aria-label="Event slug"
          />
        </div>
        <p className="text-text-muted/70 mt-1.5 text-[11px]">
          ⚠ This is what your printed QR code points to. Lock it in{" "}
          <b>before printing</b> — changing it afterward breaks any QR already out
          there.
        </p>
      </div>
      <div className="flex gap-3">
        <label className="text-text-muted flex-1 text-xs">
          Partner A
          <input name="partnerAName" defaultValue={event.partnerAName} className={FIELD} />
        </label>
        <label className="text-text-muted flex-1 text-xs">
          Partner B
          <input name="partnerBName" defaultValue={event.partnerBName} className={FIELD} />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="text-text-muted flex-1 text-xs">
          Wedding date & time *
          <input type="datetime-local" name="weddingDate" required defaultValue={event.weddingDateLocal} className={FIELD} />
        </label>
        <label className="text-text-muted flex-1 text-xs">
          Timezone
          <select name="timezone" defaultValue={event.timezone} className={FIELD}>
            {[event.timezone, ...TIMEZONES.filter((t) => t !== event.timezone)].map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-text-muted text-xs">
        Venue name *
        <input name="venueName" required defaultValue={event.venueName} className={FIELD} />
      </label>
      <label className="text-text-muted text-xs">
        Venue address
        <input name="venueAddress" defaultValue={event.venueAddress} className={FIELD} />
      </label>

      <div className="text-text-muted text-xs">
        Languages
        <div className="mt-1.5 flex items-center gap-4">
          {(["en", "fr"] as const).map((l) => (
            <label key={l} className="text-text flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enFr[l]}
                onChange={(e) => setEnFr((s) => ({ ...s, [l]: e.target.checked }))} />
              {l.toUpperCase()}
            </label>
          ))}
          <span className="text-text-muted ml-auto flex items-center gap-2">
            Default
            <select name="defaultLocale" defaultValue={event.defaultLocale} className="border-border bg-button-dark text-text rounded-[var(--radius-sm)] border px-2 py-1 text-sm">
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
          </span>
        </div>
      </div>

      <div className="text-text-muted text-xs">
        Identify tables by
        <div className="border-border mt-1.5 inline-flex rounded-[var(--radius-sm)] border p-0.5">
          {(
            [
              ["number", "Numbers"],
              ["name", "Names"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="cursor-pointer">
              <input
                type="radio"
                name="tableLabelStyle"
                value={v}
                defaultChecked={event.tableLabelStyle === v}
                className="peer sr-only"
              />
              <span className="text-text-muted peer-checked:bg-brand block rounded-[calc(var(--radius-sm)-2px)] px-4 py-1.5 text-sm peer-checked:font-medium peer-checked:text-[#141210]">
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-text-muted/70 mt-1.5 text-[11px]">
          Numbers show “Table 4”; names show the table’s name (e.g. “Garden Roses”)
          as the guest’s headline.
        </p>
      </div>

      <div className="border-border border-t pt-3 text-text-muted text-xs">
        Guest features (what guests can see)
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {FEATURES.map(([key, label]) => (
            <label key={key} className="text-text flex items-center gap-2 text-sm">
              <input type="checkbox" checked={features[key]}
                onChange={(e) => setFeatures((s) => ({ ...s, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label className="text-text-muted text-xs">
        Status
        <select name="status" defaultValue={event.status} className={FIELD}>
          <option value="DRAFT">Draft (not shown to guests)</option>
          <option value="LIVE">Live</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>

      {err && <p className="text-danger text-xs">{err}</p>}
      <div className="mt-1 flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="bg-brand rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium text-[#141210] disabled:opacity-50">
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-success text-sm">Saved ✓</span>}
      </div>
    </form>
  );
}

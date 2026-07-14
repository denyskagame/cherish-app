"use client";
import { useState, type FormEvent } from "react";
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

const FIELD =
  "border-border bg-button-dark text-text placeholder:text-text-muted mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm";

export function CreateEventForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [enFr, setEnFr] = useState<{ en: boolean; fr: boolean }>({
    en: true,
    fr: true,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
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
    const defaultLocale = String(f.get("defaultLocale") || "en");
    const body = {
      coupleNames: String(f.get("coupleNames") || "").trim(),
      partnerAName: String(f.get("partnerAName") || "").trim() || undefined,
      partnerBName: String(f.get("partnerBName") || "").trim() || undefined,
      weddingDate: String(f.get("weddingDate") || ""),
      timezone: String(f.get("timezone") || "America/Toronto"),
      venueName: String(f.get("venueName") || "").trim(),
      venueAddress: String(f.get("venueAddress") || "").trim() || undefined,
      defaultLocale: enabledLocales.includes(defaultLocale)
        ? defaultLocale
        : enabledLocales[0],
      enabledLocales,
    };
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      const { slug } = await res.json();
      router.replace(`/admin/${slug}/seating`);
      router.refresh();
    } else {
      setErr("Please check the fields and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="card-surface flex flex-col gap-4">
      <label className="text-text-muted text-xs">
        Couple names *
        <input name="coupleNames" required placeholder="Aline & Norbert" className={FIELD} />
      </label>
      <div className="flex gap-3">
        <label className="text-text-muted flex-1 text-xs">
          Partner A
          <input name="partnerAName" placeholder="Aline" className={FIELD} />
        </label>
        <label className="text-text-muted flex-1 text-xs">
          Partner B
          <input name="partnerBName" placeholder="Norbert" className={FIELD} />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="text-text-muted flex-1 text-xs">
          Wedding date & time *
          <input type="datetime-local" name="weddingDate" required className={FIELD} />
        </label>
        <label className="text-text-muted flex-1 text-xs">
          Timezone
          <select name="timezone" defaultValue="America/Toronto" className={FIELD}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-text-muted text-xs">
        Venue name *
        <input name="venueName" required placeholder="The Rosewater Room" className={FIELD} />
      </label>
      <label className="text-text-muted text-xs">
        Venue address
        <input name="venueAddress" placeholder="123 Blossom Lane, Toronto, ON" className={FIELD} />
      </label>

      <div className="text-text-muted text-xs">
        Languages
        <div className="mt-1.5 flex items-center gap-4">
          {(["en", "fr"] as const).map((l) => (
            <label key={l} className="text-text flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enFr[l]}
                onChange={(e) => setEnFr((s) => ({ ...s, [l]: e.target.checked }))}
              />
              {l.toUpperCase()}
            </label>
          ))}
          <span className="text-text-muted ml-auto flex items-center gap-2">
            Default
            <select name="defaultLocale" defaultValue="en" className="border-border bg-button-dark text-text rounded-[var(--radius-sm)] border px-2 py-1 text-sm">
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
          </span>
        </div>
      </div>

      {err && <p className="text-danger text-xs">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="bg-brand mt-1 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium text-[#141210] disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create wedding"}
      </button>
    </form>
  );
}

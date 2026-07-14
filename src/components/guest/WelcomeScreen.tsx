"use client";
import { useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import type { I18nKey } from "@/lib/i18n/dictionaries";

// The first thing a guest sees (docs/01 §1): couple hero + a single name field.
// Owns the search input and its inline states — searching, not-found, error —
// while the parent owns the found / ambiguous transitions.
export function WelcomeScreen({
  coupleNames,
  subtitle,
  searching,
  errorKey,
  onSearch,
}: {
  coupleNames: string;
  subtitle: string;
  searching: boolean;
  errorKey: I18nKey | null;
  onSearch: (query: string) => void;
}) {
  const t = useT();
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length >= 2 && !searching) onSearch(q);
  }

  return (
    <div className="fade-up flex w-full max-w-app flex-col items-center px-6 text-center">
      <p className="font-display text-text-muted text-lg italic">
        {t("welcome.invited")}
      </p>
      <h1 className="font-display text-brand mt-2 text-[52px] leading-tight">
        {coupleNames}
      </h1>
      {subtitle && <p className="text-text-muted mt-1 text-sm">{subtitle}</p>}

      <div className="my-6 h-px w-40 bg-gradient-to-r from-transparent via-brand to-transparent" />

      <h2 className="font-display text-text text-2xl">{t("welcome.findSeat")}</h2>
      <p className="text-text-muted mt-1 text-sm">{t("welcome.enterName")}</p>

      <form onSubmit={submit} className="mt-5 w-full">
        <input
          type="text"
          name="name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("welcome.placeholder")}
          autoComplete="name"
          inputMode="text"
          enterKeyHint="search"
          aria-label={t("welcome.enterName")}
          className="border-border bg-card text-text placeholder:text-text-muted focus:border-brand focus:ring-brand/30 w-full rounded-[var(--radius-sm)] border px-4 py-3 text-center text-lg outline-none focus:ring-2"
        />
        <button
          type="submit"
          disabled={searching || value.trim().length < 2}
          className="bg-brand mt-3 w-full rounded-[var(--radius-sm)] px-4 py-3 font-medium text-[#141210] shadow-[var(--shadow-card)] transition disabled:opacity-50"
        >
          {searching ? t("welcome.searching") : t("welcome.cta")}
        </button>
      </form>

      {errorKey && (
        <p
          role="status"
          className="text-brand mt-4 max-w-xs text-sm leading-relaxed"
        >
          {t(errorKey)}
        </p>
      )}
    </div>
  );
}

"use client";
import { useT } from "@/lib/i18n/client";
import type { AmbiguousOption } from "./types";

// Shown when the lookup returns two+ plausible people (docs/01 §1, §11): we never
// guess. Each option carries a table hint so the guest can tell themselves apart;
// selecting one re-queries by id.
export function DisambiguationSheet({
  options,
  onSelect,
  onCancel,
}: {
  options: AmbiguousOption[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("disambig.title")}
      onClick={onCancel}
    >
      <div
        className="bg-card border-border fade-up w-full max-w-app rounded-t-[var(--radius)] border p-5 shadow-[var(--shadow-lift)] sm:rounded-[var(--radius)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-text text-center text-xl">
          {t("disambig.title")}
        </h2>
        <ul className="mt-4 flex flex-col gap-2">
          {options.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => onSelect(o.id)}
                className="border-border hover:border-brand hover:bg-button-dark flex w-full items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 text-left transition"
              >
                <span className="text-text font-medium">{o.name}</span>
                {o.tableNumber != null && (
                  <span className="text-text-muted text-sm">
                    {t("disambig.tableHint")} {o.tableNumber}
                    {o.tableName ? ` · ${o.tableName}` : ""}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={onCancel}
          className="text-text-muted mt-4 w-full py-2 text-sm underline-offset-2 hover:underline"
        >
          {t("disambig.cancel")}
        </button>
      </div>
    </div>
  );
}

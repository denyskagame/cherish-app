"use client";
import { useEffect, useRef, useState } from "react";

// A dark, gold-accented dropdown that replaces the native <select> (whose open
// list shows an un-stylable OS-blue highlight and looks generic).
interface Option {
  value: string;
  label: string;
}

export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={"relative " + className}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="border-border bg-button-dark text-text flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm"
      >
        <span className="truncate">{current?.label ?? value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={
            "text-text-muted shrink-0 transition-transform " +
            (open ? "rotate-180" : "")
          }
          aria-hidden
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="border-border bg-card absolute z-40 mt-1 max-h-64 min-w-full overflow-auto rounded-[var(--radius-sm)] border py-1 shadow-[var(--shadow-lift)]"
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={
                "cursor-pointer px-3 py-1.5 text-sm whitespace-nowrap transition " +
                (o.value === value
                  ? "bg-brand/15 text-brand"
                  : "text-text hover:bg-button-dark")
              }
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

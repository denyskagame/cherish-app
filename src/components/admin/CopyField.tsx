"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <div className="border-border bg-bg flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5">
      <span className="text-text flex-1 truncate font-mono text-[13px]">{value}</span>
      <button
        onClick={copy}
        aria-label="Copy link"
        className="text-text-muted hover:text-brand shrink-0 transition"
      >
        {copied ? (
          <Check size={15} className="text-success" />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}

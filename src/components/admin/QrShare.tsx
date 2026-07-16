"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Printer } from "lucide-react";

// The event's QR + guest link (docs/00 "one scan"). The QR encodes a stable URL,
// so it can be printed once and keeps working as content changes behind it. PNG
// (universal) and SVG (vector, sharp at any print size) are offered for download,
// plus a link to the print-ready sign.
export function QrShare({
  url,
  svg,
  png,
  printHref,
  guestHref,
}: {
  url: string;
  svg: string; // inline SVG markup for crisp on-screen display
  png: string; // high-res data URL for download
  printHref: string;
  guestHref: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    triggerDownload(URL.createObjectURL(blob), "cherish-qr.svg", true);
  };

  // Composite the QR onto a rounded, gold-bordered near-black tile and export a
  // high-res PNG (transparent outside the rounded corners) — ready to drop into
  // printed designs. Regenerates from the current URL each click.
  const [generating, setGenerating] = useState(false);
  const generatePng = () => {
    setGenerating(true);
    const size = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      if (!ctx) return;
      const radius = size * 0.08;
      ctx.save();
      roundRect(ctx, 0, 0, size, size, radius);
      ctx.clip();
      ctx.fillStyle = "#0F0F0F";
      ctx.fillRect(0, 0, size, size);
      const pad = size * 0.05;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      ctx.restore();
      const bw = size * 0.02;
      roundRect(ctx, bw / 2, bw / 2, size - bw, size - bw, radius - bw / 2);
      ctx.lineWidth = bw;
      ctx.strokeStyle = "#C9A96E";
      ctx.stroke();
      triggerDownload(canvas.toDataURL("image/png"), "cherish-qr.png");
      setGenerating(false);
    };
    img.onerror = () => setGenerating(false);
    img.src = png;
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR on a near-black tile with a thin gold border (Cherish Noir) */}
      <div
        className="border-brand/60 overflow-hidden rounded-[var(--radius-sm)] border bg-[#0F0F0F] p-1.5"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <p className="text-text-muted mt-3 max-w-full truncate text-center text-xs" title={url}>
        {url}
      </p>

      <button
        onClick={generatePng}
        disabled={generating}
        className="bg-brand mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[#141210] transition hover:brightness-110 disabled:opacity-50"
      >
        <Download size={15} /> {generating ? "Generating…" : "Generate QR (PNG)"}
      </button>

      <div className="mt-2 grid w-full grid-cols-3 gap-2">
        <button
          onClick={downloadSvg}
          className="border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition"
        >
          <Download size={14} /> SVG
        </button>
        <button
          onClick={copy}
          className="border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <Link
          href={printHref}
          target="_blank"
          className="border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition"
        >
          <Printer size={14} /> Sign
        </Link>
      </div>

      <a
        href={guestHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand mt-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        Open guest view <ExternalLink size={13} />
      </a>
    </div>
  );
}

function triggerDownload(href: string, name: string, revoke = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Rounded-rect path (uses native roundRect where available, else a manual arc). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

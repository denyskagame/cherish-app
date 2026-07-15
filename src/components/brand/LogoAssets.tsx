"use client";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

// Downloadable brand assets: the Cherish ring mark (PNG/SVG) and the full
// wordmark (PNG). The mark is pure geometry so its PNG is drawn straight to a
// canvas; the wordmark waits for the Fraunces web font to load before rendering.
const GOLD = "#C9A96E";

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 30" fill="none"><circle cx="15" cy="15" r="11.6" stroke="${GOLD}" stroke-width="2.8"/><circle cx="29" cy="15" r="11.6" stroke="${GOLD}" stroke-width="2.8"/></svg>`;

function drawRings(ctx: CanvasRenderingContext2D, s: number, ox = 0, oy = 0) {
  // Coordinate system: 44×30 viewBox scaled by `s`, offset by (ox, oy).
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.8 * s;
  ctx.beginPath();
  ctx.arc(ox + 15 * s, oy + 15 * s, 11.6 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox + 29 * s, oy + 15 * s, 11.6 * s, 0, Math.PI * 2);
  ctx.stroke();
}

function download(href: string, name: string, revoke = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function LogoAssets() {
  const iconPng = () => {
    const w = 1024;
    const s = w / 44;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = Math.round(30 * s);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawRings(ctx, s);
    download(canvas.toDataURL("image/png"), "cherish-icon.png");
  };

  const iconSvg = () => {
    const blob = new Blob([ICON_SVG], { type: "image/svg+xml" });
    download(URL.createObjectURL(blob), "cherish-icon.svg", true);
  };

  const logoPng = async () => {
    const H = 420;
    const canvas = document.createElement("canvas");
    canvas.width = 1700;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Ring mark on the left, vertically centred.
    const s = (H * 0.62) / 30;
    drawRings(ctx, s, 40, (H - 30 * s) / 2);
    // Wordmark — wait for Fraunces so it isn't a serif fallback.
    try {
      await document.fonts.load("400 220px Fraunces");
      await document.fonts.ready;
    } catch {
      /* fall back to a generic serif */
    }
    ctx.fillStyle = GOLD;
    ctx.font = "400 230px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Cherish", 40 + 44 * s + 60, H / 2 + 8);
    download(canvas.toDataURL("image/png"), "cherish-logo.png");
  };

  const btn =
    "border-border text-text hover:bg-button-dark hover:border-brand/50 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3.5 py-2 text-sm transition";

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <Link href="/admin" className="text-text-muted hover:text-text mb-6 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <p className="text-brand text-[11px] font-semibold tracking-[0.22em] uppercase">
        Brand assets
      </p>
      <h1 className="font-display text-text mt-1.5 text-[32px] leading-none">
        The Cherish logo
      </h1>

      {/* Preview */}
      <div className="card-surface mt-6 flex flex-col items-center gap-3 py-10">
        <svg width="120" height="82" viewBox="0 0 44 30" fill="none" aria-label="Cherish mark">
          <circle cx="15" cy="15" r="11.6" stroke={GOLD} strokeWidth="2.8" />
          <circle cx="29" cy="15" r="11.6" stroke={GOLD} strokeWidth="2.8" />
        </svg>
        <span className="font-display text-text text-[40px] leading-none tracking-tight">
          Cherish
        </span>
      </div>

      {/* Downloads */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={iconPng} className={btn}>
          <Download size={14} /> Icon PNG
        </button>
        <button onClick={iconSvg} className={btn}>
          <Download size={14} /> Icon SVG
        </button>
        <button onClick={logoPng} className={btn}>
          <Download size={14} /> Logo PNG
        </button>
      </div>
      <p className="text-text-muted/70 mt-2 text-[11px]">
        PNGs export on a transparent background at high resolution.
      </p>

      {/* Spec */}
      <dl className="border-border mt-6 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border text-sm">
        <Row k="Logo font" v="Fraunces — weight 400 (Google Fonts, free / OFL)" />
        <Row k="Body font" v="Instrument Sans" />
        <Row k="Brand gold" v="#C9A96E (deep gold #A8823A)" />
        <Row k="Mark" v="Two interlocking rings" />
      </dl>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-text-muted text-xs tracking-wide uppercase">{k}</dt>
      <dd className="text-text text-right">{v}</dd>
    </div>
  );
}

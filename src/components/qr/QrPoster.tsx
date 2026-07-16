"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

const GOLD = "#9A7B3F";

// A print-ready "scan me" sign for the venue (tables / entrance). Light ivory and
// gold to match the printed keepsake; A5, full-bleed, saved via browser Print.
export function QrPoster({
  coupleNames,
  png,
  url,
}: {
  coupleNames: string;
  png: string;
  url: string;
}) {
  return (
    <div className="q-root">
      <style>{CSS}</style>

      <div className="q-toolbar no-print">
        <Link href="/admin" className="q-back">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="q-toolbar-right">
          <span className="q-hint">
            In the print dialog: <b>A5</b> · turn off <b>Headers &amp; footers</b>
          </span>
          <button className="q-print-btn" onClick={() => window.print()}>
            <Printer size={16} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="q-stage">
        <section className="q-sheet">
          <div className="q-frame">
            <svg className="q-rings" width="46" height="30" viewBox="0 0 30 20" fill="none" aria-hidden>
              <circle cx="11" cy="10" r="7.4" stroke={GOLD} strokeWidth="1" />
              <circle cx="19" cy="10" r="7.4" stroke={GOLD} strokeWidth="1" />
            </svg>

            <p className="q-eyebrow">You’re invited to share the day</p>
            <h1 className="q-couple">{coupleNames}</h1>

            <div className="q-flourish" aria-hidden>
              <span className="q-line" />
              <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0 8 4 4 8 0 4Z" fill={GOLD} /></svg>
              <span className="q-line" />
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="q-qr" src={png} alt="Scan this code" width={300} height={300} />

            <p className="q-scan">Scan for your seat</p>
            <p className="q-sub">The menu · the schedule · leave a message</p>
            <p className="q-sub q-fr">Votre place · le menu · l’horaire · laissez un mot</p>

            <p className="q-url">{url.replace(/^https?:\/\//, "")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

const CSS = `
.q-root {
  min-height: 100vh;
  background: #DCD6CB;
  color: #2B2620;
  font-family: 'Instrument Sans', system-ui, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.q-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 12px 18px; background: #171310; color: #E9E2D2; border-bottom: 1px solid #2a241d;
}
.q-back { display: inline-flex; align-items: center; gap: 6px; color: #cbc0a6; text-decoration: none; font-size: 14px; }
.q-back:hover { color: #F0DEB4; }
.q-toolbar-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.q-hint { font-size: 12px; color: #a99e86; }
.q-print-btn {
  display: inline-flex; align-items: center; gap: 8px; background: #C9A96E; color: #191510;
  border: none; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.q-print-btn:hover { filter: brightness(1.07); }

.q-stage { padding: 32px 16px 64px; display: flex; justify-content: center; }
.q-sheet {
  width: 148mm; box-sizing: border-box; background: #FBF7EF; padding: 12mm;
  box-shadow: 0 12px 34px rgba(0,0,0,.4); border-radius: 2px;
  min-height: 210mm; display: flex;
}
.q-frame {
  flex: 1; border: 1px solid #9A7B3F; outline: 3px solid #FBF7EF; outline-offset: -5px;
  box-shadow: inset 0 0 0 1px #E7DECB;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 14mm 10mm;
}
.q-rings { display: block; }
.q-eyebrow { margin: 14px 0 0; font-size: 10px; letter-spacing: .32em; text-transform: uppercase; color: #7A7264; }
.q-couple { font-family: 'Fraunces', Georgia, serif; font-weight: 400; font-size: 32px; margin: 10px 0 0; color: #2B2620; text-wrap: balance; }
.q-flourish { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 18px 0; }
.q-flourish .q-line { height: 1px; width: 46px; background: #9A7B3F; opacity: .5; }
.q-qr { width: 62mm; height: 62mm; display: block; background: #0F0F0F; padding: 2mm; border-radius: 3px; border: 1px solid #9A7B3F; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
.q-scan { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 22px; color: #9A7B3F; margin: 18px 0 0; }
.q-sub { font-size: 13px; color: #6b6459; margin: 6px 0 0; }
.q-fr { font-style: italic; color: #8A7F6C; margin-top: 2px; }
.q-url { font-size: 11px; letter-spacing: .06em; color: #a2977f; margin: 16px 0 0; }

@media print {
  @page { size: A5 portrait; margin: 0; }
  html, body { background: #FBF7EF !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .q-root { background: #FBF7EF; min-height: 0; }
  .no-print { display: none !important; }
  .q-stage { padding: 0; display: block; }
  .q-sheet { width: auto; min-height: 0; box-shadow: none; border-radius: 0; padding: 0; height: 206mm; }
  .q-frame { padding: 12mm 10mm; }
}
`;

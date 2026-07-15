"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getFont } from "@/lib/fonts";

interface KMessage {
  id: string;
  guestName: string;
  bodyText: string;
  fontId: string;
}

// The print-ready keepsake book (docs/03 §10). A deliberately LIGHT design —
// warm ivory paper, gold + charcoal ink, Fraunces titles, each message set in the
// guest's own handwriting font — laid out as A5 pages the couple saves as a PDF
// (browser Print → Save as PDF) and can send to a print-on-demand binder.
const GOLD = "#9A7B3F";

export function KeepsakeBook({
  eventSlug,
  coupleNames,
  dateLabel,
  venueName,
  messages,
}: {
  eventSlug: string;
  coupleNames: string;
  dateLabel: string;
  venueName: string;
  messages: KMessage[];
}) {
  return (
    <div className="k-root">
      <style>{CSS}</style>

      {/* Toolbar — screen only */}
      <div className="k-toolbar no-print">
        <Link href={`/admin/${eventSlug}/messages`} className="k-back">
          <ArrowLeft size={16} /> Back to messages
        </Link>
        <div className="k-toolbar-right">
          <span className="k-hint">
            In the print dialog: <b>Save as PDF</b> · <b>A5</b> · turn off{" "}
            <b>Headers &amp; footers</b>
          </span>
          <button className="k-print-btn" onClick={() => window.print()}>
            <Printer size={16} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="k-stage">
        {/* ---------- Cover ---------- */}
        <section className="k-sheet k-cover">
          <div className="k-frame">
            <Rings />
            <p className="k-eyebrow">A Book of Well-Wishes</p>
            <h1 className="k-couple">{coupleNames}</h1>
            <Flourish />
            <p className="k-cover-meta">{dateLabel}</p>
            <p className="k-cover-meta k-venue">{venueName}</p>
          </div>
        </section>

        {/* ---------- Messages ---------- */}
        {messages.length === 0 ? (
          <section className="k-sheet">
            <p className="k-empty">
              No messages yet to bind into a book. Once your guests have signed the
              book, come back and their words will be here.
            </p>
          </section>
        ) : (
          <section className="k-sheet k-body">
            <p className="k-section-head">Messages from those who love you</p>
            <div className="k-messages">
              {messages.map((m) => {
                const font = getFont(m.fontId);
                return (
                  <figure className="k-msg" key={m.id}>
                    <blockquote
                      className="k-quote"
                      style={{
                        fontFamily: font.family,
                        fontSize: `${font.size + 1}px`,
                        fontWeight: font.weight,
                      }}
                    >
                      {m.bodyText}
                    </blockquote>
                    <figcaption className="k-name">— {m.guestName}</figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------- Closing ---------- */}
        {messages.length > 0 && (
          <section className="k-sheet k-closing">
            <div className="k-frame">
              <Flourish />
              <p className="k-closing-lead">With love and gratitude,</p>
              <p className="k-closing-couple">{coupleNames}</p>
              <p className="k-closing-count">
                {messages.length}{" "}
                {messages.length === 1 ? "message" : "messages"} from those who love
                you
              </p>
              <Rings />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Rings() {
  return (
    <svg
      className="k-rings"
      width="46"
      height="30"
      viewBox="0 0 30 20"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="10" r="7.4" stroke={GOLD} strokeWidth="1" />
      <circle cx="19" cy="10" r="7.4" stroke={GOLD} strokeWidth="1" />
    </svg>
  );
}

function Flourish() {
  return (
    <div className="k-flourish" aria-hidden>
      <span className="k-line" />
      <svg width="8" height="8" viewBox="0 0 8 8">
        <path d="M4 0 8 4 4 8 0 4Z" fill={GOLD} />
      </svg>
      <span className="k-line" />
    </div>
  );
}

const CSS = `
.k-root {
  --k-paper: #FBF7EF;
  --k-ink: #2B2620;
  --k-soft: #7A7264;
  --k-gold: #9A7B3F;
  --k-line: #E7DECB;
  min-height: 100vh;
  background: #DCD6CB;
  color: var(--k-ink);
  font-family: 'Instrument Sans', system-ui, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.k-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
  padding: 12px 18px;
  background: #171310; color: #E9E2D2;
  border-bottom: 1px solid #2a241d;
}
.k-back { display: inline-flex; align-items: center; gap: 6px; color: #cbc0a6; text-decoration: none; font-size: 14px; }
.k-back:hover { color: #F0DEB4; }
.k-toolbar-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.k-hint { font-size: 12px; color: #a99e86; }
.k-print-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #C9A96E; color: #191510; border: none;
  padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.k-print-btn:hover { filter: brightness(1.07); }

.k-stage { padding: 32px 16px 64px; display: flex; flex-direction: column; align-items: center; gap: 26px; }

.k-sheet {
  width: 148mm; box-sizing: border-box;
  background: var(--k-paper);
  padding: 18mm 16mm;
  box-shadow: 0 10px 34px rgba(0,0,0,.28);
  border-radius: 2px;
}
.k-cover, .k-closing { min-height: 210mm; display: flex; align-items: center; justify-content: center; text-align: center; }
.k-frame {
  width: 100%; padding: 16mm 8mm;
  border: 1px solid var(--k-gold);
  outline: 3px solid var(--k-paper); outline-offset: -5px;
  box-shadow: inset 0 0 0 1px var(--k-line);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.k-rings { display: block; }
.k-eyebrow { margin: 14px 0 0; font-size: 10px; letter-spacing: .34em; text-transform: uppercase; color: var(--k-soft); }
.k-couple { font-family: 'Fraunces', Georgia, serif; font-weight: 400; font-size: 34px; letter-spacing: .01em; color: var(--k-ink); margin: 12px 0 0; text-wrap: balance; }
.k-cover-meta { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 13px; color: var(--k-soft); margin: 4px 0 0; }
.k-venue { margin-top: 2px; }

.k-flourish { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 16px 0; }
.k-flourish .k-line { height: 1px; width: 46px; background: var(--k-gold); opacity: .5; }

.k-section-head { text-align: center; font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 15px; color: var(--k-gold); margin: 0 0 6mm; letter-spacing: .02em; }
.k-messages { display: flex; flex-direction: column; }
.k-msg { break-inside: avoid; text-align: center; padding: 8mm 2mm; }
.k-msg + .k-msg { border-top: 1px solid var(--k-line); }
.k-quote { margin: 0; color: var(--k-ink); line-height: 1.6; }
.k-quote::before { content: "\\201C"; }
.k-quote::after { content: "\\201D"; }
.k-name { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 12pt; color: var(--k-gold); margin-top: 5mm; }

.k-closing-lead { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 15px; color: var(--k-soft); margin: 4mm 0 0; }
.k-closing-couple { font-family: 'Fraunces', Georgia, serif; font-size: 26px; color: var(--k-ink); margin: 3mm 0 0; }
.k-closing-count { font-size: 11px; letter-spacing: .04em; color: var(--k-soft); margin: 4mm 0 6mm; }
.k-empty { text-align: center; color: var(--k-soft); font-size: 14px; line-height: 1.7; padding: 20mm 6mm; }

@media print {
  /* Zero page margin → the browser drops its own header/footer (URL, title,
     date, page numbers). All spacing is handled by the sheets themselves. */
  @page { size: A5 portrait; margin: 0; }
  /* Paint the whole page ivory so no white shows on short/last pages. */
  html, body {
    background: #FBF7EF !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .k-root { background: #FBF7EF; min-height: 0; }
  .no-print { display: none !important; }
  .k-stage { padding: 0; gap: 0; display: block; }
  .k-sheet {
    width: 100%; box-sizing: border-box; min-height: 0;
    box-shadow: none; border-radius: 0;
    padding: 13mm 12mm;
  }
  /* Cover + closing fill the whole page, frame near the edges. */
  .k-cover, .k-closing {
    height: 206mm; padding: 7mm;
    display: flex; align-items: center; justify-content: center;
  }
  .k-cover { break-after: page; }
  .k-closing { break-before: page; }
  .k-frame { width: 100%; height: 100%; box-sizing: border-box; border-color: var(--k-gold); }
}
`;

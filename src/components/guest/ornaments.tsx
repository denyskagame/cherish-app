// Decorative gold ornaments shared by the keepsake guest surfaces (menu card,
// schedule). Pure SVG/markup, no state — kept here so MenuScreen/ScheduleTimeline
// read cleanly. Gold is the Cherish brand (#C9A96E).

const GOLD = "#C9A96E";

/** Two interlocking rings — the Cherish monogram mark. */
export function Rings({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 20) / 30}
      viewBox="0 0 30 20"
      fill="none"
      aria-hidden
      className="mx-auto"
    >
      <circle cx="11" cy="10" r="7.4" stroke={GOLD} strokeWidth="1.1" />
      <circle cx="19" cy="10" r="7.4" stroke={GOLD} strokeWidth="1.1" />
    </svg>
  );
}

/** A centred horizontal flourish: hairline rules meeting a small diamond. */
export function Flourish({ className = "" }: { className?: string }) {
  return (
    <div className={"flex items-center justify-center gap-2.5 " + className} aria-hidden>
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-brand/50" />
      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
        <path d="M3.5 0 7 3.5 3.5 7 0 3.5Z" fill={GOLD} fillOpacity="0.8" />
      </svg>
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-brand/50" />
    </div>
  );
}

/** A small L-shaped corner accent; `pos` orients it to a card corner. */
export function Corner({
  pos,
}: {
  pos: "tl" | "tr" | "bl" | "br";
}) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const place = {
    tl: "top-2.5 left-2.5",
    tr: "top-2.5 right-2.5",
    bl: "bottom-2.5 left-2.5",
    br: "bottom-2.5 right-2.5",
  }[pos];
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className={"pointer-events-none absolute " + place}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <path d="M1 8 V1 H8" stroke={GOLD} strokeOpacity="0.55" strokeWidth="1" />
      <path d="M1 5 V1 H5" stroke={GOLD} strokeOpacity="0.9" strokeWidth="1" />
    </svg>
  );
}

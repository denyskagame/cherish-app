// Schedule helpers (docs/02 §6–8). Times are stored UTC and always displayed in
// the event timezone (never the guest's device), so "6:00 PM" means 6 PM at the
// venue for a remote guest too.

/** Icon keys the operator can pick, each mapped to a display emoji. */
export const SCHEDULE_ICONS = [
  "rings",
  "toast",
  "dinner",
  "dance",
  "cake",
  "sparkler",
  "music",
  "camera",
  "car",
  "heart",
] as const;

export type ScheduleIcon = (typeof SCHEDULE_ICONS)[number];

export const ICON_EMOJI: Record<string, string> = {
  rings: "💍",
  toast: "🥂",
  dinner: "🍽️",
  dance: "💃",
  cake: "🎂",
  sparkler: "✨",
  music: "🎵",
  camera: "📸",
  car: "🚗",
  heart: "❤️",
};

/** Emoji for an icon key, falling back to a neutral dot for unknown/empty. */
export function iconEmoji(icon: string | null | undefined): string {
  return (icon && ICON_EMOJI[icon]) || "•";
}

import { en, fr, type I18nKey } from "./dictionaries";
import { prisma } from "@/lib/prisma";

/**
 * Build the merged dictionary for one event + locale: base strings overlaid with
 * any per-event `Translation` overrides (docs/07 §7). Server-side; the guest page
 * fetches BOTH locales once and hands them to the client provider so toggling
 * FR↔EN is instant and offline-safe — no refetch mid-reception.
 */
export async function getDictionary(
  event: { id: string },
  locale: "en" | "fr",
): Promise<Record<I18nKey, string>> {
  const base = locale === "fr" ? fr : en;
  const overrides = await prisma.translation.findMany({
    where: { eventId: event.id, locale },
  });
  return {
    ...base,
    ...Object.fromEntries(overrides.map((o) => [o.key, o.value])),
  } as Record<I18nKey, string>;
}

/** Fetch both locales at once for the offline-safe client provider. */
export async function getDictionaries(event: { id: string }) {
  const [en, fr] = await Promise.all([
    getDictionary(event, "en"),
    getDictionary(event, "fr"),
  ]);
  return { en, fr };
}

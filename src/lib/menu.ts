// Menu helpers (docs/02 §2–3). The menu is display-only — no dietary tags, no
// meal selection — so a menu item is just a course, a name, and a description.

/** Canonical course order (dinner-service sequence, not alphabetical). Items
 *  whose course isn't listed sort to the end, preserving custom course names. */
export const COURSE_ORDER = [
  "Welcome Drinks",
  "Canapés",
  "Starters",
  "Soup",
  "Fish",
  "Mains",
  "Cheese",
  "Desserts",
  "Coffee",
  "Late Night",
] as const;

export interface LocalizedMenuItem {
  id: string;
  course: string; // localized label for display
  courseKey: string; // canonical EN course, stable for ordering across locales
  name: string;
  description: string;
}

export interface MenuCourse {
  course: string;
  items: LocalizedMenuItem[];
}

type RawMenuItem = {
  id: string;
  course: string;
  courseFr: string | null;
  name: string;
  nameFr: string | null;
  description: string;
  descriptionFr: string | null;
};

/** Resolve each item to a locale (EN fallback), then group by canonical course
 *  and order courses by COURSE_ORDER (custom courses last, keeping their order). */
export function groupMenuByCourse(
  items: RawMenuItem[],
  locale: "en" | "fr",
): MenuCourse[] {
  const byCourse = new Map<string, MenuCourse>();
  for (const it of items) {
    const localized: LocalizedMenuItem = {
      id: it.id,
      course: locale === "fr" && it.courseFr ? it.courseFr : it.course,
      courseKey: it.course,
      name: locale === "fr" && it.nameFr ? it.nameFr : it.name,
      description:
        locale === "fr" && it.descriptionFr ? it.descriptionFr : it.description,
    };
    const group = byCourse.get(localized.courseKey);
    if (group) group.items.push(localized);
    else byCourse.set(localized.courseKey, { course: localized.course, items: [localized] });
  }

  const rank = (key: string) => {
    const i = (COURSE_ORDER as readonly string[]).indexOf(key);
    return i === -1 ? 999 : i;
  };
  return [...byCourse.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([, v]) => v);
}

// Admin (operator console) dictionary — separate from the guest dictionary.
// Small and flat; used by the seating editor with a FR|EN toggle.
export type AdminLocale = "en" | "fr";

export const adminEn = {
  "title.roomLayout": "Room Layout",
  "stats.summary": "{tables} tables · {landmarks} landmarks · {guests} guests",

  "btn.addTable": "Table",
  "btn.addLandmark": "Landmark",
  "btn.autoArrange": "Auto-arrange",
  "design.grid": "Grid",
  "design.rows": "Rows",
  "design.perimeter": "Perimeter",
  "btn.check": "Check seating",
  "btn.undo": "Undo",
  "btn.preview": "Preview guest view",
  "search.placeholder": "Find a guest…",
  "search.unseated": "not seated",
  "search.none": "No matching guest",
  "check.unseated": "{n} guest(s) not yet seated",

  "status.saving": "Saving…",
  "status.saved": "All changes saved",
  "status.allGood": "Seating looks good ✓",

  "room.shell": "Room shell",
  "room.shape": "Shape",
  "room.width": "Width",
  "room.height": "Height",

  "help.drag": "Drag tables and landmarks to match the real room. Tap one to edit it.",

  "insp.nothing": "Nothing selected",
  "insp.nothingHelp":
    "Tap a table to rename it, set its shape/seats and a location hint, and seat guests. Tap a landmark to label or move it.",
  "insp.unseated": "{n} not yet seated — select a table to assign them.",
  "insp.table": "Table",
  "insp.tableNumber": "Table number (changing to one in use swaps them)",
  "insp.nameEn": "Name (EN)",
  "insp.nameFr": "Name (FR)",
  "insp.seats": "Seats",
  "insp.shape": "Shape",
  "shape.round": "Round",
  "shape.rectangle": "Rectangle",
  "insp.seatLayout": "Seat layout",
  "layout.topBottom": "Seats on top & bottom",
  "layout.leftRight": "Seats on left & right",
  "insp.rotation": "Rotation",
  "insp.locationHint": "Location hint — EN (pass card)",
  "insp.locationHintFr": "Location hint — FR",
  "insp.locationHintPh": "right side, near the dance floor",
  "insp.seated": "{n}/{cap} seated",
  "insp.guests": "Guests",
  "insp.noOne": "No one seated here yet.",
  "insp.addGuestPh": "Add a guest by name…",
  "insp.add": "Add",
  "insp.dupGuest": "That guest already exists.",
  "insp.unseat": "unseat",
  "insp.notSeated": "Not yet seated ({n})",
  "insp.seatHere": "seat here →",
  "insp.deleteTable": "Delete table",
  "insp.landmark": "Landmark",
  "insp.type": "Type",
  "insp.label": "Label",
  "insp.deleteLandmark": "Delete landmark",

  "shapeName.rounded": "Simple rounded room",
  "shapeName.double-frame": "Double gold frame",
  "shapeName.chapel": "Arched head (chapel)",
  "shapeName.bay": "Bay window / rounded top",
  "shapeName.octagon": "Corner-cut ballroom",
  "shapeName.marquee": "Marquee / tent",

  "feat.stage": "Stage",
  "feat.danceFloor": "Dance Floor",
  "feat.dj": "DJ",
  "feat.buffet": "Buffet",
  "feat.bar": "Bar",
  "feat.entrance": "Entrance",
  "feat.custom": "Custom",
  "feat.newZone": "New zone",
} as const;

export type AdminKey = keyof typeof adminEn;

export const adminFr: Record<AdminKey, string> = {
  "title.roomLayout": "Aménagement de la salle",
  "stats.summary": "{tables} tables · {landmarks} repères · {guests} invités",

  "btn.addTable": "Table",
  "btn.addLandmark": "Repère",
  "btn.autoArrange": "Disposition auto",
  "design.grid": "Grille",
  "design.rows": "Rangées",
  "design.perimeter": "Périmètre",
  "btn.check": "Vérifier le plan",
  "btn.undo": "Annuler",
  "btn.preview": "Aperçu côté invité",
  "search.placeholder": "Trouver un invité…",
  "search.unseated": "pas placé",
  "search.none": "Aucun invité trouvé",
  "check.unseated": "{n} invité(s) pas encore placé(s)",

  "status.saving": "Enregistrement…",
  "status.saved": "Modifications enregistrées",
  "status.allGood": "Le plan est bon ✓",

  "room.shell": "Forme de la salle",
  "room.shape": "Forme",
  "room.width": "Largeur",
  "room.height": "Hauteur",

  "help.drag":
    "Faites glisser les tables et repères pour reproduire la salle. Touchez un élément pour le modifier.",

  "insp.nothing": "Rien de sélectionné",
  "insp.nothingHelp":
    "Touchez une table pour la renommer, définir sa forme/ses places et un indice de position, et placer des invités. Touchez un repère pour le nommer ou le déplacer.",
  "insp.unseated": "{n} pas encore placé·e·s — sélectionnez une table pour les placer.",
  "insp.table": "Table",
  "insp.tableNumber": "Numéro de table (le changer pour un numéro utilisé les échange)",
  "insp.nameEn": "Nom (EN)",
  "insp.nameFr": "Nom (FR)",
  "insp.seats": "Places",
  "insp.shape": "Forme",
  "shape.round": "Ronde",
  "shape.rectangle": "Rectangulaire",
  "insp.seatLayout": "Disposition des places",
  "layout.topBottom": "Places en haut et en bas",
  "layout.leftRight": "Places à gauche et à droite",
  "insp.rotation": "Rotation",
  "insp.locationHint": "Indice de position — EN (carte d’accès)",
  "insp.locationHintFr": "Indice de position — FR",
  "insp.locationHintPh": "côté droit, près de la piste de danse",
  "insp.seated": "{n}/{cap} placés",
  "insp.guests": "Invités",
  "insp.noOne": "Personne n’est encore placé ici.",
  "insp.addGuestPh": "Ajouter un invité par son nom…",
  "insp.add": "Ajouter",
  "insp.dupGuest": "Cet invité existe déjà.",
  "insp.unseat": "retirer",
  "insp.notSeated": "Pas encore placés ({n})",
  "insp.seatHere": "placer ici →",
  "insp.deleteTable": "Supprimer la table",
  "insp.landmark": "Repère",
  "insp.type": "Type",
  "insp.label": "Étiquette",
  "insp.deleteLandmark": "Supprimer le repère",

  "shapeName.rounded": "Salle arrondie simple",
  "shapeName.double-frame": "Double cadre doré",
  "shapeName.chapel": "Tête en arche (chapelle)",
  "shapeName.bay": "Bow-window / haut arrondi",
  "shapeName.octagon": "Salle à coins coupés",
  "shapeName.marquee": "Chapiteau / tente",

  "feat.stage": "Scène",
  "feat.danceFloor": "Piste de danse",
  "feat.dj": "DJ",
  "feat.buffet": "Buffet",
  "feat.bar": "Bar",
  "feat.entrance": "Entrée",
  "feat.custom": "Personnalisé",
  "feat.newZone": "Nouvelle zone",
};

const dicts: Record<AdminLocale, Record<AdminKey, string>> = {
  en: adminEn,
  fr: adminFr,
};

/** Build a translator for a locale, with `{token}` interpolation. */
export function makeAdminT(locale: AdminLocale) {
  const dict = dicts[locale];
  return (key: AdminKey, vars?: Record<string, string | number>): string => {
    let s: string = dict[key] ?? key;
    if (vars)
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

export type AdminT = ReturnType<typeof makeAdminT>;

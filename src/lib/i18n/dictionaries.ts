// The whole i18n system (docs/07 §7): two locales, flat keys, typed access,
// per-event overrides. No framework — a missing FR key is a compile error, not a
// runtime blank. Keys below cover the seat-finder (docs/01); other guest surfaces
// (menu/schedule/book/photos) extend `en` as they land.
export const en = {
  // Locale toggle + shell
  "common.privacy": "Privacy notice",
  "common.locale.fr": "FR",
  "common.locale.en": "EN",

  // Welcome / seat search
  "welcome.invited": "You are invited to celebrate",
  "welcome.findSeat": "Find Your Seat",
  "welcome.enterName": "Enter your name to see your table",
  "welcome.placeholder": "Your full name…",
  "welcome.cta": "Find My Seat",
  "welcome.searching": "Finding your seat…",
  "welcome.notFound":
    "We couldn't find that name — try your full name, or ask the wedding party.",
  "welcome.tooShort": "Please type a little more of your name.",
  "welcome.rateLimited": "One moment — please try again shortly.",
  "welcome.error": "Something went wrong. Please try again.",

  // Disambiguation
  "disambig.title": "We found a few — which one is you?",
  "disambig.tableHint": "Table",
  "disambig.cancel": "None of these",

  // Seat found
  "seat.welcome": "Welcome,",
  "seat.seatedWith": "Seated with",
  "seat.table": "Table",
  "seat.seat": "Seat",
  "seat.tableName": "Table name",
  "seat.alsoAtTable": "Also at your table",
  "seat.andMore": "and {count} more",
  "seat.directions": "Get directions",
  "seat.searchAgain": "Not you? Search again",
  "seat.roomTitle": "The Room",
  "seat.tapYourTable": "Tap your table to see who you're with",
  "seat.whoElse": "Who else is at your table",
  "seat.you": "(you)",
  "seat.back": "Back to the room",

  // Bottom nav
  "nav.seat": "MY SEAT",
  "nav.menu": "MENU",
  "nav.schedule": "SCHEDULE",
  "nav.book": "BOOK",
  "nav.photos": "PHOTOS",

  // Menu
  "menu.title": "The Menu",
  "menu.subtitle": "What we'll be sharing this evening",
  "menu.closer": "Bon appétit",
  "menu.empty": "The menu will be shared here soon.",

  // Schedule
  "schedule.title": "Order of the Day",
  "schedule.subtitle": "So you always know what's next",
  "schedule.now": "Happening now",
  "schedule.upNext": "Up next",
  "schedule.inMin": "in {n} min",
  "schedule.inHr": "in {h}h {m}min",
  "schedule.startingSoon": "Starting soon",
  "schedule.empty": "The schedule will be shared here soon.",

  // Message book
  "book.title": "Message Book",
  "book.subtitle": "Leave a few words for the couple",
  "book.write": "Write",
  "book.read": "The Book",
  "book.yourName": "Your name",
  "book.yourMessage": "Write your message…",
  "book.style": "Handwriting",
  "book.send": "Sign the book",
  "book.sending": "Signing…",
  "book.nameRequired": "Please add your name.",
  "book.tooShort": "Add a few more words.",
  "book.failed": "Something went wrong. Please try again.",
  "book.tooMany": "You've signed a few times already — thank you!",
  "book.posted": "Thank you — your message is in the book.",
  "book.moderated": "Thank you! Your message will appear once the couple approves it.",
  "book.empty": "No messages yet — be the first to sign.",
  "book.beFirst": "Write the first message",
  "book.loadMore": "Show more",
} as const;

export type I18nKey = keyof typeof en;

export const fr: Record<I18nKey, string> = {
  "common.privacy": "Avis de confidentialité",
  "common.locale.fr": "FR",
  "common.locale.en": "EN",

  "welcome.invited": "Vous êtes invité·e à célébrer",
  "welcome.findSeat": "Trouvez votre place",
  "welcome.enterName": "Entrez votre nom pour voir votre table",
  "welcome.placeholder": "Votre nom complet…",
  "welcome.cta": "Trouver ma place",
  "welcome.searching": "Recherche de votre place…",
  "welcome.notFound":
    "Nous n’avons pas trouvé ce nom — essayez votre nom complet, ou demandez au cortège.",
  "welcome.tooShort": "Veuillez saisir un peu plus de votre nom.",
  "welcome.rateLimited": "Un instant — veuillez réessayer sous peu.",
  "welcome.error": "Une erreur s’est produite. Veuillez réessayer.",

  "disambig.title": "Nous en avons trouvé plusieurs — laquelle êtes-vous ?",
  "disambig.tableHint": "Table",
  "disambig.cancel": "Aucune de celles-ci",

  "seat.welcome": "Bienvenue,",
  "seat.seatedWith": "En compagnie de",
  "seat.table": "Table",
  "seat.seat": "Place",
  "seat.tableName": "Nom de la table",
  "seat.alsoAtTable": "Aussi à votre table",
  "seat.andMore": "et {count} de plus",
  "seat.directions": "Itinéraire",
  "seat.searchAgain": "Ce n’est pas vous ? Rechercher à nouveau",
  "seat.roomTitle": "La salle",
  "seat.tapYourTable": "Touchez votre table pour voir avec qui vous êtes",
  "seat.whoElse": "Qui d’autre est à votre table",
  "seat.you": "(vous)",
  "seat.back": "Retour à la salle",

  "nav.seat": "MA PLACE",
  "nav.menu": "MENU",
  "nav.schedule": "HORAIRE",
  "nav.book": "LIVRE",
  "nav.photos": "PHOTOS",

  "menu.title": "Le Menu",
  "menu.subtitle": "Ce que nous partagerons ce soir",
  "menu.closer": "Bon appétit",
  "menu.empty": "Le menu sera partagé ici bientôt.",

  "schedule.title": "Déroulement de la journée",
  "schedule.subtitle": "Pour toujours savoir ce qui suit",
  "schedule.now": "En ce moment",
  "schedule.upNext": "À suivre",
  "schedule.inMin": "dans {n} min",
  "schedule.inHr": "dans {h}h {m}min",
  "schedule.startingSoon": "Bientôt",
  "schedule.empty": "L’horaire sera partagé ici bientôt.",

  "book.title": "Livre d’or",
  "book.subtitle": "Laissez quelques mots aux mariés",
  "book.write": "Écrire",
  "book.read": "Le livre",
  "book.yourName": "Votre nom",
  "book.yourMessage": "Écrivez votre message…",
  "book.style": "Écriture",
  "book.send": "Signer le livre",
  "book.sending": "Signature…",
  "book.nameRequired": "Veuillez ajouter votre nom.",
  "book.tooShort": "Ajoutez quelques mots de plus.",
  "book.failed": "Une erreur s’est produite. Veuillez réessayer.",
  "book.tooMany": "Vous avez déjà signé plusieurs fois — merci !",
  "book.posted": "Merci — votre message est dans le livre.",
  "book.moderated": "Merci ! Votre message apparaîtra une fois approuvé par les mariés.",
  "book.empty": "Aucun message pour l’instant — soyez le premier à signer.",
  "book.beFirst": "Écrire le premier message",
  "book.loadMore": "Voir plus",
};

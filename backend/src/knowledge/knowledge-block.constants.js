const BLOCK_TYPES = Object.freeze({
  text: {
    label: "Texte",
    description: "Bloc de texte éditorial.",
    requiredFields: ["text"],
  },

  heading: {
    label: "Titre",
    description: "Titre ou sous-titre structurant.",
    requiredFields: ["text", "level"],
  },

  list: {
    label: "Liste",
    description: "Liste ordonnée ou non ordonnée.",
    requiredFields: ["items"],
  },

  quote: {
    label: "Citation",
    description: "Citation avec auteur facultatif.",
    requiredFields: ["text"],
  },

  faq: {
    label: "FAQ",
    description: "Question et réponse réutilisables.",
    requiredFields: ["question", "answer"],
  },

  callout: {
    label: "Encadré",
    description: "Information importante mise en avant.",
    requiredFields: ["text"],
  },

  cta: {
    label: "Appel à l’action",
    description: "Titre, bouton et lien d’action.",
    requiredFields: ["label", "url"],
  },

  html: {
    label: "HTML",
    description: "HTML contrôlé pour besoins avancés.",
    requiredFields: ["html"],
  },
});

const BLOCK_STATUSES = Object.freeze([
  "draft",
  "review",
  "published",
  "archived",
]);

const DEFAULT_BLOCK_STATUS = "draft";
const DEFAULT_BLOCK_LANGUAGE = "fr";

module.exports = {
  BLOCK_TYPES,
  BLOCK_STATUSES,
  DEFAULT_BLOCK_STATUS,
  DEFAULT_BLOCK_LANGUAGE,
};

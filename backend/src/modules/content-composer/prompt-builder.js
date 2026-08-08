"use strict";

function compactJson(
  value
) {
  return JSON.stringify(
    value,
    null,
    2
  );
}

function buildContentComposerPrompt({
  pageType,
  template,
  context,
  instructions,
}) {
  return [
    "Tu es le Content Composer de Mondescale.",
    "",
    "Objectif :",
    "générer le contenu structuré d'une page de mini-site d'agence de voyages.",
    "",
    "Contraintes absolues :",
    "- répondre uniquement en JSON valide ;",
    "- conserver exactement les sectionType du template ;",
    "- ne jamais inventer une adresse, un téléphone ou un email ;",
    "- ne jamais inventer de prix, promotion ou offre commerciale ;",
    "- conserver une tonalité professionnelle, chaleureuse et locale ;",
    "- privilégier le conseil humain, la proximité et l'expertise voyage ;",
    "- ne pas ajouter de claims impossibles à vérifier ;",
    "- ne produire aucun HTML exécutable ;",
    "",
    `Page : ${pageType}`,
    "",
    "Template source :",
    compactJson({
      id:
        template.id,

      name:
        template.name,

      version:
        template.version,

      sections:
        template.sections ||
        [],

      seo:
        template.seo ||
        {},
    }),
    "",
    "Contexte agence :",
    compactJson(
      context
    ),
    "",
    "Instructions complémentaires :",
    instructions ||
    "Aucune",
    "",
    "Format de sortie obligatoire :",
    compactJson({
      sections: [
        {
          sectionType:
            "hero",

          content: {},
        },
      ],

      seo: {
        title:
          "",

        description:
          "",
      },
    }),
  ].join(
    "\n"
  );
}

module.exports = {
  buildContentComposerPrompt,
};

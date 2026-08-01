"use strict";

const SUPPORTED_CHANNELS = new Set([
  "landing-page",
  "faq",
  "google-business",
  "facebook",
  "instagram",
  "linkedin",
  "newsletter",
]);

function normalizeChannel(value) {
  const channel = String(value || "landing-page")
    .trim()
    .toLowerCase();

  if (!SUPPORTED_CHANNELS.has(channel)) {
    const error = new Error(
      `Canal non pris en charge : ${channel}.`
    );
    error.statusCode = 400;
    error.code = "UNSUPPORTED_GENERATION_CHANNEL";
    throw error;
  }

  return channel;
}

function channelInstructions(channel) {
  const instructions = {
    "landing-page": {
      objective: "Créer une page destination SEO complète.",
      recommendedLength: "1200 à 1800 mots",
      sections: [
        "Introduction",
        "Pourquoi partir",
        "Quand partir",
        "Que voir et que faire",
        "Pour quels voyageurs",
        "Conseils pratiques",
        "Pourquoi réserver avec l'agence",
        "FAQ",
        "Appel à l'action",
      ],
    },

    faq: {
      objective: "Créer une FAQ voyage précise et utile.",
      recommendedLength: "8 à 12 questions",
      sections: [
        "Formalités",
        "Période idéale",
        "Durée",
        "Budget",
        "Transport",
        "Hébergement",
        "Activités",
        "Conseils agence",
      ],
    },

    "google-business": {
      objective:
        "Créer une publication Google Business locale et commerciale.",
      recommendedLength: "600 à 1000 caractères",
      sections: [
        "Accroche",
        "Bénéfice principal",
        "Conseil expert",
        "Appel à l'action",
      ],
    },

    facebook: {
      objective:
        "Créer une publication Facebook engageante et humaine.",
      recommendedLength: "700 à 1200 caractères",
      sections: [
        "Accroche émotionnelle",
        "Points forts",
        "Conseil",
        "Appel à l'action",
      ],
    },

    instagram: {
      objective:
        "Créer une légende Instagram visuelle et inspirante.",
      recommendedLength: "500 à 900 caractères",
      sections: [
        "Accroche",
        "Expérience",
        "Conseil",
        "Appel à l'action",
        "Hashtags",
      ],
    },

    linkedin: {
      objective:
        "Créer une publication professionnelle sur l'expertise voyage.",
      recommendedLength: "700 à 1200 caractères",
      sections: [
        "Contexte",
        "Expertise",
        "Valeur ajoutée de l'agence",
        "Appel à l'action",
      ],
    },

    newsletter: {
      objective:
        "Créer une newsletter commerciale orientée conversion.",
      recommendedLength: "500 à 1000 mots",
      sections: [
        "Objet",
        "Pré-header",
        "Hero",
        "Introduction",
        "Points forts",
        "Conseils",
        "CTA principal",
      ],
    },
  };

  return instructions[channel];
}

function buildGenerationBrief(context, options = {}) {
  if (!context?.identity?.name) {
    throw new Error(
      "Generation brief requires a valid destination context."
    );
  }

  const channel = normalizeChannel(options.channel);
  const agencyName =
    String(options.agencyName || "Mondescale Voyages").trim();

  const city = String(options.city || "").trim() || null;
  const tone =
    String(options.tone || "expert, humain et inspirant").trim();

  const missingFacts = context.completeness?.missing || [];

  return {
    version: "18.1.7",
    channel,

    subject: {
      destination: context.identity.name,
      slug: context.identity.slug,
      type: context.identity.type,
      country: context.geography?.country?.name || null,
      region: context.geography?.region?.name || null,
      city: context.geography?.city?.name || null,
    },

    publisher: {
      agencyName,
      city,
      tone,
    },

    objective: channelInstructions(channel),

    facts: {
      tagline: context.identity.tagline || null,
      summary: context.identity.summary || null,

      geography: context.geography || {},

      practical: {
        bestTime: context.practical?.bestTime || null,
        idealDuration:
          context.practical?.idealDuration || null,
        currency: context.practical?.currency || null,
        language: context.practical?.language || null,
        timezone: context.practical?.timezone || null,
      },

      highlights:
        context.marketing?.highlights || [],

      audiences:
        context.marketing?.audiences || [],

      themes:
        context.marketing?.themes || [],

      travelTypes:
        context.marketing?.travelTypes || [],

      tags:
        context.marketing?.tags || [],

      faqs:
        context.content?.faqs || [],

      existingSections:
        context.content?.sections || [],

      relatedDestinations:
        context.relatedDestinations || [],
    },

    seo: {
      title: context.seo?.title || null,
      description: context.seo?.description || null,
      canonicalSlug:
        context.seo?.canonicalSlug ||
        context.identity.slug,
      suggestedPath:
        context.seo?.suggestedPath || null,
      primaryKeyword:
        `voyage ${context.identity.name}`,
      secondaryKeywords: [
        `séjour ${context.identity.name}`,
        `vacances ${context.identity.name}`,
        `agence de voyage ${context.identity.name}`,
      ],
    },

    editorialRules: [
      "Utiliser uniquement les faits présents dans ce brief.",
      "Ne pas inventer de prix, disponibilité, formalité ou promotion.",
      "Ne pas présenter une information manquante comme certaine.",
      "Privilégier un ton naturel et éviter les répétitions.",
      "Mettre en avant l'expertise humaine de l'agence.",
      "Terminer par un appel à l'action clair.",
    ],

    unavailableFacts: missingFacts,

    quality: {
      sourceCompleteness:
        context.completeness?.score ?? null,
      requiresHumanReview: true,
      publicationStatus: "review",
    },
  };
}

module.exports = {
  SUPPORTED_CHANNELS,
  normalizeChannel,
  channelInstructions,
  buildGenerationBrief,
};

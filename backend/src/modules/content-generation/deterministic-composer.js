"use strict";

function sentenceList(values = []) {
  const items = values.filter(Boolean);

  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} et ${items[1]}`;

  return `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;
}

function agencyLabel(brief) {
  return (
    brief.publisher?.agencyName ||
    "Mondescale Voyages"
  );
}

function destinationLabel(brief) {
  return (
    brief.subject?.destination ||
    brief.subject?.campaign ||
    "votre prochaine destination"
  );
}

function callToAction(brief) {
  const agency = agencyLabel(brief);
  const city = brief.publisher?.city;

  return city
    ? `Contactez ${agency} à ${city} pour construire votre voyage sur mesure.`
    : `Contactez ${agency} pour construire votre voyage sur mesure.`;
}

function practicalParagraph(brief) {
  const practical = brief.facts?.practical || {};
  const parts = [];

  if (practical.bestTime) {
    parts.push(
      `La période généralement recommandée est ${practical.bestTime}.`
    );
  }

  if (practical.idealDuration) {
    parts.push(
      `Une durée de ${practical.idealDuration} permet de profiter pleinement du séjour.`
    );
  }

  if (practical.currency) {
    parts.push(
      `La monnaie locale est ${practical.currency}.`
    );
  }

  if (practical.language) {
    parts.push(
      `La langue de référence indiquée est ${practical.language}.`
    );
  }

  return parts.join(" ");
}

function buildLandingPage(brief) {
  const destination = destinationLabel(brief);
  const facts = brief.facts || {};
  const highlights = facts.highlights || [];
  const audiences = facts.audiences || [];

  const h1 =
    brief.seo?.title ||
    `Voyage ${destination} avec ${agencyLabel(brief)}`;

  const introduction =
    facts.summary ||
    facts.tagline ||
    `Découvrez ${destination} avec l'accompagnement de nos conseillers voyage.`;

  const highlightsText = highlights.length
    ? `${destination} séduit notamment par ${sentenceList(highlights)}.`
    : `Nos conseillers vous aideront à sélectionner les expériences les plus adaptées à votre projet.`;

  const audienceText = audiences.length
    ? `Cette destination peut particulièrement convenir aux ${sentenceList(audiences)}.`
    : `Chaque séjour est construit selon vos envies, votre rythme et votre budget.`;

  const sections = [
    {
      type: "introduction",
      heading: `Découvrir ${destination}`,
      content: introduction,
    },
    {
      type: "highlights",
      heading: `Pourquoi partir à ${destination} ?`,
      content: highlightsText,
      items: highlights,
    },
    {
      type: "audiences",
      heading: `À qui s'adresse ce voyage ?`,
      content: audienceText,
      items: audiences,
    },
    {
      type: "practical",
      heading: `Quand partir et combien de temps ?`,
      content:
        practicalParagraph(brief) ||
        `Votre conseiller vérifiera avec vous la période et la durée les plus adaptées.`,
    },
    {
      type: "agency",
      heading: `Préparez votre voyage avec ${agencyLabel(brief)}`,
      content:
        `Nos conseillers vous accompagnent avant, pendant et après votre séjour. ` +
        callToAction(brief),
    },
  ];

  return {
    format: "landing-page",
    title: h1,
    metaTitle:
      brief.seo?.title ||
      `Voyage ${destination} | ${agencyLabel(brief)}`,
    metaDescription:
      brief.seo?.description ||
      `Préparez votre voyage ${destination} avec les conseillers ${agencyLabel(brief)}.`,
    slug: brief.seo?.canonicalSlug || null,
    h1,
    introduction,
    sections,
    cta: callToAction(brief),
  };
}

function buildFaq(brief) {
  const destination = destinationLabel(brief);
  const existing = brief.facts?.faqs || [];
  const practical = brief.facts?.practical || {};

  const questions = [...existing];

  if (practical.bestTime) {
    questions.push({
      question: `Quand partir à ${destination} ?`,
      answer: `La période indiquée dans notre référentiel est ${practical.bestTime}. Votre conseiller vérifiera les conditions adaptées à vos dates.`,
    });
  }

  if (practical.idealDuration) {
    questions.push({
      question: `Combien de temps prévoir à ${destination} ?`,
      answer: `La durée généralement conseillée est ${practical.idealDuration}, à adapter selon votre itinéraire et vos envies.`,
    });
  }

  questions.push(
    {
      question: `Comment organiser un voyage à ${destination} ?`,
      answer:
        `${agencyLabel(brief)} vous accompagne dans le choix des transports, hébergements et expériences, avec une validation complète avant réservation.`,
    },
    {
      question: `Pourquoi réserver avec une agence de voyage ?`,
      answer:
        `Vous bénéficiez d'un interlocuteur avant, pendant et après le séjour, ainsi que de conseils adaptés à votre projet.`,
    }
  );

  return {
    format: "faq",
    title: `Questions fréquentes sur ${destination}`,
    questions: questions.slice(0, 12),
    cta: callToAction(brief),
  };
}

function buildSocialPost(brief, channel) {
  const destination = destinationLabel(brief);
  const highlights = brief.facts?.highlights || [];
  const highlightText = highlights.length
    ? sentenceList(highlights.slice(0, 4))
    : "des expériences sélectionnées selon vos envies";

  const emoji =
    channel === "instagram"
      ? "✨"
      : channel === "facebook"
        ? "🌍"
        : "✈️";

  const body =
    `${emoji} Envie de découvrir ${destination} ?\n\n` +
    `${brief.facts?.tagline || `Une destination à découvrir avec ${agencyLabel(brief)}.`}\n\n` +
    `Au programme : ${highlightText}.\n\n` +
    `${practicalParagraph(brief)}\n\n` +
    `${callToAction(brief)}`;

  const hashtags =
    channel === "instagram"
      ? [
          "#Voyage",
          `#${String(destination).replace(/[^A-Za-zÀ-ÿ0-9]/g, "")}`,
          "#AgenceDeVoyage",
          "#Mondescale",
        ]
      : [];

  return {
    format: channel,
    text: body.trim(),
    hashtags,
    cta: callToAction(brief),
  };
}

function buildGoogleBusinessPost(brief) {
  const destination = destinationLabel(brief);
  const highlights = brief.facts?.highlights || [];

  return {
    format: "google-business",
    title: `Découvrez ${destination}`,
    summary:
      `${brief.facts?.tagline || `Préparez votre voyage à ${destination}.`} ` +
      `${highlights.length ? `Découvrez ${sentenceList(highlights.slice(0, 3))}. ` : ""}` +
      callToAction(brief),
    callToAction: {
      type: "LEARN_MORE",
      label: "En savoir plus",
    },
  };
}

function buildNewsletter(brief) {
  const destination = destinationLabel(brief);
  const highlights = brief.facts?.highlights || [];

  return {
    format: "newsletter",
    subject: `${destination} : votre prochain voyage commence ici`,
    preheader:
      `Découvrez nos conseils pour préparer votre séjour à ${destination}.`,
    hero: {
      title: `Cap sur ${destination}`,
      subtitle:
        brief.facts?.tagline ||
        `Un voyage imaginé avec ${agencyLabel(brief)}`,
    },
    sections: [
      {
        heading: `Pourquoi choisir ${destination} ?`,
        content:
          brief.facts?.summary ||
          `Découvrez une destination adaptée à votre projet de voyage.`,
      },
      {
        heading: "Les expériences à ne pas manquer",
        items:
          highlights.length
            ? highlights
            : ["Conseils personnalisés", "Itinéraire adapté", "Accompagnement agence"],
      },
      {
        heading: "Le conseil de votre agence",
        content:
          practicalParagraph(brief) ||
          `Prenez rendez-vous avec votre conseiller pour choisir vos dates.`,
      },
    ],
    cta: {
      label: "Préparer mon voyage",
      text: callToAction(brief),
    },
  };
}

function buildHeroImageBrief(brief) {
  const destination = destinationLabel(brief);
  const highlights = brief.facts?.highlights || [];

  return {
    format: "hero-image",
    destination,
    prompt:
      `Photographie de voyage haut de gamme représentant ${destination}. ` +
      `${brief.facts?.tagline || ""} ` +
      `${highlights.length ? `Éléments visuels suggérés : ${sentenceList(highlights.slice(0, 4))}. ` : ""}` +
      `Lumière naturelle, composition immersive, rendu réaliste, espace négatif suffisant pour une accroche éditoriale, aucun texte intégré dans l'image.`,
    negativePrompt:
      "texte, logo inventé, watermark, foule artificielle, visages déformés, couleurs irréalistes",
    recommendedRatio: "16:9",
    requiresBrandOverlay: true,
  };
}

function composeDeterministicContent(brief) {
  switch (brief.channel) {
    case "landing-page":
      return buildLandingPage(brief);

    case "faq":
      return buildFaq(brief);

    case "google-business":
      return buildGoogleBusinessPost(brief);

    case "facebook":
    case "instagram":
    case "linkedin":
      return buildSocialPost(
        brief,
        brief.channel
      );

    case "newsletter":
      return buildNewsletter(brief);

    case "hero-image":
      return buildHeroImageBrief(brief);

    default: {
      const error = new Error(
        `Aucun compositeur déterministe pour ${brief.channel}.`
      );
      error.code = "DETERMINISTIC_COMPOSER_UNSUPPORTED";
      throw error;
    }
  }
}

module.exports = {
  sentenceList,
  practicalParagraph,
  callToAction,
  buildLandingPage,
  buildFaq,
  buildSocialPost,
  buildGoogleBusinessPost,
  buildNewsletter,
  buildHeroImageBrief,
  composeDeterministicContent,
};

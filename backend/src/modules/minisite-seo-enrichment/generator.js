"use strict";

const {
  cleanText,
  normalizeSlug,
  pageLabel,
  pathForSlug,
  truncateAtWord,
} = require("./utils");

function localSuffix(
  agency
) {
  const city =
    cleanText(
      agency.city
    );

  return city
    ? ` à ${city}`
    : "";
}

function titleForPage({
  agency,
  page,
} = {}) {
  const agencyName =
    cleanText(
      agency.name,
      "Agence de voyages"
    );

  const citySuffix =
    localSuffix(
      agency
    );

  const slug =
    normalizeSlug(
      page.slug
    );

  const label =
    pageLabel(
      page
    );

  let title;

  switch (slug) {
    case "":
      title =
        `Agence de voyages${citySuffix} | ${agencyName}`;
      break;

    case "agence":
      title =
        `Notre agence de voyages${citySuffix} | ${agencyName}`;
      break;

    case "equipe":
      title =
        `Conseillers voyages${citySuffix} | ${agencyName}`;
      break;

    case "services":
      title =
        `Services de voyage${citySuffix} | ${agencyName}`;
      break;

    case "destinations":
      title =
        `Destinations et idées voyages${citySuffix} | ${agencyName}`;
      break;

    case "inspirations":
      title =
        `Inspirations et conseils voyage${citySuffix} | ${agencyName}`;
      break;

    case "engagements":
      title =
        `Nos engagements voyageurs${citySuffix} | ${agencyName}`;
      break;

    case "partenaires":
      title =
        `Partenaires voyage${citySuffix} | ${agencyName}`;
      break;

    case "avis":
      title =
        `Avis clients de notre agence${citySuffix} | ${agencyName}`;
      break;

    case "contact":
      title =
        `Contacter notre agence de voyages${citySuffix} | ${agencyName}`;
      break;

    case "mentions-legales":
      title =
        `Mentions légales | ${agencyName}`;
      break;

    case "confidentialite":
      title =
        `Politique de confidentialité | ${agencyName}`;
      break;

    default:
      title =
        `${label}${citySuffix} | ${agencyName}`;
      break;
  }

  return truncateAtWord(
    title,
    65
  );
}

function descriptionForPage({
  agency,
  page,
} = {}) {
  const agencyName =
    cleanText(
      agency.name,
      "notre agence de voyages"
    );

  const city =
    cleanText(
      agency.city
    );

  const location =
    city
      ? ` à ${city}`
      : "";

  const slug =
    normalizeSlug(
      page.slug
    );

  const label =
    pageLabel(
      page
    ).toLowerCase();

  let description;

  switch (slug) {
    case "":
      description =
        `${agencyName}${location} vous conseille pour vos séjours, circuits, croisières et voyages sur mesure. Accompagnement avant, pendant et après le départ.`;
      break;

    case "agence":
      description =
        `Découvrez ${agencyName}${location}, son expertise, ses valeurs et son accompagnement personnalisé pour construire votre prochain voyage.`;
      break;

    case "equipe":
      description =
        `Rencontrez les conseillers de ${agencyName}${location}. Une équipe disponible pour créer un voyage adapté à vos envies et à votre budget.`;
      break;

    case "services":
      description =
        `Séjours, circuits, croisières, billetterie et voyages sur mesure : découvrez les services proposés par ${agencyName}${location}.`;
      break;

    case "destinations":
      description =
        `Découvrez les destinations sélectionnées par ${agencyName}${location} et profitez des conseils de nos experts pour préparer votre prochain voyage.`;
      break;

    case "inspirations":
      description =
        `Trouvez des idées, conseils et inspirations pour votre prochain voyage avec les experts de ${agencyName}${location}.`;
      break;

    case "engagements":
      description =
        `Conseil, disponibilité et suivi : découvrez les engagements de ${agencyName}${location} pour accompagner chaque projet de voyage.`;
      break;

    case "partenaires":
      description =
        `Découvrez les partenaires sélectionnés par ${agencyName}${location} pour proposer des voyages fiables et adaptés à chaque projet.`;
      break;

    case "avis":
      description =
        `Consultez les avis des voyageurs accompagnés par ${agencyName}${location} et découvrez leur expérience avec notre équipe.`;
      break;

    case "contact":
      description =
        `Contactez ${agencyName}${location} pour obtenir des conseils, prendre rendez-vous ou demander un devis personnalisé pour votre voyage.`;
      break;

    case "mentions-legales":
      description =
        `Consultez les mentions légales du mini-site de ${agencyName}.`;
      break;

    case "confidentialite":
      description =
        `Consultez la politique de confidentialité et de protection des données personnelles de ${agencyName}.`;
      break;

    default:
      description =
        `Découvrez ${label} avec ${agencyName}${location}. Conseils personnalisés, expertise voyage et accompagnement complet.`;
      break;
  }

  return truncateAtWord(
    description,
    160
  );
}

function generateSeoMetadata({
  agency,
  site,
  page,
  publicOrigin,
} = {}) {
  const existingTitle =
    cleanText(
      page.seoTitle
    );

  const existingDescription =
    cleanText(
      page.metaDescription ||
      page.seoDescription
    );

  const generatedTitle =
    titleForPage({
      agency,
      page,
    });

  const generatedDescription =
    descriptionForPage({
      agency,
      page,
    });

  const path =
    pathForSlug(
      page.slug
    );

  const canonical =
    publicOrigin &&
    site.slug
      ? `${String(publicOrigin)
          .replace(/\/+$/g, "")}/sites/${site.slug}${path === "/" ? "" : path}`
      : null;

  const index =
    ![
      "mentions-legales",
      "confidentialite",
    ].includes(
      normalizeSlug(
        page.slug
      )
    );

  return {
    pageId:
      page.id,

    slug:
      normalizeSlug(
        page.slug
      ),

    existing: {
      seoTitle:
        existingTitle,

      metaDescription:
        existingDescription,
    },

    generated: {
      seoTitle:
        existingTitle ||
        generatedTitle,

      metaDescription:
        existingDescription ||
        generatedDescription,

      canonical,

      robots: {
        index,
        follow:
          true,
      },
    },

    actions: {
      setSeoTitle:
        !existingTitle,

      setMetaDescription:
        !existingDescription,

      setCanonical:
        Boolean(
          canonical
        ),

      setRobots:
        true,
    },
  };
}

module.exports = {
  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
};

const slugify = require("../seo-factory/slug");

function trim(value, max) {
  return String(value || "").trim().slice(0, max);
}

function moneyLabel(priceFrom) {
  return priceFrom === null || priceFrom === undefined ? null : `à partir de ${priceFrom} €`;
}

class DestinationGenerator {
  generate(site, agency, input) {
    const destination = input.destination;
    const destinationSlug = slugify(destination);
    const countrySuffix = input.country ? `, ${input.country}` : "";
    const departure = input.departureCity || agency.city;
    const price = moneyLabel(input.priceFrom);
    const common = {
      destination,
      country: input.country,
      departureCity: departure,
      priceFrom: input.priceFrom,
      duration: input.duration,
      agency: {
        id: agency.id,
        name: agency.name,
        city: agency.city,
        address: agency.address,
        postalCode: agency.postalCode,
        phone: agency.phone,
        email: agency.email,
        website: agency.website,
        googleReviewUrl: agency.googleReviewUrl,
      },
      cta: {
        label: `Demander un devis pour ${destination}`,
        href: "/contact",
      },
    };

    const links = [
      { label: `Voyage à ${destination}`, href: `/${destinationSlug}` },
      { label: `Quand partir à ${destination}`, href: `/quand-partir-${destinationSlug}` },
      { label: `Que faire à ${destination}`, href: `/que-faire-${destinationSlug}` },
      { label: `Séjour à ${destination}`, href: `/sejour-${destinationSlug}` },
      { label: `Circuit à ${destination}`, href: `/circuit-${destinationSlug}` },
      { label: `Hôtels à ${destination}`, href: `/hotel-${destinationSlug}` },
      { label: `Guide de ${destination}`, href: `/guide-${destinationSlug}` },
      { label: `FAQ ${destination}`, href: `/faq-${destinationSlug}` },
    ];

    const page = (type, slug, title, seoTitle, seoDesc, content) => ({
      type,
      slug,
      title,
      seoTitle: trim(seoTitle, 70),
      seoDesc: trim(seoDesc, 180),
      content: {
        ...common,
        internalLinks: links.filter((link) => link.href !== `/${slug}`),
        schema: {
          "@context": "https://schema.org",
          "@type": "TravelAgency",
          name: agency.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: agency.address,
            postalCode: agency.postalCode,
            addressLocality: agency.city,
            addressCountry: "FR",
          },
          telephone: agency.phone,
          email: agency.email,
          url: agency.website || site.domain || null,
        },
        ...content,
      },
      published: false,
    });

    return [
      page(
        "DESTINATION",
        destinationSlug,
        `Voyage à ${destination}`,
        `Voyage à ${destination}${countrySuffix} | ${agency.name}`,
        `Préparez votre voyage à ${destination} avec ${agency.name}${price ? ` ${price}` : ""}. Conseils et devis personnalisé au départ de ${departure}.`,
        {
          hero: {
            eyebrow: input.country || "Destination",
            title: `Découvrez ${destination}`,
            subtitle: `Un voyage conçu avec votre agence ${agency.name}`,
            priceLabel: price,
          },
          introduction: `Confiez votre projet de voyage à ${destination} à l'équipe de ${agency.name}. Nous construisons une proposition adaptée à vos envies, votre budget et vos dates de départ.`,
          highlights: input.highlights,
        }
      ),
      page(
        "PRACTICAL",
        `quand-partir-${destinationSlug}`,
        `Quand partir à ${destination} ?`,
        `Quand partir à ${destination} ? Climat et conseils`,
        `Découvrez la meilleure période pour partir à ${destination}, selon le climat, votre budget et vos envies de voyage.`,
        { section: "best-time", introduction: `La meilleure période pour découvrir ${destination} dépend de vos priorités : climat, fréquentation, événements et budget.` }
      ),
      page(
        "GUIDE",
        `que-faire-${destinationSlug}`,
        `Que faire à ${destination} ?`,
        `Que faire à ${destination} ? Incontournables et idées`,
        `Les incontournables, visites et expériences à vivre à ${destination}, sélectionnés par votre agence de voyages.`,
        { section: "things-to-do", highlights: input.highlights }
      ),
      page(
        "LANDING",
        `sejour-${destinationSlug}`,
        `Séjour à ${destination}`,
        `Séjour à ${destination}${price ? ` ${price}` : ""}`,
        `Trouvez votre séjour à ${destination} avec les conseils de ${agency.name}, des offres adaptées et un devis personnalisé.`,
        { productType: "stay", offerUrl: input.offerUrl }
      ),
      page(
        "LANDING",
        `circuit-${destinationSlug}`,
        `Circuit à ${destination}`,
        `Circuit à ${destination} | Itinéraires et devis`,
        `Découvrez nos idées de circuits à ${destination}, accompagnés ou sur mesure, préparés avec ${agency.name}.`,
        { productType: "tour", offerUrl: input.offerUrl }
      ),
      page(
        "LANDING",
        `hotel-${destinationSlug}`,
        `Hôtels à ${destination}`,
        `Hôtels à ${destination} | Conseils de votre agence`,
        `Choisissez votre hôtel à ${destination} avec l'accompagnement de ${agency.name} et une sélection adaptée à votre séjour.`,
        { productType: "hotel", offerUrl: input.offerUrl }
      ),
      page(
        "GUIDE",
        `guide-${destinationSlug}`,
        `Guide de voyage ${destination}`,
        `Guide de voyage ${destination} | Conseils pratiques`,
        `Préparez votre voyage à ${destination} : formalités, transport, budget et conseils pratiques de votre agence.`,
        { section: "travel-guide", duration: input.duration }
      ),
      page(
        "FAQ",
        `faq-${destinationSlug}`,
        `Questions fréquentes sur ${destination}`,
        `FAQ voyage à ${destination} | Réponses et conseils`,
        `Toutes les réponses aux questions fréquentes pour organiser un voyage à ${destination} avec votre agence.`,
        {
          questions: input.faq,
          faqSchema: {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: input.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        }
      ),
    ];
  }
}

module.exports = DestinationGenerator;

const slugify = require("./slug");

class SeoPlanner {
  build(input, agency) {
    const destination = input.destination.trim();
    const destinationSlug = slugify(input.destinationSlug || destination);
    const city = agency.city;
    const citySlug = slugify(city);
    const keyword = `${input.travelType} ${destination} depuis ${city}`;

    const pageBlueprints = [
      {
        type: "HOME",
        slug: "",
        title: `${destination} avec votre agence de ${city}`,
        intent: "commercial-local",
        keyword,
      },
      {
        type: "DESTINATION",
        slug: destinationSlug,
        title: `Voyage à ${destination} depuis ${city}`,
        intent: "commercial",
        keyword,
      },
      {
        type: "GUIDE",
        slug: `${destinationSlug}/que-faire`,
        title: `Que faire à ${destination} ?`,
        intent: "information",
        keyword: `que faire à ${destination}`,
      },
      {
        type: "PRACTICAL",
        slug: `${destinationSlug}/conseils`,
        title: `Conseils pour préparer votre voyage à ${destination}`,
        intent: "information",
        keyword: `conseils voyage ${destination}`,
      },
      {
        type: "FAQ",
        slug: `${destinationSlug}/faq`,
        title: `Questions fréquentes sur ${destination}`,
        intent: "information",
        keyword: `voyage ${destination} questions`,
      },
      {
        type: "CONTACT",
        slug: "contact",
        title: `Préparer votre voyage avec l'agence de ${city}`,
        intent: "conversion",
        keyword: `agence de voyages ${city}`,
      },
    ];

    const links = pageBlueprints.flatMap((page, index) => {
      const next = pageBlueprints[index + 1];
      if (!next) return [];
      return [{
        from: page.slug,
        to: next.slug,
        anchor: next.title,
      }];
    });

    links.push(
      { from: destinationSlug, to: "contact", anchor: `Demander un devis à ${city}` },
      { from: `${destinationSlug}/que-faire`, to: destinationSlug, anchor: `Découvrir nos voyages à ${destination}` },
      { from: `${destinationSlug}/faq`, to: "contact", anchor: "Parler à un conseiller" }
    );

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      agency: {
        id: agency.id,
        name: agency.name,
        city,
        citySlug,
        phone: agency.phone,
        email: agency.email,
        address: agency.address,
        postalCode: agency.postalCode,
      },
      topic: {
        destination,
        destinationSlug,
        intent: input.intent,
        travelType: input.travelType,
        season: input.season,
        language: input.language,
        primaryKeyword: keyword,
      },
      pages: pageBlueprints,
      internalLinks: links,
      schemas: ["TravelAgency", "WebSite", "WebPage", "BreadcrumbList", "FAQPage"],
    };
  }
}

module.exports = SeoPlanner;

class SchemaBuilder {
  build(plan, page, baseUrl) {
    const agency = plan.agency;
    const pageUrl = page.slug ? `${baseUrl}/${page.slug}` : baseUrl;

    const graph = [
      {
        "@type": "TravelAgency",
        "@id": `${baseUrl}/#agency`,
        name: agency.name,
        url: baseUrl,
        telephone: agency.phone,
        email: agency.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: agency.address,
          postalCode: agency.postalCode,
          addressLocality: agency.city,
          addressCountry: "FR",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}/#webpage`,
        url: pageUrl,
        name: page.seoTitle,
        description: page.seoDesc,
        isPartOf: { "@id": `${baseUrl}/#website` },
        about: { "@id": `${baseUrl}/#agency` },
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: agency.name,
        publisher: { "@id": `${baseUrl}/#agency` },
      },
    ];

    if (page.type === "FAQ" && Array.isArray(page.content.questions)) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: page.content.questions.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }

    return { "@context": "https://schema.org", "@graph": graph };
  }
}

module.exports = SchemaBuilder;

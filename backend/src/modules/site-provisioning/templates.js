"use strict";

function pageBlocks(page, agency) {
  const contactUrl = page.siteBasePath ? `${page.siteBasePath}/contact` : "/contact";
  const home = page.pageType === "HOME" || page.slug === "";
  const contact = page.slug === "contact";
  const reviews = page.slug === "avis";

  if (home) {
    return [
      {
        blockType: "hero",
        name: "provisioning:home-hero",
        content: {
          title: agency.name,
          subtitle: `Votre agence de voyages à ${agency.city}`,
          ctaLabel: "Demander un devis",
          ctaUrl: contactUrl,
        },
        settings: { source: "mse-14.2" },
        seo: {},
        displayOrder: 0,
        status: "draft",
        visibleDesktop: true,
        visibleMobile: true,
      },
      {
        blockType: "cta",
        name: "provisioning:home-cta",
        content: {
          title: "Construisons votre prochain voyage",
          text: "Échangez avec un conseiller de votre agence.",
          label: "Contacter l’agence",
          url: contactUrl,
        },
        settings: { source: "mse-14.2" },
        seo: {},
        displayOrder: 10,
        status: "draft",
        visibleDesktop: true,
        visibleMobile: true,
      },
    ];
  }

  if (contact) {
    return [{
      blockType: "form",
      name: "provisioning:contact-form",
      content: {
        title: `Contactez ${agency.name}`,
        action: "/api/contact",
        fields: [
          { name: "name", label: "Nom", type: "text" },
          { name: "email", label: "E-mail", type: "email" },
          { name: "phone", label: "Téléphone", type: "tel" },
          { name: "message", label: "Votre projet", type: "text" },
        ],
        submitLabel: "Envoyer ma demande",
      },
      settings: { source: "mse-14.2" },
      seo: {},
      displayOrder: 0,
      status: "draft",
      visibleDesktop: true,
      visibleMobile: true,
    }];
  }

  if (reviews) {
    return [{
      blockType: "reviews",
      name: "provisioning:reviews",
      content: { title: "Avis de nos clients", items: [] },
      settings: { source: "mse-14.2", dataSource: "google-reviews" },
      seo: {},
      displayOrder: 0,
      status: "draft",
      visibleDesktop: true,
      visibleMobile: true,
    }];
  }

  return [];
}

module.exports = { pageBlocks };

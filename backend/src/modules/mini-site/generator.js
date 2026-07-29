class MiniSiteGenerator {
  generateDefaultPages(siteName) {
    return [
      {
        type: "HOME",
        slug: "",
        title: "Accueil",
        seoTitle: siteName.slice(0, 70),
        seoDesc: `Découvrez ${siteName}, votre agence de voyages et demandez un devis personnalisé.`.slice(0, 180),
        content: {
          hero: {
            title: siteName,
            subtitle: "Votre agence de voyages",
            cta: { label: "Demander un devis", href: "/contact" },
          },
        },
      },
      {
        type: "CONTACT",
        slug: "contact",
        title: "Contact",
        seoTitle: `Contact | ${siteName}`.slice(0, 70),
        seoDesc: `Contactez ${siteName} pour préparer votre prochain voyage.`.slice(0, 180),
        content: {},
      },
      {
        type: "FAQ",
        slug: "faq",
        title: "Questions fréquentes",
        seoTitle: `Questions fréquentes | ${siteName}`.slice(0, 70),
        seoDesc: `Retrouvez les réponses aux questions fréquentes de ${siteName}.`.slice(0, 180),
        content: { questions: [] },
      },
      {
        type: "LEGAL",
        slug: "mentions-legales",
        title: "Mentions légales",
        seoTitle: `Mentions légales | ${siteName}`.slice(0, 70),
        seoDesc: `Informations légales de ${siteName}.`.slice(0, 180),
        content: {},
      },
    ];
  }
}

module.exports = MiniSiteGenerator;

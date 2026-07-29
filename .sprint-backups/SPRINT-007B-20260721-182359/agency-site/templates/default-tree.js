module.exports = [
  { key: "home", title: "Accueil", menuTitle: "Accueil", slug: "", pageType: "HOME", order: 0, menu: "main" },
  { key: "agency", title: "Notre agence", menuTitle: "L'agence", slug: "agence", pageType: "AGENCY", order: 10, menu: "main" },
  { key: "team", parentKey: "agency", title: "Notre équipe", menuTitle: "Notre équipe", slug: "equipe", pageType: "TEAM", order: 20, menu: "secondary" },
  { key: "commitments", parentKey: "agency", title: "Nos engagements", menuTitle: "Nos engagements", slug: "engagements", pageType: "COMMITMENTS", order: 30, menu: "secondary" },
  { key: "partners", parentKey: "agency", title: "Nos partenaires", menuTitle: "Nos partenaires", slug: "partenaires", pageType: "PARTNERS", order: 40, menu: "secondary" },
  { key: "services", title: "Nos services", menuTitle: "Nos services", slug: "services", pageType: "SERVICES", order: 50, menu: "main" },
  { key: "destinations", title: "Nos destinations", menuTitle: "Destinations", slug: "destinations", pageType: "DESTINATIONS", order: 60, menu: "main" },
  { key: "inspirations", title: "Inspirations voyage", menuTitle: "Inspirations", slug: "inspirations", pageType: "INSPIRATIONS", order: 70, menu: "main" },
  { key: "reviews", title: "Avis de nos clients", menuTitle: "Avis clients", slug: "avis", pageType: "REVIEWS", order: 80, menu: "main" },
  { key: "contact", title: "Contactez notre agence", menuTitle: "Contact", slug: "contact", pageType: "CONTACT", order: 90, menu: "main" },
  { key: "legal", title: "Mentions légales", menuTitle: "Mentions légales", slug: "mentions-legales", pageType: "LEGAL", order: 100, menu: "footer" },
  { key: "privacy", title: "Politique de confidentialité", menuTitle: "Confidentialité", slug: "confidentialite", pageType: "PRIVACY", order: 110, menu: "footer" }
];

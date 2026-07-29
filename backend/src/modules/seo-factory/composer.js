class ContentComposer {
  compose(plan) {
    const { agency, topic } = plan;
    const d = topic.destination;

    const faq = [
      {
        question: `Quelle est la meilleure période pour partir à ${d} ?`,
        answer: `La période idéale dépend de vos envies et du type de voyage recherché. Votre agence de ${agency.city} vous conseille selon la saison, le budget et les disponibilités.`,
      },
      {
        question: `Comment réserver un voyage à ${d} depuis ${agency.city} ?`,
        answer: `Contactez ${agency.name}. Un conseiller construit avec vous le transport, l’hébergement, les activités et les assurances adaptées.`,
      },
      {
        question: `Pourquoi passer par une agence locale ?`,
        answer: `Vous bénéficiez d’un interlocuteur identifié, de conseils personnalisés et d’un accompagnement avant, pendant et après le voyage.`,
      },
    ];

    return plan.pages.map((page) => {
      const common = {
        title: page.title,
        seoTitle: `${page.title} | ${agency.name}`.slice(0, 65),
        seoDesc: `Préparez votre ${topic.travelType} à ${d} avec ${agency.name}, votre agence de voyages à ${agency.city}. Conseils, devis et accompagnement.`.slice(0, 160),
        type: page.type,
        slug: page.slug,
        published: false,
      };

      if (page.type === "HOME") {
        return {
          ...common,
          content: {
            hero: {
              eyebrow: `Agence de voyages à ${agency.city}`,
              title: `Votre voyage à ${d}, préparé localement`,
              subtitle: `Un projet personnalisé avec ${agency.name}.`,
              cta: { label: "Demander un devis", href: "/contact" },
            },
            sections: [
              { type: "intro", title: `Découvrez ${d}`, body: `Nous construisons votre voyage à ${d} selon vos envies, votre rythme et votre budget.` },
              { type: "benefits", items: ["Conseil humain", "Voyage personnalisé", "Assistance avant et pendant le séjour"] },
            ],
          },
        };
      }

      if (page.type === "FAQ") {
        return { ...common, content: { introduction: `Les réponses de votre agence de ${agency.city}.`, questions: faq } };
      }

      if (page.type === "CONTACT") {
        return {
          ...common,
          content: {
            introduction: `Parlons de votre projet de voyage à ${d}.`,
            agency: {
              name: agency.name,
              phone: agency.phone,
              email: agency.email,
              address: `${agency.address}, ${agency.postalCode} ${agency.city}`,
            },
          },
        };
      }

      return {
        ...common,
        content: {
          introduction: `${d} se découvre de multiples façons. ${agency.name} vous aide à construire un voyage cohérent et personnalisé depuis ${agency.city}.`,
          sections: [
            { type: "editorial", title: page.title, body: `Cette page constitue une base éditoriale structurée. Elle peut être enrichie avec les contenus validés du Knowledge Graph et de l’Asset Engine.` },
            { type: "cta", title: `Votre projet ${d}`, body: `Échangez avec un conseiller de ${agency.name}.`, href: "/contact" },
          ],
        },
      };
    });
  }
}

module.exports = ContentComposer;

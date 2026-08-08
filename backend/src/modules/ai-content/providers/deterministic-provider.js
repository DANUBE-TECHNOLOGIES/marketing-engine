"use strict";

class DeterministicProvider {
  constructor() { this.name = "deterministic"; }

  async generate(data) {
    const place = [data.topic, data.city].filter(Boolean).join(" à ");
    const title = data.channel === "article"
      ? `${data.topic} : le guide voyage de nos experts`
      : `Voyage ${place} avec ${data.agencyName}`;
    const introduction = `Préparez votre voyage ${data.topic} avec les conseils personnalisés de ${data.agencyName}. Notre équipe vous accompagne avant, pendant et après votre séjour.`;

    return {
      title,
      excerpt: introduction,
      body: {
        h1: title,
        introduction,
        sections: [
          {
            heading: `Pourquoi choisir ${data.topic} ?`,
            content: `${data.topic} séduit par la richesse de ses expériences, ses paysages et la diversité de ses séjours. Nous sélectionnons une formule adaptée à vos envies et à votre budget.`,
          },
          {
            heading: "Un voyage préparé avec un conseiller",
            content: `Formalités, transport, hébergement, assurances et excursions : ${data.agencyName} coordonne chaque étape de votre projet.`,
          },
          {
            heading: "Demandez votre proposition personnalisée",
            content: `Échangez avec notre équipe pour construire un séjour ${data.topic} réellement adapté à votre façon de voyager.`,
          },
        ],
        faq: [
          {
            question: `Quelle est la meilleure période pour partir à ${data.topic} ?`,
            answer: "La période idéale dépend de vos priorités, de votre budget et des activités recherchées. Un conseiller vous orientera selon votre projet.",
          },
          {
            question: `Pourquoi réserver ${data.topic} en agence ?`,
            answer: "Vous bénéficiez d'une sélection personnalisée, d'un suivi du dossier et d'un accompagnement en cas d'imprévu.",
          },
        ],
        cta: { label: "Demander un devis personnalisé", action: "contact-agency" },
      },
    };
  }
}

module.exports = DeterministicProvider;

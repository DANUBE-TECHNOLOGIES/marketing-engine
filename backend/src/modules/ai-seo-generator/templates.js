"use strict";

const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const cap = value => { const s = clean(value); return s ? s[0].toUpperCase() + s.slice(1) : s; };
const truncate = (value, max) => { const s = clean(value); return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`; };

function destinationContext(task, campaign) {
  const payload = task.payload || {};
  const destination = (campaign.destinations || [])
    .map(item => item.destination || item)
    .find(item => item.id === payload.destinationId || item.slug === payload.destinationSlug);
  return {
    name: clean(destination?.name || payload.destinationName || campaign.name || "votre prochaine destination"),
    slug: clean(destination?.slug || payload.destinationSlug || "voyage"),
    country: clean(destination?.country || destination?.countryName || ""),
  };
}

function agencyContext(campaign) {
  const agencies = (campaign.agencies || []).map(item => item.agency || item).filter(Boolean);
  return agencies.map(agency => ({
    id: agency.id,
    name: clean(agency.name || agency.displayName),
    city: clean(agency.city),
    phone: clean(agency.phone),
    address: clean(agency.address),
  }));
}

function metadata(campaign, destination) {
  const campaignName = clean(campaign.name);
  const title = truncate(`${cap(destination.name)} : voyage, séjour et conseils | Mondescale`, 60);
  const description = truncate(`Préparez votre voyage à ${destination.name} avec les conseillers Mondescale : idées de séjours, conseils personnalisés et accompagnement avant, pendant et après le départ.`, 155);
  return {
    title,
    description,
    canonicalSlug: destination.slug,
    robots: "index,follow",
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_FR",
    },
    campaignName,
  };
}

function landingPage(task, campaign) {
  const destination = destinationContext(task, campaign);
  const agencies = agencyContext(campaign);
  const seo = metadata(campaign, destination);
  const primaryAgency = agencies[0];
  const h1 = `Voyage à ${destination.name} : construisons votre séjour sur mesure`;
  const intro = `Envie de découvrir ${destination.name} sans perdre du temps à comparer des dizaines d’offres ? Les conseillers Mondescale sélectionnent les solutions adaptées à vos dates, à votre budget et à votre façon de voyager.`;
  const sections = [
    {
      id: "why",
      heading: `Pourquoi partir à ${destination.name} avec Mondescale ?`,
      paragraphs: [
        `Chaque projet est étudié avec attention : rythme du séjour, hébergement, transport, formalités et options utiles. Vous bénéficiez d’un interlocuteur qui connaît votre dossier.`,
        `Notre réseau d’agences travaille avec plusieurs voyagistes afin de comparer les offres et de construire une proposition cohérente, plutôt qu’un simple prix d’appel.`,
      ],
    },
    {
      id: "prepare",
      heading: `Bien préparer votre voyage à ${destination.name}`,
      paragraphs: [
        `La meilleure période dépend de vos priorités : climat, fréquentation, événements et budget. Votre conseiller vous aide à choisir les dates les plus pertinentes et vérifie les formalités applicables à votre situation.`,
        `Assurance, transferts, excursions, bagages et conditions d’entrée peuvent également être intégrés dès la préparation pour éviter les mauvaises surprises.`,
      ],
    },
    {
      id: "cta",
      heading: "Parlez-nous de votre projet",
      paragraphs: [
        primaryAgency?.name
          ? `Contactez ${primaryAgency.name}${primaryAgency.city ? ` à ${primaryAgency.city}` : ""} pour recevoir une première sélection personnalisée.`
          : `Contactez une agence Mondescale pour recevoir une première sélection personnalisée.`,
      ],
    },
  ];
  const faq = faqItems(destination.name);
  return {
    type: "landing-page",
    title: seo.title,
    payload: { h1, intro, sections, faq, cta: { label: "Demander un devis", intent: "lead" } },
    metadata: { seo, schema: schemaGraph(campaign, destination, agencies, faq) },
  };
}

function faqItems(destinationName) {
  return [
    { question: `Quelle est la meilleure période pour voyager à ${destinationName} ?`, answer: `La période idéale dépend du climat recherché, de votre budget et du type de séjour. Un conseiller Mondescale vous aide à comparer les saisons et les disponibilités.` },
    { question: `Faut-il réserver longtemps à l’avance pour ${destinationName} ?`, answer: `Pour les périodes de vacances scolaires et les hébergements les plus demandés, une réservation anticipée offre généralement davantage de choix. Des opportunités de dernière minute peuvent aussi exister.` },
    { question: `Mondescale peut-elle organiser un voyage sur mesure à ${destinationName} ?`, answer: `Oui. Le transport, l’hébergement, les transferts, les excursions et les assurances peuvent être assemblés selon vos besoins et votre budget.` },
    { question: `Quels documents faut-il prévoir ?`, answer: `Les formalités varient selon la destination, la nationalité, l’âge des voyageurs et la durée du séjour. Votre agence vérifie les sources officielles avant le départ.` },
  ];
}

function faqAsset(task, campaign) {
  const destination = destinationContext(task, campaign);
  const items = faqItems(destination.name);
  const seo = metadata(campaign, destination);
  return {
    type: "faq",
    title: `Questions fréquentes – Voyage à ${destination.name}`,
    payload: { heading: `Préparer votre voyage à ${destination.name}`, items },
    metadata: { seo, schema: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) } },
  };
}

function schemaGraph(campaign, destination, agencies, faq) {
  const graph = [
    { "@type": "WebPage", name: `Voyage à ${destination.name}`, description: metadata(campaign, destination).description, inLanguage: "fr-FR" },
    { "@type": "FAQPage", mainEntity: faq.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
  ];
  for (const agency of agencies) graph.push({ "@type": "TravelAgency", name: agency.name || "Mondescale", address: agency.address || undefined, telephone: agency.phone || undefined, areaServed: agency.city || undefined });
  return { "@context": "https://schema.org", "@graph": graph };
}

function genericAsset(task, campaign) {
  const destination = destinationContext(task, campaign);
  return {
    type: task.channel || task.type,
    title: `${campaign.name} – ${destination.name}`,
    payload: { destination, campaignName: campaign.name, generated: false, reason: "channel-not-supported-by-ai-seo-generator" },
    metadata: { generator: "ai-seo-generator", version: "16.2.0" },
  };
}

module.exports = { landingPage, faqAsset, genericAsset, metadata, destinationContext };

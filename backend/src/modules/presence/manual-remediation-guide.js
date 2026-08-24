"use strict";

const GUIDES = Object.freeze({
  pagesjaunes: {
    title: "Corriger la fiche PagesJaunes",
    steps: [
      "Ouvrir la fiche publique et confirmer qu'il s'agit bien de l'établissement Mondescale concerné.",
      "Accéder à l'espace professionnel PagesJaunes ou au parcours de modification de fiche disponible pour l'établissement.",
      "Corriger uniquement les champs signalés en dérive par Local Engine.",
      "Conserver la preuve de la demande ou de la modification effectuée.",
      "Revenir dans Local Engine après propagation et enregistrer une nouvelle observation NAP."
    ]
  },
  mappy: {
    title: "Corriger la fiche Mappy",
    steps: [
      "Ouvrir la fiche Mappy et vérifier son identité.",
      "Utiliser le parcours de signalement ou de correction disponible sur la fiche.",
      "Reprendre strictement les valeurs NAP canoniques fournies par Local Engine.",
      "Conserver une preuve de la demande.",
      "Recontrôler la fiche dans Local Engine après propagation."
    ]
  },
  tripadvisor: {
    title: "Corriger la fiche Tripadvisor",
    steps: [
      "Vérifier que la fiche correspond bien à l'agence concernée.",
      "Utiliser l'espace propriétaire/gestionnaire ou la fonction de correction de la fiche.",
      "Modifier uniquement les champs NAP détectés comme incohérents.",
      "Noter la date et conserver la preuve de la demande.",
      "Effectuer une nouvelle observation dans Local Engine une fois la modification visible."
    ]
  }
});

function buildManualRemediationGuide(providerKey, { drift = [], canonical = {}, listingUrl = null } = {}) {
  const base = GUIDES[providerKey] || {
    title: "Corriger la citation manuellement",
    steps: [
      "Ouvrir la fiche publique et vérifier l'établissement.",
      "Utiliser le canal officiel de correction du provider.",
      "Appliquer uniquement les valeurs NAP canoniques signalées par Local Engine.",
      "Conserver une preuve de la demande.",
      "Revenir dans Local Engine pour vérifier la propagation."
    ]
  };
  const corrections = [...new Set(drift.filter(Boolean))].map((field) => ({ field, target: canonical[field] ?? null }));
  return Object.freeze({
    providerKey,
    title: base.title,
    listingUrl: listingUrl || null,
    corrections: Object.freeze(corrections),
    steps: Object.freeze(base.steps),
    evidenceRecommended: true,
    externalWrite: false
  });
}

module.exports = { buildManualRemediationGuide };

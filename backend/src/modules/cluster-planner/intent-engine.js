const { slugify } = require('./normalizer');

const INTENT_LIBRARY = [
  { key: 'pillar', intent: 'commercial', priority: 100, title: ({ name }) => `Voyage à ${name}`, pageType: 'destination-pillar', parent: null },
  { key: 'things-to-do', intent: 'informational', priority: 92, title: ({ name }) => `Que faire à ${name} ?`, pageType: 'destination-guide', parent: 'pillar' },
  { key: 'short-stay', intent: 'commercial', priority: 90, title: ({ name }) => `Week-end à ${name}`, pageType: 'destination-offer', parent: 'pillar' },
  { key: 'itinerary', intent: 'informational', priority: 88, title: ({ name }) => `${name} en 3 jours`, pageType: 'destination-itinerary', parent: 'pillar' },
  { key: 'where-to-stay', intent: 'commercial', priority: 84, title: ({ name }) => `Où dormir à ${name} ?`, pageType: 'destination-stay', parent: 'pillar' },
  { key: 'when-to-go', intent: 'informational', priority: 80, title: ({ name }) => `Quand partir à ${name} ?`, pageType: 'destination-season', parent: 'pillar' },
  { key: 'family', intent: 'commercial', priority: 76, title: ({ name }) => `${name} en famille`, pageType: 'destination-audience', parent: 'pillar', audience: 'famille' },
  { key: 'couple', intent: 'commercial', priority: 74, title: ({ name }) => `${name} en amoureux`, pageType: 'destination-audience', parent: 'pillar', audience: 'couple' },
  { key: 'food', intent: 'informational', priority: 68, title: ({ name }) => `Où manger à ${name} ?`, pageType: 'destination-guide', parent: 'pillar' },
  { key: 'budget', intent: 'commercial', priority: 66, title: ({ name }) => `Quel budget pour un voyage à ${name} ?`, pageType: 'destination-budget', parent: 'pillar' },
  { key: 'faq', intent: 'informational', priority: 58, title: ({ name }) => `FAQ voyage à ${name}`, pageType: 'destination-faq', parent: 'pillar' }
];

function buildCandidate(definition, destination) {
  const title = definition.title(destination);
  return {
    key: definition.key,
    intent: definition.intent,
    priority: definition.priority,
    title,
    slug: slugify(title),
    pageType: definition.pageType,
    parentKey: definition.parent,
    rationale: rationale(definition, destination)
  };
}

function rationale(definition, destination) {
  if (definition.key === 'pillar') return 'Page pilier centrale du cluster destination.';
  if (definition.audience) return `Répond au segment voyageur « ${definition.audience} » et renforce la conversion.`;
  if (definition.key === 'when-to-go' && destination.bestTime) return `Capitalise sur la saisonnalité disponible : ${destination.bestTime}.`;
  if (definition.key === 'itinerary' && destination.idealDuration) return `Décline la durée idéale disponible : ${destination.idealDuration}.`;
  return `Couvre l’intention ${definition.intent} autour de ${destination.name}.`;
}

function buildIntentCandidates(destination) {
  const candidates = INTENT_LIBRARY.map((definition) => buildCandidate(definition, destination));
  const highlights = Array.isArray(destination.highlights) ? destination.highlights : [];
  for (const highlight of highlights.slice(0, 4)) {
    const title = `${highlight} à ${destination.name}`;
    candidates.push({
      key: `highlight-${slugify(highlight)}`,
      intent: 'informational',
      priority: 72,
      title,
      slug: slugify(title),
      pageType: 'destination-highlight',
      parentKey: 'pillar',
      rationale: `Exploite l’incontournable « ${highlight} » présent dans la fiche destination.`
    });
  }
  return candidates;
}

module.exports = { INTENT_LIBRARY, buildIntentCandidates };

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  comparisonTokens,
  interAgencySimilarityCheck,
  jaccardSimilarity,
  pageSimilarity,
  tokenShingles,
} = require("./prepublication-readiness");

function publishedPage(slug, text) {
  return {
    id: slug || "home",
    slug,
    status: "published",
    published: true,
    title: slug || "Accueil",
    h1: "",
    seoTitle: "",
    metaDescription: "",
    blocks: [
      {
        status: "published",
        content: { text },
      },
    ],
    sections: [],
  };
}

function longClone(city, agency) {
  return `${agency} est votre agence de voyages à ${city}. Notre équipe vous accompagne pour construire votre projet selon vos envies, votre budget et vos dates. Nous comparons les solutions disponibles, vous conseillons sur les étapes importantes et assurons un suivi personnalisé avant, pendant et après le départ. Chaque voyage est préparé avec attention afin de proposer une expérience simple, rassurante et adaptée à vos attentes. Vous pouvez rencontrer nos conseillers en agence pour échanger sur votre prochain séjour et bénéficier d'un accompagnement humain de proximité.`;
}

test("normalization removes local identity before comparison", () => {
  const tokens = comparisonTokens(
    "Mondescale Gien accompagne les voyageurs de Gien avec un conseil personnalisé.",
    { name: "Mondescale Gien", city: "Gien" }
  );

  assert.equal(tokens.includes("gien"), false);
  assert.equal(tokens.includes("mondescale"), false);
  assert.equal(tokens.includes("accompagne"), true);
});

test("Jaccard shingle similarity recognizes equivalent prose", () => {
  const left = tokenShingles("un deux trois quatre cinq six sept huit".split(" "));
  const right = tokenShingles("un deux trois quatre cinq six sept huit".split(" "));
  assert.equal(jaccardSimilarity(left, right), 1);
});

test("same network template with only agency and city changed is flagged", () => {
  const current = publishedPage("", longClone("Gien", "Mondescale Gien"));
  const peer = publishedPage("", longClone("Nevers", "Mondescale Nevers"));

  const similarity = pageSimilarity(
    current,
    { name: "Mondescale Gien", city: "Gien" },
    peer,
    { name: "Mondescale Nevers", city: "Nevers" }
  );

  assert.ok(similarity >= 0.82);
});

test("readiness reports cloned published pages without blocking launch", () => {
  const currentText = longClone("Gien", "Mondescale Gien");
  const peerText = longClone("Nevers", "Mondescale Nevers");

  const currentSite = {
    status: "published",
    pages: [
      publishedPage("", currentText),
      publishedPage("agence", currentText),
      publishedPage("services", currentText),
    ],
  };

  const peers = [
    {
      id: 2,
      name: "Mondescale Nevers",
      city: "Nevers",
      agencySites: [
        {
          status: "published",
          pages: [
            publishedPage("", peerText),
            publishedPage("agence", peerText),
            publishedPage("services", peerText),
          ],
        },
      ],
    },
  ];

  const check = interAgencySimilarityCheck(
    currentSite,
    { id: 1, name: "Mondescale Gien", city: "Gien" },
    peers
  );

  assert.equal(check.required, false);
  assert.equal(check.passed, false);
  assert.ok(check.matches.length >= 1);
  assert.equal(check.matches[0].peerAgencyId, 2);
});

test("genuinely different agency prose is not flagged", () => {
  const current = publishedPage(
    "services",
    "À Gien, notre équipe développe particulièrement les projets de croisières et les départs accompagnés. Nous travaillons les itinéraires port par port, les cabines, les pré et post acheminements et les assurances adaptées. Les voyageurs peuvent venir comparer les compagnies et préparer les formalités avec leur conseillère. Nous suivons aussi les groupes locaux qui souhaitent organiser un départ commun depuis le Loiret avec une préparation dédiée en agence et un interlocuteur identifié pendant toute la construction du dossier."
  );
  const peer = publishedPage(
    "services",
    "À Nevers, l'agence accompagne surtout les familles et les couples qui recherchent des voyages sur mesure. L'équipe construit les étapes, sélectionne des hébergements adaptés, organise les transferts et ajuste le rythme du séjour. Une attention particulière est portée aux voyages de noces et aux grands itinéraires individuels, avec plusieurs échanges de préparation et une sélection de prestations personnalisées selon le budget, les envies de découverte et les contraintes de chaque voyageur."
  );

  const similarity = pageSimilarity(
    current,
    { name: "Mondescale Gien", city: "Gien" },
    peer,
    { name: "Mondescale Nevers", city: "Nevers" }
  );

  assert.ok(similarity < 0.82);
});

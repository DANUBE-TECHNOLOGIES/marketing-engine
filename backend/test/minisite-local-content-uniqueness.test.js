"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { shingles, jaccard, auditLocalContentUniqueness } = require("../src/modules/minisite-structured-data/local-content-uniqueness");

function site(slug, city, text) {
  return {
    slug,
    agency: { name: `Mondescale ${city}`, city },
    pages: [{ slug: "accueil", title: `Agence de voyages ${city}`, seoTitle: `Agence de voyages à ${city}`, metaDescription: `Votre agence de voyages à ${city}`, published: true, status: "published", blocks: [{ published: true, status: "published", content: { heading: `Votre agence de voyages à ${city}`, text } }] }],
  };
}

const duplicateText = "Notre équipe vous accompagne pour construire vos voyages sur mesure, circuits, séjours, croisières et escapades. Nous sélectionnons les meilleures solutions selon vos envies, votre budget et votre calendrier. Nos conseillers connaissent les destinations et vous accompagnent avant, pendant et après votre voyage. Contactez votre agence pour bénéficier de conseils personnalisés, comparer les offres et organiser sereinement votre prochain départ avec un interlocuteur de proximité.";

test("MSE-25.25 computes stable shingle similarity", () => {
  assert.equal(jaccard(shingles("a b c d e"), shingles("a b c d e")), 1);
  assert.equal(jaccard(shingles("a b c d e"), shingles("x y z q r")), 0);
});

test("MSE-25.25 flags near-identical published homepages across agencies", () => {
  const result = auditLocalContentUniqueness([
    site("gien", "Gien", duplicateText),
    site("nevers", "Nevers", duplicateText),
  ], { threshold: 0.7, minimumWords: 40 });
  assert.equal(result.summary.duplicatePairCount, 1);
  assert.equal(result.sites[0].status, "duplicate-risk");
  assert.equal(result.sites[1].status, "duplicate-risk");
});

test("MSE-25.25 keeps genuinely differentiated local content unique", () => {
  const result = auditLocalContentUniqueness([
    site("gien", "Gien", `${duplicateText} À Gien, nous accompagnons particulièrement les départs depuis le Loiret et les projets de circuits accompagnés.`),
    site("nevers", "Nevers", "À Nevers, notre équipe travaille notamment les voyages long-courriers, les départs depuis Clermont-Ferrand et Lyon, les croisières fluviales et les projets groupes. Nous organisons des rendez-vous personnalisés et construisons chaque itinéraire à partir des habitudes de départ des voyageurs de la Nièvre. Nos conseillers suivent le dossier de la première idée au retour et adaptent les propositions selon la saison, la durée et le rythme souhaité par chaque voyageur."),
  ], { threshold: 0.7, minimumWords: 40 });
  assert.equal(result.summary.duplicatePairCount, 0);
  assert.equal(result.sites.every((item) => item.status === "unique"), true);
});

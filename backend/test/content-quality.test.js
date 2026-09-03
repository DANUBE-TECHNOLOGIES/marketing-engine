const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeText, jaccard, diceSimilarity, weightedSimilarity } = require("../src/modules/content-quality/similarity");
const { detectIntent, intentSimilarity } = require("../src/modules/content-quality/intent-matcher");
const { classify, analyzeAgainstCandidates } = require("../src/modules/content-quality/analyzer");

const base = {
  id: "a",
  siteId: "s1",
  title: "Week-end à Budapest : guide complet",
  slug: "week-end-budapest",
  h1: "Organiser un week-end à Budapest",
  metaDescription: "Nos conseils pour visiter Budapest le temps d'un week-end.",
  content: "Visiter Budapest en trois jours, découvrir les thermes et le Danube."
};

test("normalise les accents et la ponctuation", () => {
  assert.equal(normalizeText("Été à Budapest !"), "ete a budapest");
});

test("calcule les similarités lexicales", () => {
  assert.ok(jaccard("week-end budapest", "budapest week end") > 0.6);
  assert.ok(diceSimilarity("Budapest", "Budapset") > 0.5);
});

test("détecte l'intention transactionnelle", () => {
  assert.equal(detectIntent({ ...base, title: "Offre séjour week-end à Budapest" }).primary, "transactional");
});

test("classe un doublon comme fusion", () => {
  const same = { ...base, id: "b", title: "Week-end à Budapest - guide complet" };
  const sim = weightedSimilarity(base, same);
  const result = classify(sim, intentSimilarity(base, same));
  assert.equal(result.recommendedAction, "merge");
  assert.ok(result.duplicateRisk >= 0.82);
});

test("autorise un sujet nettement différent", () => {
  const other = { id: "c", siteId: "s1", title: "Voyage en famille à Tokyo", slug: "tokyo-famille", h1: "Tokyo avec des enfants", metaDescription: "", content: "Parcs, musées et quartiers adaptés aux familles." };
  const result = analyzeAgainstCandidates(base, [other], { duplicateThreshold: 0.5 });
  assert.equal(result.recommendedAction, "create");
  assert.equal(result.similarPages.length, 0);
});

test("remonte les conflits triés par risque", () => {
  const duplicate = { ...base, id: "b", title: "Week-end Budapest : le guide" };
  const related = { ...base, id: "c", title: "Que faire à Budapest en 3 jours", slug: "budapest-3-jours", h1: "Visiter Budapest en 3 jours" };
  const result = analyzeAgainstCandidates(base, [related, duplicate], { duplicateThreshold: 0.3 });
  assert.ok(result.similarPages.length >= 1);
  assert.ok(result.similarPages[0].cannibalizationRisk >= result.similarPages.at(-1).cannibalizationRisk);
});

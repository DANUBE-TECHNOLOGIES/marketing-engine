"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPeople,
  buildPerson,
  collectVerifiedTeamMembers,
} = require("../src/modules/minisite-structured-data/person");

const {
  buildStructuredDataPlan,
} = require("../src/modules/minisite-structured-data/planner");

function teamBlock(members, key = "members") {
  return {
    blockType: "team",
    content: { [key]: members },
  };
}

function siteWithPages(pages) {
  return {
    id: "site-1",
    slug: "maurepas",
    agency: {
      id: 12,
      name: "Mondescale Maurepas",
      city: "Maurepas",
    },
    pages,
  };
}

test("MSE-GEO V1.2 publie uniquement les champs Person explicitement fournis", () => {
  const node = buildPerson({
    member: {
      id: "anisia",
      name: "Anisia",
      role: "Conseillère voyage",
      bio: "Accompagne les clients dans leurs projets de voyage.",
      imageUrl: "/media/assets/anisia.webp",
      expertise: ["Croisières"],
      languages: ["Français"],
    },
    site: { slug: "maurepas" },
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(node["@type"], "Person");
  assert.equal(node["@id"], "https://agences.mondescale.com/agence/maurepas#person-anisia");
  assert.equal(node.name, "Anisia");
  assert.equal(node.jobTitle, "Conseillère voyage");
  assert.equal(node.description, "Accompagne les clients dans leurs projets de voyage.");
  assert.equal(node.image, "/media/assets/anisia.webp");
  assert.deepEqual(node.worksFor, {
    "@id": "https://agences.mondescale.com/agence/maurepas#travel-agency",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(node, "knowsAbout"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(node, "knowsLanguage"), false);
});

test("MSE-GEO V1.2 exclut les placeholders génériques", () => {
  const members = collectVerifiedTeamMembers([
    {
      slug: "agence",
      blocks: [teamBlock([
        { name: "Votre équipe", role: "Conseillers voyage" },
        { name: "Anisia", role: "Conseillère voyage" },
      ])],
    },
  ]);

  assert.equal(members.length, 1);
  assert.equal(members[0].name, "Anisia");
});

test("MSE-GEO V1.2 déduplique le même conseiller entre plusieurs pages", () => {
  const member = {
    id: "anisia",
    name: "Anisia",
    role: "Conseillère voyage",
  };

  const people = buildPeople({
    site: siteWithPages([
      { slug: "accueil", blocks: [teamBlock([member])] },
      { slug: "equipe", blocks: [teamBlock([{ ...member }], "teamMembers")] },
      { slug: "agence", blocks: [teamBlock([{ ...member }], "people")] },
    ]),
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(people.length, 1);
  assert.equal(people[0].name, "Anisia");
});

test("MSE-GEO V1.2 ne fabrique aucune expertise depuis le rôle ou la bio", () => {
  const node = buildPerson({
    member: {
      name: "Anisia",
      role: "Experte voyages sur mesure et croisières",
      bio: "Spécialiste des Maldives et de l'océan Indien.",
    },
    site: { slug: "maurepas" },
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(node.jobTitle, "Experte voyages sur mesure et croisières");
  assert.match(node.description, /Maldives/);
  assert.equal(node.knowsAbout, undefined);
});

test("MSE-GEO V1.2 injecte les Person dans le graphe global et compte les profils", () => {
  const site = siteWithPages([
    {
      id: "page-1",
      slug: "equipe",
      title: "Équipe",
      blocks: [teamBlock([
        { id: "anisia", name: "Anisia", role: "Conseillère voyage" },
        { name: "Votre équipe", role: "Conseillers voyage" },
      ])],
    },
  ]);

  const plan = buildStructuredDataPlan({
    sites: [site],
    publicOrigin: "https://agences.mondescale.com",
  });

  const people = plan.items[0].graph["@graph"].filter((node) => node["@type"] === "Person");
  assert.equal(people.length, 1);
  assert.equal(people[0].name, "Anisia");
  assert.equal(plan.items[0].summary.personCount, 1);
  assert.equal(plan.summary.personCount, 1);
});

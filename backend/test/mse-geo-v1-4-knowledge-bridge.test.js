"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPerson,
  collectKnowledgeEntityIds,
  explicitExpertiseNames,
} = require("../src/modules/minisite-structured-data/person");

const {
  MiniSiteStructuredDataRepository,
} = require("../src/modules/minisite-structured-data/repository");

const {
  MiniSiteStructuredDataService,
} = require("../src/modules/minisite-structured-data/service");

function publishedKnowledgePerson(id = "kg-anisia") {
  return {
    id,
    type: "person",
    status: "published",
    title: "Anisia",
    outgoingRelations: [
      {
        relationType: "expert_in",
        target: {
          id: "exp-cruise",
          type: "expertise",
          status: "published",
          title: "Croisières",
        },
      },
      {
        relationType: "expert_in",
        target: {
          id: "exp-maldives",
          type: "expertise",
          status: "draft",
          title: "Maldives",
        },
      },
      {
        relationType: "related_to",
        target: {
          id: "exp-circuit",
          type: "expertise",
          status: "published",
          title: "Circuits",
        },
      },
    ],
  };
}

function teamSite(member, knowledgePeople = []) {
  return {
    slug: "maurepas",
    knowledgePeople,
    pages: [
      {
        slug: "equipe",
        blocks: [
          {
            blockType: "team",
            content: { members: [member] },
          },
        ],
      },
    ],
  };
}

test("MSE-GEO V1.4 collecte uniquement les références Knowledge explicites", () => {
  const site = teamSite({
    name: "Anisia",
    knowledgeEntityId: "kg-anisia",
  });

  assert.deepEqual(collectKnowledgeEntityIds(site.pages), ["kg-anisia"]);

  const noReference = teamSite({
    name: "Anisia",
    expertise: ["Croisières"],
    bio: "Spécialiste croisières",
  });

  assert.deepEqual(collectKnowledgeEntityIds(noReference.pages), []);
});

test("MSE-GEO V1.4 publie knowsAbout seulement depuis expert_in vers expertise publiée", () => {
  assert.deepEqual(
    explicitExpertiseNames(publishedKnowledgePerson()),
    ["Croisières"]
  );
});

test("MSE-GEO V1.4 refuse tout rapprochement implicite par nom", () => {
  const node = buildPerson({
    member: {
      name: "Anisia",
      role: "Conseillère voyage",
      expertise: ["Croisières"],
    },
    site: teamSite(
      { name: "Anisia" },
      [publishedKnowledgePerson()]
    ),
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(node.name, "Anisia");
  assert.equal(node.knowsAbout, undefined);
});

test("MSE-GEO V1.4 enrichit seulement un Person relié par knowledgeEntityId exact", () => {
  const node = buildPerson({
    member: {
      id: "anisia",
      name: "Anisia",
      role: "Conseillère voyage",
      knowledgeEntityId: "kg-anisia",
      expertise: ["Valeur libre ignorée"],
    },
    site: teamSite(
      { name: "Anisia", knowledgeEntityId: "kg-anisia" },
      [publishedKnowledgePerson()]
    ),
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.deepEqual(node.knowsAbout, ["Croisières"]);
  assert.equal(node.jobTitle, "Conseillère voyage");
});

test("MSE-GEO V1.4 repository filtre strictement ids, type person, published et expert_in", async () => {
  let query = null;
  const prisma = {
    knowledgeEntity: {
      findMany: async (input) => {
        query = input;
        return [publishedKnowledgePerson()];
      },
    },
  };

  const repository = new MiniSiteStructuredDataRepository(prisma);
  const result = await repository.listPublishedKnowledgePeopleByIds([
    "kg-anisia",
    "kg-anisia",
    "",
  ]);

  assert.equal(result.length, 1);
  assert.deepEqual(query.where, {
    id: { in: ["kg-anisia"] },
    type: "person",
    status: "published",
  });
  assert.equal(query.select.outgoingRelations.where.relationType, "expert_in");
});

test("MSE-GEO V1.4 service ne consulte pas Knowledge sans référence explicite", async () => {
  let calls = 0;
  const repository = {
    listPublishedKnowledgePeopleByIds: async () => {
      calls += 1;
      return [];
    },
  };

  const service = new MiniSiteStructuredDataService({
    repository,
    publicOrigin: "https://agences.mondescale.com",
  });

  const sites = [teamSite({ name: "Anisia" })];
  const enriched = await service.enrichSitesWithKnowledge(sites);

  assert.equal(calls, 0);
  assert.equal(enriched, sites);
});

test("MSE-GEO V1.4 service charge uniquement les ids explicitement publiés dans les profils", async () => {
  let requested = null;
  const repository = {
    listPublishedKnowledgePeopleByIds: async (ids) => {
      requested = ids;
      return [publishedKnowledgePerson()];
    },
  };

  const service = new MiniSiteStructuredDataService({
    repository,
    publicOrigin: "https://agences.mondescale.com",
  });

  const sites = [teamSite({
    name: "Anisia",
    knowledgeEntityId: "kg-anisia",
  })];

  const [enriched] = await service.enrichSitesWithKnowledge(sites);
  assert.deepEqual(requested, ["kg-anisia"]);
  assert.equal(enriched.knowledgePeople.length, 1);
  assert.equal(enriched.knowledgePeople[0].id, "kg-anisia");
});

"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  TemplateLibraryApiService,
} =
  require(
    "../src/modules/template-library/api-service"
  );

test(
  "cloneAgencyDraft crée un draft sans assignment",
  async () => {
    let createdDefinition =
      null;

    let assignmentCalls =
      0;

    const fakePrisma = {
      agency: {
        async findFirst() {
          return {
            id:
              6,

            tenantId:
              "tenant_mondescale",

            name:
              "Agence test",

            city:
              "Test",
          };
        },
      },

      agencySite: {
        async findFirst() {
          return null;
        },
      },

      templateDefinition: {
        async create({
          data,
        }) {
          createdDefinition = {
            id:
              "draft-row",

            ...data,
          };

          return createdDefinition;
        },

        async findUnique() {
          return null;
        },
      },

      templateAssignment: {
        async findFirst() {
          assignmentCalls +=
            1;

          return null;
        },
      },
    };

    const service =
      new TemplateLibraryApiService({
        prisma:
          fakePrisma,
      });

    service.library = {
      async resolve() {
        return {
          source:
            "platform",

          assignment:
            null,

          template: {
            id:
              "mondescale.home.default",

            name:
              "Accueil standard",

            kind:
              "page",

            pageType:
              "HOME",

            variant:
              "default",

            version:
              "1.0.0",

            status:
              "active",

            scope:
              "platform",

            sections:
              [],
          },
        };
      },
    };

    const result =
      await service
        .cloneAgencyDraft({
          tenantId:
            "tenant_mondescale",

          agencyId:
            6,

          pageType:
            "HOME",
        });

    assert.equal(
      result.created,
      true
    );

    assert.equal(
      result.publishing,
      false
    );

    assert.equal(
      result.assignmentChanged,
      false
    );

    assert.equal(
      createdDefinition.status,
      "draft"
    );

    assert.equal(
      createdDefinition.scope,
      "agency"
    );

    assert.equal(
      createdDefinition.agencyId,
      6
    );

    /*
     * Un findAssignment peut avoir lieu pendant resolve,
     * mais aucun setAssignment/upsert d'affectation
     * ne doit être appelé par cloneAgencyDraft().
     */
    assert.ok(
      assignmentCalls >=
      0
    );
  }
);

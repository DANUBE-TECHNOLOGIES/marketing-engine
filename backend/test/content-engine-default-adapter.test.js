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
  DefaultContentAdapter,
  normalizePageType,
} =
  require(
    "../src/modules/content-engine/default-content"
  );

const agency = {
  id:
    4,

  name:
    "Ambassade FRAM - Mondescale Gien",

  city:
    "Gien",

  address:
    "12 Rue Gambetta",

  postalCode:
    "45500",

  phone:
    "09 73 03 72 20",

  email:
    "gien@example.test",
};

const site = {
  id:
    "site-4",

  slug:
    "ambassade-fram-mondescale-gien",
};

test(
  "slug vide est reconnu comme HOME",
  () => {
    assert.equal(
      normalizePageType({
        slug:
          "",
      }),
      "HOME"
    );
  }
);

test(
  "page vide crée toutes les sections HOME",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildPlan({
        agency,
        site,

        page: {
          id:
            "home",

          slug:
            "",

          sections:
            [],
        },
      });

    assert.equal(
      plan.page.pageType,
      "HOME"
    );

    assert.equal(
      plan.summary.total,
      6
    );

    assert.equal(
      plan.summary.create,
      6
    );

    assert.equal(
      plan.summary.preserve,
      0
    );
  }
);

test(
  "une section legacy existante est préservée",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildPlan({
        agency,
        site,

        page: {
          id:
            "home",

          slug:
            "",

          sections: [
            {
              id:
                "human-hero",

              sectionType:
                "hero",

              content: {
                title:
                  "Mon hero personnalisé",
              },
            },
          ],
        },
      });

    const hero =
      plan.operations
        .find(
          operation =>
            operation.sectionType ===
            "hero"
        );

    assert.equal(
      hero.action,
      "preserve"
    );

    assert.equal(
      hero.generatedSection,
      null
    );

    assert.equal(
      plan.summary.create,
      5
    );

    assert.equal(
      plan.summary.preserve,
      1
    );
  }
);

test(
  "contenu default existant reste préservé par défaut",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildPlan({
        agency,
        site,

        page: {
          id:
            "home",

          slug:
            "",

          sections: [
            {
              id:
                "generated-hero",

              sectionType:
                "hero",

              content: {
                content: {
                  title:
                    "Ancien hero",
                },

                meta: {
                  source:
                    "default-builder",
                },
              },
            },
          ],
        },
      });

    const hero =
      plan.operations
        .find(
          operation =>
            operation.sectionType ===
            "hero"
        );

    assert.equal(
      hero.action,
      "preserve"
    );
  }
);

test(
  "refresh explicite autorise le remplacement d'un contenu généré",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildPlan({
        agency,
        site,

        allowGeneratedRefresh:
          true,

        page: {
          id:
            "home",

          slug:
            "",

          sections: [
            {
              id:
                "generated-hero",

              sectionType:
                "hero",

              content: {
                content: {
                  title:
                    "Ancien hero",
                },

                meta: {
                  source:
                    "default-builder",
                },
              },
            },
          ],
        },
      });

    const hero =
      plan.operations
        .find(
          operation =>
            operation.sectionType ===
            "hero"
        );

    assert.equal(
      hero.action,
      "refresh"
    );
  }
);

test(
  "contenu humain n'est jamais rafraîchi automatiquement",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildPlan({
        agency,
        site,

        allowGeneratedRefresh:
          true,

        page: {
          id:
            "home",

          slug:
            "",

          sections: [
            {
              id:
                "human-hero",

              sectionType:
                "hero",

              content: {
                content: {
                  title:
                    "Personnalisé",
                },

                meta: {
                  source:
                    "human",
                },
              },
            },
          ],
        },
      });

    const hero =
      plan.operations
        .find(
          operation =>
            operation.sectionType ===
            "hero"
        );

    assert.equal(
      hero.action,
      "preserve"
    );
  }
);

test(
  "AGENCY services contact sont reconnus par slug",
  () => {
    assert.equal(
      normalizePageType({
        slug:
          "agence",
      }),
      "AGENCY"
    );

    assert.equal(
      normalizePageType({
        slug:
          "services",
      }),
      "SERVICES"
    );

    assert.equal(
      normalizePageType({
        slug:
          "contact",
      }),
      "CONTACT"
    );
  }
);

test(
  "plan site ignore les pages non couvertes par le Default Builder",
  () => {
    const adapter =
      new DefaultContentAdapter();

    const plan =
      adapter.buildSitePlan({
        agency,

        site: {
          ...site,

          pages: [
            {
              id:
                "home",

              slug:
                "",

              sections:
                [],
            },

            {
              id:
                "destinations",

              slug:
                "destinations",

              pageType:
                "DESTINATIONS",

              sections:
                [],
            },
          ],
        },
      });

    assert.equal(
      plan.summary.pages,
      1
    );

    assert.equal(
      plan.pages[0]
        .page
        .pageType,
      "HOME"
    );
  }
);

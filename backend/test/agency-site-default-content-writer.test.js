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
  DefaultContentWriter,
} =
  require(
    "../src/modules/agency-site/default-content-writer"
  );

const agency = {
  id:
    1,

  name:
    "Mondescale Test",

  city:
    "Testville",

  phone:
    "01 02 03 04 05",

  email:
    "test@example.test",
};

const site = {
  id:
    "site-1",

  slug:
    "mondescale-test",

  pages: [
    {
      id:
        "page-home",

      slug:
        "",

      pageType:
        "HOME",

      sections:
        [],
    },
  ],
};

test(
  "writer crée uniquement les sections absentes",
  async () => {
    const calls =
      [];

    const writer =
      new DefaultContentWriter({
        repository: {
          async createSectionIfMissing(
            pageId,
            section
          ) {
            calls.push({
              pageId,
              section,
            });

            return {
              created:
                true,

              reason:
                "SECTION_CREATED",

              section: {
                id:
                  `section-${calls.length}`,
              },
            };
          },
        },
      });

    const output =
      await writer.ensure({
        agency,
        site,
      });

    assert.equal(
      output.result.created,
      6
    );

    assert.equal(
      calls.length,
      6
    );
  }
);

test(
  "writer ne touche pas à un hero existant",
  async () => {
    const calls =
      [];

    const writer =
      new DefaultContentWriter({
        repository: {
          async createSectionIfMissing(
            pageId,
            section
          ) {
            calls.push(
              section.sectionType
            );

            return {
              created:
                true,

              reason:
                "SECTION_CREATED",

              section: {
                id:
                  section.sectionType,
              },
            };
          },
        },
      });

    const output =
      await writer.ensure({
        agency,

        site: {
          ...site,

          pages: [
            {
              ...site.pages[0],

              sections: [
                {
                  id:
                    "existing-hero",

                  sectionType:
                    "hero",

                  jsonContent: {
                    title:
                      "Hero humain",
                  },
                },
              ],
            },
          ],
        },
      });

    assert.equal(
      calls.includes(
        "hero"
      ),
      false
    );

    assert.equal(
      output.result.created,
      5
    );

    assert.equal(
      output.result.preserved,
      1
    );
  }
);

test(
  "writer n'exécute jamais refresh",
  async () => {
    let writes =
      0;

    const writer =
      new DefaultContentWriter({
        repository: {
          async createSectionIfMissing() {
            writes +=
              1;

            return {
              created:
                true,
            };
          },
        },

        adapter: {
          buildSitePlan() {
            return {
              pages: [
                {
                  page: {
                    id:
                      "page-home",
                  },

                  operations: [
                    {
                      sectionType:
                        "hero",

                      action:
                        "refresh",

                      generatedSection: {
                        sectionType:
                          "hero",

                        content: {
                          title:
                            "Replacement",
                        },
                      },
                    },
                  ],
                },
              ],
            };
          },
        },
      });

    const output =
      await writer.ensure({
        agency,
        site,
      });

    assert.equal(
      writes,
      0
    );

    assert.equal(
      output.result.refreshSkipped,
      1
    );
  }
);

test(
  "second passage devient idempotent",
  async () => {
    const existing =
      new Set();

    let createCalls =
      0;

    const writer =
      new DefaultContentWriter({
        repository: {
          async createSectionIfMissing(
            pageId,
            section
          ) {
            createCalls +=
              1;

            const key =
              `${pageId}:${section.sectionType}`;

            if (
              existing.has(
                key
              )
            ) {
              return {
                created:
                  false,

                reason:
                  "SECTION_ALREADY_EXISTS",

                section: {
                  id:
                    key,
                },
              };
            }

            existing.add(
              key
            );

            return {
              created:
                true,

              reason:
                "SECTION_CREATED",

              section: {
                id:
                  key,
              },
            };
          },
        },
      });

    const first =
      await writer.ensure({
        agency,
        site,
      });

    const second =
      await writer.ensure({
        agency,
        site,
      });

    assert.equal(
      first.result.created,
      6
    );

    assert.equal(
      second.result.created,
      0
    );

    assert.equal(
      second.result.preserved,
      6
    );

    assert.equal(
      createCalls,
      12
    );
  }
);

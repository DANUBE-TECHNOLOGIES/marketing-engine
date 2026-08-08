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
  isPublished,
  pageBySlug,
  pageCheck,
} =
  require(
    "../src/modules/agency-launch/service"
  );

test(
  "isPublished reconnaît les contenus publiés",
  () => {
    assert.equal(
      isPublished({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      isPublished({
        published:
          true,
      }),
      true
    );

    assert.equal(
      isPublished({
        status:
          "draft",
      }),
      false
    );
  }
);

test(
  "pageBySlug retrouve une page",
  () => {
    const page =
      pageBySlug(
        [
          {
            slug:
              "home",
          },

          {
            slug:
              "contact",
          },
        ],
        "contact"
      );

    assert.equal(
      page?.slug,
      "contact"
    );
  }
);

test(
  "pageCheck exige une page publiée",
  () => {
    const result =
      pageCheck({
        pages: [
          {
            id:
              "p1",

            slug:
              "contact",

            status:
              "published",

            published:
              true,
          },
        ],

        slug:
          "contact",

        label:
          "Contact",

        required:
          true,
      });

    assert.equal(
      result.exists,
      true
    );

    assert.equal(
      result.published,
      true
    );

    assert.equal(
      result.passed,
      true
    );
  }
);

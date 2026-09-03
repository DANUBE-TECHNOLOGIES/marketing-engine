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
  buildTemplateDiff,
} =
  require(
    "../src/modules/template-library/api-service"
  );

test(
  "diff détecte une section modifiée",
  () => {
    const before = {
      sections: [
        {
          sectionType:
            "hero",

          content: {
            title:
              "Avant",
          },
        },
      ],

      seo: {
        title:
          "SEO avant",
      },
    };

    const after = {
      sections: [
        {
          sectionType:
            "hero",

          content: {
            title:
              "Après",
          },
        },
      ],

      seo: {
        title:
          "SEO après",
      },
    };

    const diff =
      buildTemplateDiff(
        before,
        after
      );

    assert.equal(
      diff.changed,
      true
    );

    assert.equal(
      diff.seoChanged,
      true
    );

    assert.equal(
      diff.sections[0].status,
      "changed"
    );
  }
);

test(
  "diff identique reste inchangé",
  () => {
    const template = {
      sections: [
        {
          sectionType:
            "hero",

          content: {
            title:
              "Identique",
          },
        },
      ],
    };

    const diff =
      buildTemplateDiff(
        template,
        template
      );

    assert.equal(
      diff.changed,
      false
    );
  }
);

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  replaceLeadingParagraph,
} = require("./territorial-wave1-planner");

test(
  "AI-C3 preserves existing editorial suffix",
  () => {
    const before =
      '<p>Old territorial paragraph.</p>\n' +
      '<p data-seo-link="mse-25.47">' +
      '<a href="/engagements">Engagements</a>' +
      "</p>";

    const after =
      replaceLeadingParagraph({
        currentHtml:
          before,
        replacementHtml:
          "<p>New territorial paragraph.</p>",
      });

    assert.match(
      after,
      /New territorial paragraph/
    );

    assert.match(
      after,
      /data-seo-link="mse-25\.47"/
    );

    assert.match(
      after,
      /href="\/engagements"/
    );

    assert.doesNotMatch(
      after,
      /Old territorial paragraph/
    );
  }
);

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  paragraphFragments,
  safeHref,
  stripTags,
} = require("./safe-rich-text");

test("relative editorial links survive", () => {
  const rows = paragraphFragments(
    '<p>Avant <a href="/engagements">' +
    'Découvrir nos engagements</a> après.</p>'
  );

  assert.deepEqual(rows, [[
    {
      type: "text",
      text: "Avant",
    },
    {
      type: "link",
      text: "Découvrir nos engagements",
      href: "/engagements",
    },
    {
      type: "text",
      text: "après.",
    },
  ]]);
});

test("territorial agency links survive", () => {
  const href =
    "/agence/ambassade-fram-" +
    "mondescale-bois-colombes";

  assert.equal(
    safeHref(href),
    href
  );
});

test("safe external/contact protocols survive", () => {
  assert.equal(
    safeHref("https://example.com/a"),
    "https://example.com/a"
  );

  assert.equal(
    safeHref("mailto:test@example.com"),
    "mailto:test@example.com"
  );

  assert.equal(
    safeHref("tel:+33142423131"),
    "tel:+33142423131"
  );

  assert.equal(
    safeHref("#contact"),
    "#contact"
  );
});

test("javascript href is rejected", () => {
  assert.equal(
    safeHref("javascript:alert(1)"),
    null
  );
});

test("protocol-relative href is rejected", () => {
  assert.equal(
    safeHref("//evil.example"),
    null
  );
});

test("unsafe anchor degrades to text", () => {
  assert.deepEqual(
    paragraphFragments(
      '<p><a href="javascript:alert(1)">' +
      "Texte sûr</a></p>"
    ),
    [[{
      type: "text",
      text: "Texte sûr",
    }]]
  );
});

test("arbitrary tags are not emitted", () => {
  const serialized = JSON.stringify(
    paragraphFragments(
      "<p>Hello <script>alert(1)</script>" +
      "<strong>voyage</strong></p>"
    )
  );

  assert.equal(
    serialized.includes("<script"),
    false
  );

  assert.equal(
    serialized.includes("<strong"),
    false
  );
});

test("common entities decode", () => {
  assert.equal(
    stripTags(
      "Voyage &amp; conseil&nbsp;local"
    ),
    "Voyage & conseil local"
  );
});

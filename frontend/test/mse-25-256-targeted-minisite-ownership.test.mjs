import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seo = fs.readFileSync(
  new URL(
    "../lib/seo/local-page-seo.js",
    import.meta.url,
  ),
  "utf8",
);

const group = fs.readFileSync(
  new URL(
    "../app/agence/[siteSlug]/voyages-en-groupe/page.js",
    import.meta.url,
  ),
  "utf8",
);

test(
  "MSE-25.256 Lamorlaye secondary pages use route-specific titles",
  () => {
    assert.match(
      seo,
      /slug === "mondescale-lamorlaye"/,
    );

    assert.match(
      seo,
      /kind !== "home"/,
    );

    assert.match(
      seo,
      /return fallback;/,
    );
  },
);

test(
  "MSE-25.256 Lamorlaye home keeps CMS/local title eligibility",
  () => {
    assert.match(
      seo,
      /kind !== "home"/,
    );

    assert.match(
      seo,
      /return preferLocalOverride\(/,
    );
  },
);

test(
  "MSE-25.256 Melun rejects historical TUI title overrides",
  () => {
    assert.match(
      seo,
      /slug === "tui-store-melun"/,
    );

    assert.match(
      seo,
      /\\btui\\b/i,
    );
  },
);

test(
  "MSE-25.256 keeps descriptions on the existing local override path",
  () => {
    assert.match(
      seo,
      /description:\s*preferLocalOverride\(/,
    );
  },
);

test(
  "MSE-25.256 title resolver does not implement indexation or canonical changes",
  () => {
    const start = seo.indexOf(
      "function targetedSeoTitle"
    );

    const end = seo.indexOf(
      "function titleForKind",
      start
    );

    assert.notEqual(start, -1);
    assert.notEqual(end, -1);

    const resolver = seo
      .slice(start, end)
      // Comments describe the safety contract and may legitimately
      // contain words such as "canonicals" or "indexation".
      .replace(/\/\*[\s\S]*?\*\//g, "");

    assert.doesNotMatch(
      resolver,
      /noindex/i,
    );

    assert.doesNotMatch(
      resolver,
      /canonical/i,
    );

    assert.doesNotMatch(
      resolver,
      /robots/i,
    );
  },
);

test(
  "MSE-25.256 group route contains no literal TUI STORE Melun metadata",
  () => {
    const start = group.indexOf(
      "export async function generateMetadata"
    );

    assert.notEqual(start, -1);

    const next = group.indexOf(
      "\nexport ",
      start + 10
    );

    const metadata = group.slice(
      start,
      next === -1 ? group.length : next
    );

    assert.doesNotMatch(
      metadata,
      /TUI\s+STORE\s+Melun/i,
    );
  },
);

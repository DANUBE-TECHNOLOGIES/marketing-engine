import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(
  new URL(
    "../app/agence/[siteSlug]/inspiration/page.js",
    import.meta.url
  ),
  "utf8"
);

const detail = await readFile(
  new URL(
    "../app/agence/[siteSlug]/inspiration/[contentSlug]/page.js",
    import.meta.url
  ),
  "utf8"
);

test("MSE-25.264 inspiration index resolves public agency identity", () => {
  assert.match(
    index,
    /resolvePublicAgencyName/
  );

  assert.doesNotMatch(
    index,
    /\$\{site\.name\}|\{site\.name\}|siteName:\s*site\.name/
  );
});

test("MSE-25.264 inspiration detail resolves public agency identity", () => {
  assert.match(
    detail,
    /resolvePublicAgencyName/
  );

  assert.doesNotMatch(
    detail,
    /siteName:\s*data\.site\.name/
  );
});

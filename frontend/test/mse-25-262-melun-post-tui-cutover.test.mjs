import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";

const header = fs.readFileSync(
  "components/public-site/PublicSiteHeader.js",
  "utf8"
);

const identity = fs.readFileSync(
  "components/public-site/melun-public-identity.js",
  "utf8"
);

const nextConfig = fs.readFileSync(
  "next.config.js",
  "utf8"
);

test("MSE-25.262 removes temporary TUI logo from Melun header", () => {
  assert.equal(header.includes("/partners/tui-official.webp"), false);
});

test("MSE-25.262 restores generic PublicBrandLogo", () => {
  assert.equal(header.includes("PublicBrandLogo"), true);
});

test("MSE-25.262 defines canonical post-TUI Melun identity", () => {
  assert.equal(
    identity.includes('"ambassade-fram-mondescale-melun"'),
    true
  );

  assert.equal(
    identity.includes('"Ambassade FRAM – Mondescale – Melun"'),
    true
  );
});

test("MSE-25.262 keeps legacy Melun permanent redirect", () => {
  assert.equal(
    nextConfig.includes('source: "/agence/tui-store-melun"'),
    true
  );

  assert.equal(
    nextConfig.includes(
      'destination: "/agence/ambassade-fram-mondescale-melun"'
    ),
    true
  );
});

test("MSE-25.262 does not remove historical TUI asset globally", () => {
  assert.equal(
    fs.existsSync("public/partners/tui-official.webp"),
    true
  );
});

test("MSE-25.264 Melun authoritative directory uses final public phone", async () => {
  const directory = await readFile(
    new URL("../../backend/src/data/agencyDirectory.js", import.meta.url),
    "utf8"
  );

  const melunStart = directory.indexOf('code: "melun"');
  assert.notEqual(melunStart, -1);

  const melunRecord = directory.slice(melunStart, melunStart + 1200);

  assert.match(melunRecord, /phone:\s*"01 30 62 41 91"/);
  assert.doesNotMatch(melunRecord, /01 64 39 31 07/);
});

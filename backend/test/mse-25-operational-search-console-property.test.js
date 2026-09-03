"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  chooseSearchConsoleProperty,
  resolveSearchConsoleSiteUrl,
} = require("../src/modules/minisite-semantic-engine/search-console-property-resolver");

test("prefers exact agences.mondescale.com domain property", () => {
  const selected = chooseSearchConsoleProperty([
    { siteUrl: "sc-domain:mondescale.com", permissionLevel: "siteOwner" },
    { siteUrl: "sc-domain:agences.mondescale.com", permissionLevel: "siteFullUser" },
  ]);
  assert.equal(selected.siteUrl, "sc-domain:agences.mondescale.com");
});

test("keeps an explicit SEARCH_CONSOLE_SITE_URL without discovery", async () => {
  let fetched = false;
  const result = await resolveSearchConsoleSiteUrl({
    accessToken: "token",
    explicitSiteUrl: "sc-domain:agences.mondescale.com",
    fetchImpl: async () => { fetched = true; throw new Error("should not fetch"); },
  });
  assert.equal(result.siteUrl, "sc-domain:agences.mondescale.com");
  assert.equal(result.source, "env");
  assert.equal(fetched, false);
});

test("discovers the exact agences property when env is absent", async () => {
  const previous = process.env.SEARCH_CONSOLE_SITE_URL;
  delete process.env.SEARCH_CONSOLE_SITE_URL;
  try {
    const result = await resolveSearchConsoleSiteUrl({
      accessToken: "token",
      explicitSiteUrl: "",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          siteEntry: [
            { siteUrl: "sc-domain:mondescale.com", permissionLevel: "siteOwner" },
            { siteUrl: "sc-domain:agences.mondescale.com", permissionLevel: "siteFullUser" },
          ],
        }),
      }),
    });
    assert.equal(result.siteUrl, "sc-domain:agences.mondescale.com");
    assert.equal(result.source, "discovered");
    assert.equal(result.permissionLevel, "siteFullUser");
    assert.equal(process.env.SEARCH_CONSOLE_SITE_URL, "sc-domain:agences.mondescale.com");
  } finally {
    if (previous === undefined) delete process.env.SEARCH_CONSOLE_SITE_URL;
    else process.env.SEARCH_CONSOLE_SITE_URL = previous;
  }
});

test("fails closed when no unambiguous property matches the mini-site host", async () => {
  await assert.rejects(
    () => resolveSearchConsoleSiteUrl({
      accessToken: "token",
      explicitSiteUrl: "",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          siteEntry: [
            { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
            { siteUrl: "sc-domain:other.example.com", permissionLevel: "siteOwner" },
          ],
        }),
      }),
    }),
    (error) => error?.code === "MSE_25_SEARCH_CONSOLE_PROPERTY_NOT_RESOLVED"
  );
});

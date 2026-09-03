"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createConfiguredSearchConsoleProvider,
  enabled,
} = require("../src/modules/search-console-submission/config");

test("Search Console remains disabled unless explicitly enabled", () => {
  const provider = createConfiguredSearchConsoleProvider({ env: {} });
  assert.equal(provider.name, "disabled");
  assert.equal(provider.isConfigured(), false);
  assert.equal(provider.requestedEnabled, false);
  assert.equal(provider.disabledReason, "feature-disabled");
  assert.equal(enabled("true"), true);
  assert.equal(enabled("0"), false);
});

test("explicit activation remains safely disabled when google-auth-library is missing", () => {
  const provider = createConfiguredSearchConsoleProvider({
    env: { SEARCH_CONSOLE_ENABLED: "true" },
    moduleLoader() {
      throw new Error("module not found");
    },
  });

  assert.equal(provider.name, "disabled");
  assert.equal(provider.isConfigured(), false);
  assert.equal(provider.requestedEnabled, true);
  assert.equal(provider.disabledReason, "google-auth-library-missing");
});

test("explicit activation builds Google provider with injected auth implementation", async () => {
  class FakeGoogleAuth {
    async getClient() {
      return { async getAccessToken() { return { token: "token-xyz" }; } };
    }
  }

  const provider = createConfiguredSearchConsoleProvider({
    env: {
      SEARCH_CONSOLE_ENABLED: "true",
      GOOGLE_APPLICATION_CREDENTIALS: "/run/secrets/search-console.json",
    },
    GoogleAuth: FakeGoogleAuth,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      async json() {
        if (url.endsWith("/sites")) {
          return { siteEntry: [{ siteUrl: "sc-domain:agences.example.test", permissionLevel: "siteOwner" }] };
        }
        return {};
      },
    }),
  });

  assert.equal(provider.name, "google-search-console");
  assert.equal(provider.isConfigured(), true);
  assert.equal(provider.requestedEnabled, true);
  assert.equal(provider.disabledReason, null);
  assert.equal(provider.credentialMode, "key-file");
  const sites = await provider.listSites();
  assert.equal(sites[0].siteUrl, "sc-domain:agences.example.test");
});

test("enabled provider can rely on application default credentials without exposing a path", () => {
  class FakeGoogleAuth {}
  const provider = createConfiguredSearchConsoleProvider({
    env: { SEARCH_CONSOLE_ENABLED: "true" },
    GoogleAuth: FakeGoogleAuth,
    fetchImpl: async () => ({ ok: true, status: 200, async json() { return {}; } }),
  });

  assert.equal(provider.name, "google-search-console");
  assert.equal(provider.credentialMode, "application-default-credentials");
});
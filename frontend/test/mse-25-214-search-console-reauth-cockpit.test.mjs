import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.214 indexation API preserves backend error payload", () => {
  const source = read("lib/indexation-api.js");

  assert.match(source, /error\.payload\s*=\s*payload/);
});

test("MSE-25.214 cockpit detects typed Search Console reauth errors", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.match(source, /SEARCH_CONSOLE_REAUTH_REQUIRED/);
  assert.match(source, /requiresSearchConsoleReauth/);
  assert.match(source, /setReauthRequired\(true\)/);
  assert.match(source, /Connexion Search Console expirée ou révoquée/);
});

test("MSE-25.214 cockpit exposes an explicit Search Console reconnect action", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.match(source, /SEARCH_CONSOLE_REAUTH_URL\s*=\s*["']\/api\/search-console\/auth["']/);
  assert.match(source, /Reconnecter Search Console/);
  assert.match(source, /href=\{SEARCH_CONSOLE_REAUTH_URL\}/);
});

test("MSE-25.214 reauth UX does not expose OAuth credentials", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.doesNotMatch(source, /refresh_token/i);
  assert.doesNotMatch(source, /client_secret/i);
  assert.doesNotMatch(source, /access_token/i);
});

test("MSE-25.214 keeps explicit approval and manual submission invariants", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.match(source, /Approbation explicite obligatoire/);
  assert.match(source, /Soumission automatique désactivée/);
  assert.match(source, /Approuver explicitement/);
  assert.match(source, /Soumettre à Google Search Console/);
});

test("MSE-25.214 provides dedicated reauth presentation", () => {
  const css = read("app/indexation/indexation.css");

  assert.match(css, /\.search-console-reauth/);
  assert.match(css, /\.search-console-reauth a/);
});

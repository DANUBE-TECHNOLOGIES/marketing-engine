import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path){return readFile(new URL(`../${path}`,import.meta.url),"utf8")}

test("Presence server actions keep explicit confirmation on campaign mutations", async()=>{
  const code=await source("app/presence/campaigns/actions.js");
  assert.match(code,/confirm:true/);
  assert.match(code,/\/execute/);
  assert.match(code,/\/verify/);
  assert.match(code,/report\/freeze/);
});

test("campaign detail exposes lifecycle controls without raw external URLs", async()=>{
  const code=await source("app/presence/campaigns/[campaignId]/page.js");
  assert.match(code,/Approuver/);
  assert.match(code,/Démarrer/);
  assert.match(code,/Exécuter les items figés/);
  assert.match(code,/Vérifier la propagation/);
  assert.doesNotMatch(code,/googleapis\.com/);
});

test("daily agency provider actions confirm observations and discovery spend", async()=>{
  const code=await source("app/presence/agency-provider-actions.js");
  assert.match(code,/\/observe/);
  assert.match(code,/discovery\/start/);
  assert.match(code,/confirm:true/);
});

test("agency provider page exposes canonical observed comparison and history", async()=>{
  const code=await source("app/presence/agencies/[agencyId]/providers/[providerKey]/page.js");
  assert.match(code,/Canonique/);
  assert.match(code,/Observé/);
  assert.match(code,/Historique des observations/);
  assert.match(code,/Découverte assistée/);
  assert.doesNotMatch(code,/googleapis\.com/);
});

test("Presence cockpit uses backend summary contract and links intervention details", async()=>{
  const code=await source("app/presence/page.js");
  assert.match(code,/summary\.agencies/);
  assert.match(code,/summary\.executableRemediations/);
  assert.match(code,/item\.priority/);
  assert.match(code,/\/presence\/agencies\//);
});

test("admin network links to Presence cockpit", async()=>{
  const code=await source("app/admin-network/page.js");
  assert.match(code,/Presence réseau/);
  assert.match(code,/\/presence/);
});

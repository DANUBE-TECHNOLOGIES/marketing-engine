import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path){return readFile(new URL(`../${path}`,import.meta.url),"utf8")}

test("Presence server actions keep explicit confirmation on mutations", async()=>{
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

test("admin network links to Presence cockpit", async()=>{
  const code=await source("app/admin-network/page.js");
  assert.match(code,/Presence réseau/);
  assert.match(code,/\/presence/);
});

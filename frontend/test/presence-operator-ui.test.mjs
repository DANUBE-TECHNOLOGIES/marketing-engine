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

test("daily agency provider actions confirm observations discovery and manual remediation", async()=>{
  const code=await source("app/presence/agency-provider-actions.js");
  assert.match(code,/\/observe/);
  assert.match(code,/discovery\/start/);
  assert.match(code,/discovery\/result/);
  assert.match(code,/candidateUrl/);
  assert.match(code,/confirmLowConfidence/);
  assert.match(code,/manual-remediation\/start/);
  assert.match(code,/manual-remediation\/verify/);
  assert.match(code,/confirm:true/);
});

test("agency provider page exposes discovery and guided remediation without claiming provider write", async()=>{
  const code=await source("app/presence/agencies/[agencyId]/providers/[providerKey]/page.js");
  assert.match(code,/Canonique/);
  assert.match(code,/Observé/);
  assert.match(code,/Historique des observations/);
  assert.match(code,/Candidats détectés/);
  assert.match(code,/reste en statut pending/);
  assert.match(code,/Sélectionner cette fiche/);
  assert.match(code,/Remédiation manuelle guidée/);
  assert.match(code,/Local Engine prépare l’action, mais n’écrit pas chez ce provider/);
  assert.match(code,/Recontrôler et clôturer si conforme/);
  assert.doesNotMatch(code,/googleapis\.com/);
});

test("Presence cockpit links deployment readiness pilot matrix and intervention details", async()=>{
  const code=await source("app/presence/page.js");
  assert.match(code,/summary\.agencies/);
  assert.match(code,/summary\.executableRemediations/);
  assert.match(code,/item\.priority/);
  assert.match(code,/\/presence\/agencies\//);
  assert.match(code,/\/presence\/matrix/);
  assert.match(code,/\/presence\/readiness/);
  assert.match(code,/\/presence\/pilot/);
});

test("deployment readiness UI shows migration catalog Google and discovery gates", async()=>{
  const code=await source("app/presence/readiness/page.js");
  assert.match(code,/deployment-readiness/);
  assert.match(code,/Migrations Presence/);
  assert.match(code,/Catalogue providers/);
  assert.match(code,/Couverture Google/);
  assert.match(code,/DataForSEO discovery/);
});

test("pilot UI is read-only and exposes go no-go criteria", async()=>{
  const code=await source("app/presence/pilot/page.js");
  assert.match(code,/\/api\/presence\/pilot\/preview/);
  assert.match(code,/GO/);
  assert.match(code,/NO-GO/);
  assert.match(code,/3 agences maximum/);
  assert.match(code,/aucun changement sensible nom\/adresse/);
  assert.match(code,/ne déclenche aucune écriture externe/);
  assert.doesNotMatch(code,/\/execute/);
});

test("provider matrix distinguishes conformity automation manual monitor and blocked states", async()=>{
  const code=await source("app/presence/matrix/page.js");
  assert.match(code,/Matrice Presence/);
  assert.match(code,/Automatisables/);
  assert.match(code,/Manuelles/);
  assert.match(code,/Surveillance/);
  assert.match(code,/Bloquées/);
  assert.match(code,/automationEligible/);
});

test("provider readiness UI exposes operational modes rather than theoretical capability", async()=>{
  const code=await source("app/presence/providers/page.js");
  assert.match(code,/Mode opérationnel/);
  assert.match(code,/API gérée/);
  assert.match(code,/Portail \/ correction manuelle/);
  assert.match(code,/Intégration bloquée/);
});

test("admin network links to Presence cockpit", async()=>{
  const code=await source("app/admin-network/page.js");
  assert.match(code,/Presence réseau/);
  assert.match(code,/\/presence/);
});

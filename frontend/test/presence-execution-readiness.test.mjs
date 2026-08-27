import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
async function source(path){return readFile(new URL(`../${path}`,import.meta.url),"utf8")}
test("execution readiness view exposes final no-go and governance drift without write action",async()=>{const code=await source("app/presence/campaigns/[campaignId]/execution-readiness/page.js");assert.match(code,/Dernier contrôle avant exécution/);assert.match(code,/EXÉCUTION AUTORISÉE/);assert.match(code,/EXÉCUTION BLOQUÉE/);assert.match(code,/Gouvernance rollout/);assert.match(code,/Policy figée/);assert.match(code,/Policy courante/);assert.match(code,/Lecture seule/);assert.match(code,/execution-readiness/);assert.doesNotMatch(code,/\/execute/);assert.doesNotMatch(code,/googleapis\.com/);});

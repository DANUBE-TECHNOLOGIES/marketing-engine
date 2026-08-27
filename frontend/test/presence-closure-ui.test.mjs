import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path){return readFile(new URL(`../${path}`,import.meta.url),"utf8")}

test("closure view separates code closure from runtime activation",async()=>{
  const code=await source("app/presence/closure/page.js");
  assert.match(code,/Verdict de clôture/);
  assert.match(code,/PRÊT À CLÔTURER/);
  assert.match(code,/CLÔTURE BLOQUÉE/);
  assert.match(code,/indépendant de l’activation immédiate des écritures Google/);
  assert.match(code,/Activation runtime/);
  assert.match(code,/Dette résiduelle non bloquante/);
  assert.match(code,/Invariants de sortie/);
  assert.match(code,/closure-readiness/);
  assert.match(code,/codeReadyForClosure/);
  assert.match(code,/activationBlockers/);
  assert.match(code,/residualDebt/);
  assert.doesNotMatch(code,/googleapis\.com/);
});

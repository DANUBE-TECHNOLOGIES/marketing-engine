"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
test("campaign execution readiness route is read-only and exposes governance diagnostics",()=>{const code=fs.readFileSync(path.join(__dirname,"campaign-routes.js"),"utf8");assert.match(code,/execution-readiness/);assert.match(code,/evaluatePilotExecutionGate/);assert.match(code,/externalWrite:\s*false/);assert.match(code,/executableNow/);assert.match(code,/governanceDiagnostic/);});

"use strict";
const BASE=(process.env.ACQUISITION_TELEMETRY_BASE_URL||"http://127.0.0.1:4000").replace(/\/$/,"");
async function main(){const r=await fetch(`${BASE}/api/leads/acquisition/funnel-analytics?days=30`);const b=await r.json();if(!r.ok||!b.ok)throw new Error(b.error||`HTTP ${r.status}`);console.log("MSE-25.212 TELEMETRY ANALYTICS PASS");console.log(`Agencies with telemetry: ${(b.agencies||[]).length}`)}
main().catch(e=>{console.error("MSE-25.212 TELEMETRY VALIDATION FAILED");console.error(e.stack||e);process.exit(1)});

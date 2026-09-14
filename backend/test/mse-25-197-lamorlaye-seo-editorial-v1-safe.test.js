"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","scripts","mse-25-197-lamorlaye-seo-editorial-v1-safe.js"),"utf8");
function has(v){assert.ok(source.includes(v),`missing contract token: ${v}`);}
test("targets Lamorlaye only and keeps media references",()=>{for(const v of ['"mondescale-lamorlaye"','normalize(site.agency?.city) !== "lamorlaye"','stephanieMediaKeys','imageAssetId','imageUrl'])has(v);assert.ok(!source.includes("updateMany({"));});
test("uses editorial control fingerprints instead of volatile agency rows",()=>{has("controlEditorialFingerprint(site)");has("controlsBefore");has("controlsAfter");assert.ok(!source.includes("agency:site.agency"));});
test("auto rolls back on post-write regression",()=>{for(const v of ["await restoreSnapshot(snapshot)","auto-rollback","validation post-écriture échouée"])has(v);});
test("preserves Lamorlaye topology and destinations",()=>{for(const v of ["routeFingerprint(fresh)","destinationFingerprint(fresh)","Destinations Lamorlaye"])has(v);});
test("carries approved local SEO content",()=>{for(const v of ["Agence de voyages à Lamorlaye | Mondescale","Billets d'avion et de train à Lamorlaye","Paris-Charles-de-Gaulle (CDG)","Paris-Orly (ORY)","Gouvieux","Chantilly","Coye-la-Forêt","Orry-la-Ville"])has(v);});
test("rollback archives the snapshot after restoration",()=>{for(const v of ["MSE_25_197_ROLLBACK","rolledback","archiveSnapshot"])has(v);});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");
const publicPartners = path.join(frontendRoot, "public/partners");
const backlogPath = path.join(sharedRoot, "partnerLogoBacklog.js");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [catalogueModule, backlogModule, cruiseModule, circuitModule, stayModule, longHaulModule, franceEuropeModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerCruiseLogoSources.js"),
  loadModule("partnerCircuitLogoSources.js"),
  loadModule("partnerStayLogoSources.js"),
  loadModule("partnerLongHaulLogoSources.js"),
  loadModule("partnerFranceEuropeLogoSources.js"),
]);

const registries = Object.freeze({
  croisieres: cruiseModule.PARTNER_CRUISE_LOGO_SOURCES || {},
  circuits: circuitModule.PARTNER_CIRCUIT_LOGO_SOURCES || {},
  sejours: stayModule.PARTNER_STAY_LOGO_SOURCES || {},
  "sur-mesure": longHaulModule.PARTNER_LONG_HAUL_LOGO_SOURCES || {},
  "france-europe": franceEuropeModule.PARTNER_FRANCE_EUROPE_LOGO_SOURCES || {},
});

const partnerArg = process.argv.find((arg) => arg.startsWith("--partner="));
const write = process.argv.includes("--write=true");
const partnerId = String(partnerArg?.split("=", 2)[1] || "").trim();

if (!partnerId || !/^[a-z0-9][a-z0-9-]*$/.test(partnerId)) {
  console.error(JSON.stringify({ ok: false, error: "missing-or-invalid --partner=<id>" }, null, 2));
  process.exit(2);
}

const partner = (catalogueModule.FULL_PARTNERS || []).find((item) => item.id === partnerId) || null;
if (!partner) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "partner-not-found-in-catalogue" }, null, 2));
  process.exit(2);
}

const backlog = (backlogModule.PARTNER_LOGO_BACKLOG || []).find((item) => item.id === partnerId) || null;
if (!backlog) {
  console.log(JSON.stringify({ ok: true, partnerId, changed: false, writeRequested: write, reason: "already-finalized" }, null, 2));
  process.exit(0);
}
if (backlog.state !== "source-vetted") {
  console.error(JSON.stringify({ ok: false, partnerId, error: "backlog-not-ready-for-finalization", backlogState: backlog.state }, null, 2));
  process.exit(2);
}

const source = registries[partner.category]?.[partnerId] || null;
if (!source || source.status !== "vetted-source") {
  console.error(JSON.stringify({ ok: false, partnerId, error: "registry-not-vetted", registryStatus: source?.status || null }, null, 2));
  process.exit(2);
}

const logoUrl = String(partner.logoUrl || "").trim();
if (!/^\/partners\/[a-z0-9][a-z0-9-]*\.(?:webp|svg)$/.test(logoUrl)) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "catalogue-logo-not-activated", logoUrl: logoUrl || null }, null, 2));
  process.exit(2);
}

const expectedPrefix = `/partners/${partnerId}.`;
if (!logoUrl.startsWith(expectedPrefix)) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "catalogue-logo-does-not-match-partner", logoUrl }, null, 2));
  process.exit(2);
}

const assetPath = path.join(frontendRoot, "public", logoUrl.slice(1));
if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size < 100) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "activated-public-asset-missing-or-invalid", assetPath: path.relative(frontendRoot, assetPath) }, null, 2));
  process.exit(2);
}

const backlogSource = fs.readFileSync(backlogPath, "utf8");
const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const linePattern = new RegExp(`^\\s*\\{\\s*id:\\s*"${escapedId}"[^\\n]*\\},\\s*\\n?`, "m");
if (!linePattern.test(backlogSource)) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "backlog-source-line-not-found" }, null, 2));
  process.exit(2);
}

const nextSource = backlogSource.replace(linePattern, "");
if (nextSource === backlogSource) throw new Error("finalization produced no backlog change");
if (write) fs.writeFileSync(backlogPath, nextSource, "utf8");

console.log(JSON.stringify({
  ok: true,
  partnerId,
  category: partner.category,
  logoUrl,
  assetPath: path.relative(frontendRoot, assetPath),
  sourceStatus: source.status,
  backlogState: backlog.state,
  changed: true,
  writeRequested: write,
  written: write,
  retainedSourceProvenance: true,
}, null, 2));

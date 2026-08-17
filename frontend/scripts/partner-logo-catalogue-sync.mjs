import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const cataloguePath = path.join(frontendRoot, "components/page-builder/shared/fullPartners.js");
const publicPartners = path.join(frontendRoot, "public/partners");

const partnerArg = process.argv.find((arg) => arg.startsWith("--partner="));
const write = process.argv.includes("--write=true");
const partnerId = String(partnerArg?.split("=", 2)[1] || "").trim();

if (!partnerId || !/^[a-z0-9][a-z0-9-]*$/.test(partnerId)) {
  console.error(JSON.stringify({ ok: false, error: "missing-or-invalid --partner=<id>" }, null, 2));
  process.exit(2);
}

const assets = ["webp", "svg"]
  .map((format) => ({ format, filePath: path.join(publicPartners, `${partnerId}.${format}`) }))
  .filter((item) => fs.existsSync(item.filePath));

if (assets.length !== 1) {
  console.error(JSON.stringify({
    ok: false,
    partnerId,
    error: assets.length ? "multiple-public-assets-found" : "public-asset-not-found",
    assets: assets.map((item) => path.relative(frontendRoot, item.filePath)),
  }, null, 2));
  process.exit(2);
}

const asset = assets[0];
const publicUrl = `/partners/${partnerId}.${asset.format}`;
const source = fs.readFileSync(cataloguePath, "utf8");
const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const linePattern = new RegExp(`^(\\s*)P\\("${escapedId}",([^\\n]*)\\),\\s*$`, "m");
const match = source.match(linePattern);

if (!match) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "partner-not-found-in-catalogue" }, null, 2));
  process.exit(2);
}

const currentLine = match[0];
if (currentLine.includes(publicUrl)) {
  console.log(JSON.stringify({ ok: true, partnerId, publicUrl, changed: false, writeRequested: write, reason: "already-synced" }, null, 2));
  process.exit(0);
}

const argsMatch = currentLine.match(/^(\s*)P\((.*)\),\s*$/);
if (!argsMatch) throw new Error("unable to parse partner catalogue line");
const args = argsMatch[2];

// FULL_PARTNERS keeps one P(...) call per line. logoUrl is the optional sixth argument.
// Replace an existing /partners/... value, otherwise append the acquired public asset.
let nextArgs;
if (/,[ ]*"\/partners\/[^"]+"[ ]*$/.test(args)) {
  nextArgs = args.replace(/,[ ]*"\/partners\/[^"]+"[ ]*$/, `, "${publicUrl}"`);
} else {
  nextArgs = `${args}, "${publicUrl}"`;
}
const nextLine = `${argsMatch[1]}P(${nextArgs}),`;
const nextSource = source.replace(linePattern, nextLine);

if (nextSource === source) throw new Error("catalogue sync produced no change");
if (write) fs.writeFileSync(cataloguePath, nextSource, "utf8");

console.log(JSON.stringify({
  ok: true,
  partnerId,
  publicUrl,
  assetPath: path.relative(frontendRoot, asset.filePath),
  changed: true,
  writeRequested: write,
  written: write,
  cataloguePath: path.relative(frontendRoot, cataloguePath),
}, null, 2));

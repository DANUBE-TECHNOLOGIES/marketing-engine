import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildLocalSearchNetworkReport, buildLocalSearchSnapshot } from "../lib/seo/local-search-network-measurement.js";
import { appendLocalSearchSnapshotHistory } from "../lib/seo/local-search-snapshot-history.js";

function argument(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function readJson(filePath, fallback = null, { allowMissing = false } = {}) {
  if (!filePath) return fallback;
  const resolved = path.resolve(filePath);
  if (allowMissing && !fs.existsSync(resolved)) return fallback;
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function writeJson(filePath, value) {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const agencies = Array.isArray(snapshot.agencies) ? snapshot.agencies : [];
  const alreadyMeasured = agencies.every((item) => item && typeof item === "object" && item.assessment);
  if (alreadyMeasured) return snapshot;
  return buildLocalSearchSnapshot({
    capturedAt: snapshot.capturedAt ?? null,
    period: snapshot.period ?? null,
    agencies,
  });
}

const currentPath = argument("current");
if (!currentPath) {
  console.error("Usage: node scripts/mse-25-118-local-search-report.mjs --current=snapshot.json [--baseline=snapshot.json] [--history=history.json] [--output=report.json]");
  process.exit(2);
}

const baselineSnapshot = normalizeSnapshot(readJson(argument("baseline"), null));
const currentSnapshot = normalizeSnapshot(readJson(currentPath));
const historyPath = argument("history");
const existingHistory = readJson(historyPath, [], { allowMissing: true });
const history = appendLocalSearchSnapshotHistory(existingHistory, currentSnapshot);
const report = buildLocalSearchNetworkReport({ baselineSnapshot, currentSnapshot });

const result = {
  generatedAt: new Date().toISOString(),
  baselineAvailable: Boolean(baselineSnapshot),
  report,
  historyCount: history.length,
  automatedPublicChangeAllowed: false,
  googleWriteAllowed: false,
};

writeJson(historyPath, history);
writeJson(argument("output"), result);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

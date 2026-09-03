import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const publicRoot = path.join(frontendRoot, "public");
const cataloguePath = path.join(
  frontendRoot,
  "components/page-builder/shared/fullPartners.js"
);
const verificationPath = path.join(
  frontendRoot,
  "components/page-builder/shared/partnerVerification.js"
);

async function importSource(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const catalogueModule = await importSource(cataloguePath);
const verificationModule = await importSource(verificationPath);
const FULL_PARTNERS = Array.isArray(catalogueModule.FULL_PARTNERS)
  ? catalogueModule.FULL_PARTNERS
  : [];
const getPartnerVerification =
  typeof verificationModule.getPartnerVerification === "function"
    ? verificationModule.getPartnerVerification
    : () => ({ status: "confirmed", reason: "Verification registry unavailable." });

const rows = FULL_PARTNERS.map((partner) => {
  const logoUrl = String(partner.logoUrl || "").trim();
  const relativePath = logoUrl.startsWith("/") ? logoUrl.slice(1) : logoUrl;
  const filePath = relativePath ? path.join(publicRoot, relativePath) : null;
  const exists = Boolean(filePath && fs.existsSync(filePath));
  const verification = getPartnerVerification(partner.id);
  const publicationBlocked = ["identity-review", "catalogue-excluded"].includes(
    verification.status
  );

  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    verificationStatus: verification.status,
    publicationBlocked,
    logoUrl: logoUrl || null,
    fileUrl: filePath ? pathToFileURL(filePath).href : null,
    state: publicationBlocked
      ? "not-actionable"
      : !logoUrl
        ? "missing"
        : exists
          ? "ready"
          : "broken-reference",
  };
});

const actionableRows = rows.filter((row) => !row.publicationBlocked);
const blockedRows = rows.filter((row) => row.publicationBlocked);

const summary = actionableRows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.state] += 1;
    return acc;
  },
  { total: 0, ready: 0, missing: 0, "broken-reference": 0 }
);

summary.coverage = summary.total
  ? Number((summary.ready / summary.total).toFixed(4))
  : 1;
summary.catalogueTotal = rows.length;
summary.notActionable = blockedRows.length;

const categories = [...new Set(actionableRows.map((row) => row.category))];
const payload = {
  policy: "individual-assets-only-publishable-partners",
  fallback: "initials",
  summary,
  byCategory: Object.fromEntries(
    categories.map((category) => {
      const categoryRows = actionableRows.filter((row) => row.category === category);
      const ready = categoryRows.filter((row) => row.state === "ready").length;
      return [
        category,
        {
          total: categoryRows.length,
          ready,
          missing: categoryRows.filter((row) => row.state === "missing").length,
          brokenReferences: categoryRows.filter((row) => row.state === "broken-reference").length,
          coverage: categoryRows.length
            ? Number((ready / categoryRows.length).toFixed(4))
            : 1,
        },
      ];
    })
  ),
  missing: actionableRows.filter((row) => row.state === "missing"),
  brokenReferences: actionableRows.filter((row) => row.state === "broken-reference"),
  notActionable: blockedRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    verificationStatus: row.verificationStatus,
  })),
};

console.log(JSON.stringify(payload, null, 2));

if (payload.brokenReferences.length) {
  process.exitCode = 2;
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [{ FULL_PARTNERS }, backlogModule, verificationModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerVerification.js"),
]);

const backlogById = new Map((backlogModule.PARTNER_LOGO_BACKLOG || []).map((item) => [item.id, item]));
const getPartnerVerification = verificationModule.getPartnerVerification;

const rows = FULL_PARTNERS
  .map((partner) => {
    const verification = getPartnerVerification(partner.id);
    const backlog = backlogById.get(partner.id) || null;
    const hasLogo = Boolean(String(partner.logoUrl || "").trim());
    const targetAsset = `/partners/${partner.id}.webp`;

    return {
      id: partner.id,
      name: partner.name,
      category: partner.category,
      hasLogo,
      currentLogoUrl: partner.logoUrl || null,
      verificationStatus: verification.status,
      backlogState: backlog?.state || null,
      sourceType: backlog?.sourceType || null,
      priority: backlog?.priority ?? 99,
      targetAsset,
      action:
        verification.status === "identity-review"
          ? "hold-identity-review"
          : hasLogo
            ? "done"
            : verification.status === "asset-permission-review" || backlog?.state === "permission-required"
              ? "hold-permission-review"
              : "acquire-official-asset",
    };
  })
  .sort((a, b) => a.priority - b.priority || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const actionable = rows.filter((row) => row.action === "acquire-official-asset");
const permissionReview = rows.filter((row) => row.action === "hold-permission-review");
const identityReview = rows.filter((row) => row.action === "hold-identity-review");
const done = rows.filter((row) => row.action === "done");

const byCategory = Object.fromEntries(
  [...new Set(rows.map((row) => row.category))].map((category) => {
    const categoryRows = rows.filter((row) => row.category === category);
    return [category, {
      total: categoryRows.length,
      done: categoryRows.filter((row) => row.action === "done").length,
      actionable: categoryRows.filter((row) => row.action === "acquire-official-asset").length,
      permissionReview: categoryRows.filter((row) => row.action === "hold-permission-review").length,
      identityReview: categoryRows.filter((row) => row.action === "hold-identity-review").length,
    }];
  })
);

console.log(JSON.stringify({
  policy: "official-individual-webp-assets-only",
  naming: "/partners/<partner-id>.webp",
  summary: {
    total: rows.length,
    done: done.length,
    actionable: actionable.length,
    permissionReview: permissionReview.length,
    identityReview: identityReview.length,
  },
  byCategory,
  actionable,
  permissionReview,
  identityReview,
}, null, 2));

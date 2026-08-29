#!/usr/bin/env node
"use strict";

const siteSlug = process.env.MSE_25_91_PROBE_SITE_SLUG || "ambassade-fram-mondescale-bois-colombes";
const backendOrigin = String(process.env.MSE_25_91_BACKEND_ORIGIN || "http://127.0.0.1:4000").replace(/\/+$/, "");
const tenantSlug = process.env.MSE_25_91_TENANT_SLUG || "mondescale";

const TEAM_TYPES = new Set(["team", "equipe", "team-grid", "equipe-grid"]);
const COLLECTION_KEYS = ["members", "items", "team", "teamMembers", "people", "staff", "advisors", "consultants"];

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstUrl(member) {
  const values = [
    typeof member?.image === "string" ? member.image : "",
    member?.imageUrl,
    typeof member?.photo === "string" ? member.photo : "",
    member?.photoUrl,
    typeof member?.avatar === "string" ? member.avatar : "",
    member?.avatarUrl,
    typeof member?.portrait === "string" ? member.portrait : "",
    member?.portraitUrl,
    member?.photoAsset?.publicUrl,
    member?.photoAsset?.url,
    member?.portraitAsset?.publicUrl,
    member?.portraitAsset?.url,
    member?.profilePhoto?.publicUrl,
    member?.profilePhoto?.url,
    member?.profilePhotoUrl,
    member?.profileImage?.publicUrl,
    member?.profileImage?.url,
    member?.profileImageUrl,
    member?.picture?.publicUrl,
    member?.picture?.url,
    member?.pictureUrl,
    member?.media?.publicUrl,
    member?.media?.url,
  ];
  return values.map(clean).find(Boolean) || "";
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function teamCollections(content) {
  return COLLECTION_KEYS.filter((key) => Array.isArray(content?.[key]));
}

async function main() {
  const response = await fetch(`${backendOrigin}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}`, {
    headers: {
      accept: "application/json",
      "x-tenant-slug": tenantSlug,
    },
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let contract;
  try {
    contract = JSON.parse(text);
  } catch {
    throw new Error(`public contract returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`public contract returned HTTP ${response.status}: ${contract?.error || contract?.message || "unknown"}`);
  }

  const diagnostics = [];
  let teamBlocks = 0;
  let members = 0;
  let membersWithImage = 0;

  for (const page of Array.isArray(contract?.pages) ? contract.pages : []) {
    for (const block of Array.isArray(page?.blocks) ? page.blocks : []) {
      const type = blockType(block);
      if (!TEAM_TYPES.has(type)) continue;
      teamBlocks += 1;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      const collections = teamCollections(content);

      if (!collections.length) {
        diagnostics.push({ page: page.slug, blockType: type, issue: "no-team-collection", contentKeys: Object.keys(content).sort() });
        continue;
      }

      for (const key of collections) {
        for (const member of content[key]) {
          members += 1;
          const image = firstUrl(member);
          if (image) membersWithImage += 1;
          else {
            diagnostics.push({
              page: page.slug,
              blockType: type,
              collection: key,
              member: member?.name || member?.title || member?.id || "unknown",
              issue: "portrait-missing",
              memberKeys: member && typeof member === "object" ? Object.keys(member).sort() : [],
            });
          }
        }
      }
    }
  }

  console.log(`TEAM_BLOCKS=${teamBlocks}`);
  console.log(`TEAM_MEMBERS=${members}`);
  console.log(`TEAM_MEMBERS_WITH_IMAGE=${membersWithImage}`);

  if (diagnostics.length) {
    console.log("TEAM_DIAGNOSTICS=" + JSON.stringify(diagnostics));
  }

  if (teamBlocks === 0) throw new Error("no public team block found for probe site");
  if (members === 0) throw new Error("public team blocks contain no members");
  if (membersWithImage !== members) {
    throw new Error(`public team portrait contract incomplete: ${membersWithImage}/${members}`);
  }

  console.log("TEAM_PUBLIC_CONTRACT=OK");
}

main().catch((error) => {
  console.error(`TEAM_PUBLIC_CONTRACT=FAIL ${error.message}`);
  process.exit(1);
});

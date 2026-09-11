"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.209";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const EXPECTED_TENANT_ID = "tenant_mondescale";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske";
const EXPECTED_PROFILE_NAME = "Profil juridique agence 8";
const TARGET_SITE_SLUG = "tui-store-melun";
const SOURCE_TOKEN = "Ambassade FRAM - Mondescale Maurepas";
const TARGET_TOKEN = "SAS DANUBE";
const SOURCE_FRAGMENT = "Le ciblage publicitaire par Ambassade FRAM - Mondescale Maurepas via les réseaux sociaux ou bien par newsletter/SMS";
const TARGET_FRAGMENT = "Le ciblage publicitaire par SAS DANUBE via les réseaux sociaux ou bien par newsletter/SMS";
const APPLY = String(process.env.MSE_25_209_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_209_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_209_SNAPSHOT || "/var/tmp/mse-25-209-melun-legal-profile-grounding-v1.snapshot.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function countExact(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = String(haystack || "").indexOf(needle, offset);
    if (index === -1) break;
    count += 1;
    offset = index + needle.length;
  }
  return count;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function protectedShape(profile) {
  return {
    id: profile.id,
    tenantId: profile.tenantId,
    agencyId: profile.agencyId,
    name: profile.name,
    legalName: profile.legalName,
    legalForm: profile.legalForm,
    shareCapital: profile.shareCapital,
    registeredOffice: profile.registeredOffice,
    registrationNumber: profile.registrationNumber,
    vatNumber: profile.vatNumber,
    travelRegistration: profile.travelRegistration,
    financialGuarantee: profile.financialGuarantee,
    professionalInsurance: profile.professionalInsurance,
    publicationDirector: profile.publicationDirector,
    hostingProvider: profile.hostingProvider,
    hostingAddress: profile.hostingAddress,
    hostingPhone: profile.hostingPhone,
    dataController: profile.dataController,
    privacyContactEmail: profile.privacyContactEmail,
    dataProtectionOfficer: profile.dataProtectionOfficer,
    mediatorName: profile.mediatorName,
    mediatorAddress: profile.mediatorAddress,
    mediatorWebsite: profile.mediatorWebsite,
    legalNoticeContent: "__TARGET__",
    privacyPolicyContent: profile.privacyPolicyContent,
    cookiePolicyContent: profile.cookiePolicyContent,
    termsContent: profile.termsContent,
    effectiveDate: profile.effectiveDate ? new Date(profile.effectiveDate).toISOString() : null,
    settings: profile.settings,
    isDefault: profile.isDefault,
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
  };
}

function protectedFingerprint(profile) {
  return hash(protectedShape(profile));
}

async function loadContext() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable: ${TENANT_SLUG}`);

  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    select: { id: true, slug: true, agencyId: true, basePath: true, status: true },
  });

  const profile = await prisma.legalProfile.findUnique({
    where: {
      tenantId_agencyId: {
        tenantId: tenant.id,
        agencyId: EXPECTED_AGENCY_ID,
      },
    },
  });

  return { tenant, site, profile };
}

function assertContext({ tenant, site, profile }, { allowAlreadyApplied = false } = {}) {
  if (tenant.id !== EXPECTED_TENANT_ID) {
    throw new Error(`${CONTRACT}: tenantId inattendu: ${tenant.id}`);
  }
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: siteSlug inattendu`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) {
    throw new Error(`${CONTRACT}: agencyId du site inattendu: ${site.agencyId}`);
  }
  if (!profile) throw new Error(`${CONTRACT}: profil juridique Melun introuvable`);
  if (profile.id !== EXPECTED_PROFILE_ID) {
    throw new Error(`${CONTRACT}: profileId inattendu: ${profile.id}`);
  }
  if (Number(profile.agencyId) !== EXPECTED_AGENCY_ID) {
    throw new Error(`${CONTRACT}: agencyId du profil inattendu: ${profile.agencyId}`);
  }
  if (profile.name !== EXPECTED_PROFILE_NAME) {
    throw new Error(`${CONTRACT}: nom du profil inattendu: ${profile.name}`);
  }

  const legal = String(profile.legalNoticeContent || "");
  const sourceCount = countExact(legal, SOURCE_FRAGMENT);
  const sourceTokenCount = countExact(legal, SOURCE_TOKEN);
  const targetCount = countExact(legal, TARGET_FRAGMENT);

  if (allowAlreadyApplied && sourceCount === 0 && sourceTokenCount === 0 && targetCount === 1) {
    return;
  }

  if (sourceCount !== 1) {
    throw new Error(`${CONTRACT}: occurrence source attendue=1, observée=${sourceCount}`);
  }
  if (sourceTokenCount !== 1) {
    throw new Error(`${CONTRACT}: token Maurepas attendu=1, observé=${sourceTokenCount}`);
  }
  if (targetCount !== 0) {
    throw new Error(`${CONTRACT}: fragment cible déjà présent (${targetCount})`);
  }
}

function buildUpdatedLegalNotice(profile) {
  const current = String(profile.legalNoticeContent || "");
  return current.replace(SOURCE_FRAGMENT, TARGET_FRAGMENT);
}

function snapshotPayload(context) {
  return {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    tenant: { id: context.tenant.id, slug: context.tenant.slug },
    site: clone(context.site),
    profile: {
      id: context.profile.id,
      tenantId: context.profile.tenantId,
      agencyId: context.profile.agencyId,
      name: context.profile.name,
      legalNoticeContent: context.profile.legalNoticeContent,
      protectedFingerprint: protectedFingerprint(context.profile),
      updatedAt: context.profile.updatedAt ? new Date(context.profile.updatedAt).toISOString() : null,
    },
  };
}

function writeSnapshot(context) {
  const snapshot = snapshotPayload(context);
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  return snapshot;
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(`${CONTRACT}: snapshot introuvable: ${SNAPSHOT_PATH}`);
  }
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot?.contract !== CONTRACT) throw new Error(`${CONTRACT}: snapshot d'un autre contrat`);
  if (snapshot?.tenant?.id !== EXPECTED_TENANT_ID) throw new Error(`${CONTRACT}: tenant snapshot inattendu`);
  if (snapshot?.site?.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: site snapshot inattendu`);
  if (Number(snapshot?.site?.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId snapshot inattendu`);
  if (snapshot?.profile?.id !== EXPECTED_PROFILE_ID) throw new Error(`${CONTRACT}: profileId snapshot inattendu`);
  if (Number(snapshot?.profile?.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: profile agencyId snapshot inattendu`);
  if (countExact(snapshot?.profile?.legalNoticeContent, SOURCE_FRAGMENT) !== 1) {
    throw new Error(`${CONTRACT}: snapshot ne contient pas exactement la source attendue`);
  }
  return snapshot;
}

async function rollback() {
  const snapshot = loadSnapshot();
  const current = await loadContext();

  if (!current.profile) throw new Error(`${CONTRACT}: profil courant introuvable`);
  if (current.profile.id !== EXPECTED_PROFILE_ID) throw new Error(`${CONTRACT}: profileId courant inattendu`);
  if (protectedFingerprint(current.profile) !== snapshot.profile.protectedFingerprint) {
    throw new Error(`${CONTRACT}: état protégé différent du snapshot, rollback refusé`);
  }

  await prisma.legalProfile.update({
    where: { id: EXPECTED_PROFILE_ID },
    data: { legalNoticeContent: snapshot.profile.legalNoticeContent },
  });

  const after = await loadContext();
  if (after.profile.legalNoticeContent !== snapshot.profile.legalNoticeContent) {
    throw new Error(`${CONTRACT}: rollback non vérifié`);
  }

  return {
    contract: CONTRACT,
    mode: "ROLLBACK",
    target: TARGET_SITE_SLUG,
    profileId: EXPECTED_PROFILE_ID,
    agencyId: EXPECTED_AGENCY_ID,
    snapshot: SNAPSHOT_PATH,
    mutationPerformed: true,
    restoredSourceCount: countExact(after.profile.legalNoticeContent, SOURCE_FRAGMENT),
    maurepasTokenCount: countExact(after.profile.legalNoticeContent, SOURCE_TOKEN),
  };
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error(`${CONTRACT}: APPLY et ROLLBACK sont mutuellement exclusifs`);
  if (ROLLBACK) return rollback();

  const before = await loadContext();
  assertContext(before, { allowAlreadyApplied: !APPLY });

  const beforeProtected = protectedFingerprint(before.profile);
  const currentLegal = String(before.profile.legalNoticeContent || "");
  const alreadyApplied = countExact(currentLegal, SOURCE_FRAGMENT) === 0 && countExact(currentLegal, TARGET_FRAGMENT) === 1;
  const afterLegal = alreadyApplied ? currentLegal : buildUpdatedLegalNotice(before.profile);

  const plan = {
    sourceFragmentCount: countExact(currentLegal, SOURCE_FRAGMENT),
    sourceTokenCount: countExact(currentLegal, SOURCE_TOKEN),
    targetFragmentCountBefore: countExact(currentLegal, TARGET_FRAGMENT),
    targetFragmentCountAfter: countExact(afterLegal, TARGET_FRAGMENT),
    legalNoticeLengthBefore: currentLegal.length,
    legalNoticeLengthAfter: afterLegal.length,
    privacyPolicyContent: before.profile.privacyPolicyContent,
    termsContent: before.profile.termsContent,
  };

  if (!APPLY) {
    return {
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      profileId: before.profile.id,
      agencyId: before.profile.agencyId,
      profileName: before.profile.name,
      protectedFingerprint: beforeProtected,
      plan,
      mutationPerformed: false,
    };
  }

  const snapshot = writeSnapshot(before);

  try {
    await prisma.legalProfile.update({
      where: { id: EXPECTED_PROFILE_ID },
      data: { legalNoticeContent: afterLegal },
    });

    const after = await loadContext();
    assertContext(after, { allowAlreadyApplied: true });

    if (protectedFingerprint(after.profile) !== beforeProtected) {
      throw new Error(`${CONTRACT}: un champ protégé du profil juridique a changé`);
    }
    if (countExact(after.profile.legalNoticeContent, SOURCE_TOKEN) !== 0) {
      throw new Error(`${CONTRACT}: la référence Maurepas subsiste après APPLY`);
    }
    if (countExact(after.profile.legalNoticeContent, SOURCE_FRAGMENT) !== 0) {
      throw new Error(`${CONTRACT}: le fragment source subsiste après APPLY`);
    }
    if (countExact(after.profile.legalNoticeContent, TARGET_FRAGMENT) !== 1) {
      throw new Error(`${CONTRACT}: le fragment SAS DANUBE attendu n'est pas unique`);
    }

    return {
      contract: CONTRACT,
      mode: "APPLY",
      target: TARGET_SITE_SLUG,
      profileId: after.profile.id,
      agencyId: after.profile.agencyId,
      protectedFingerprint: beforeProtected,
      snapshot: SNAPSHOT_PATH,
      legalNoticeWrites: 1,
      otherFieldWrites: 0,
      maurepasTokenCount: 0,
      targetFragmentCount: 1,
      privacyPolicyContentUnchanged: after.profile.privacyPolicyContent === before.profile.privacyPolicyContent,
      termsContentUnchanged: after.profile.termsContent === before.profile.termsContent,
      mutationPerformed: true,
    };
  } catch (error) {
    await prisma.legalProfile.update({
      where: { id: EXPECTED_PROFILE_ID },
      data: { legalNoticeContent: snapshot.profile.legalNoticeContent },
    });
    throw error;
  }
}

main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = {
  CONTRACT,
  EXPECTED_AGENCY_ID,
  EXPECTED_PROFILE_ID,
  EXPECTED_PROFILE_NAME,
  SOURCE_FRAGMENT,
  SOURCE_TOKEN,
  TARGET_FRAGMENT,
  TARGET_SITE_SLUG,
  TARGET_TOKEN,
  buildUpdatedLegalNotice,
  countExact,
  protectedFingerprint,
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONTRACT = 'MSE-25.235';
const CONFIRM_ENV = 'MSE_25_235_CONFIRM';
const SNAPSHOT_ENV = 'MSE_25_235_SNAPSHOT';
const DEFAULT_SNAPSHOT = '/app/runtime-snapshots/mse-25-235-network-authoritative-geocoordinates-v1.snapshot.json';

const TARGETS = [
  {
    siteId: 'cms8n8b5v003vn91af2wlyks9',
    slug: 'ambassade-fram-mondescale-nevers',
    agencyId: 2,
    expectedAddressMarker: '7 Rue etienne Litaud',
    latitude: 46.99449,
    longitude: 3.16008,
    confidence: 'AUTHORITATIVE_RETAIL_SITE'
  },
  {
    siteId: 'cms8n8ekq00bjn91aw58um45w',
    slug: 'ambassade-fram-mondescale-gien',
    agencyId: 4,
    expectedAddressMarker: '12 Rue Gambetta',
    latitude: 47.684353,
    longitude: 2.631085,
    confidence: 'AUTHORITATIVE_POI'
  },
  {
    siteId: 'cms8n8gzt00fdn91akx6kbjjn',
    slug: 'ambassade-fram-mondescale-bois-colombes',
    agencyId: 6,
    expectedAddressMarker: '41 Rue des Bourguignons',
    latitude: 48.91398,
    longitude: 2.273679,
    confidence: 'AUTHORITATIVE_POI'
  },
  {
    siteId: 'cms8n8pu600qvn91a6bo0gx6v',
    slug: 'tui-store-amilly',
    agencyId: 9,
    expectedAddressMarker: 'Centre commercial Antibes',
    latitude: 47.97481,
    longitude: 2.73652,
    confidence: 'AUTHORITATIVE_POI'
  }
];

const PROTECTED = [
  {
    siteId: 'cms8n8jdu00j7n91axodw128b',
    slug: 'mondescale-lamorlaye',
    agencyId: 7
  }
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = canonicalize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function asNumber(value) {
  return value == null ? null : Number(value);
}

function sameNumber(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return Number(a) === Number(b);
}

async function readState(client) {
  const rows = [];

  for (const target of TARGETS) {
    const site = await client.agencySite.findUnique({
      where: { id: target.siteId },
      include: { agency: true }
    });

    if (!site) throw new Error(`Target site ${target.siteId} not found`);
    if (site.slug !== target.slug) throw new Error(`Unexpected slug for ${target.siteId}: ${site.slug}`);
    if (site.agencyId !== target.agencyId) throw new Error(`Unexpected agencyId for ${target.slug}: ${site.agencyId}`);
    if (!site.agency) throw new Error(`Agency relation missing for ${target.slug}`);

    const address = site.agency.address || '';
    if (!address.includes(target.expectedAddressMarker)) {
      throw new Error(`Address guard failed for ${target.slug}: expected marker '${target.expectedAddressMarker}', got '${address}'`);
    }

    const currentLatitude = asNumber(site.agency.latitude);
    const currentLongitude = asNumber(site.agency.longitude);

    if (currentLatitude !== null || currentLongitude !== null) {
      const alreadyExpected = sameNumber(currentLatitude, target.latitude) && sameNumber(currentLongitude, target.longitude);
      if (!alreadyExpected) {
        throw new Error(
          `Existing coordinates guard failed for ${target.slug}: current=${currentLatitude},${currentLongitude} expected=${target.latitude},${target.longitude}`
        );
      }
    }

    rows.push({
      siteId: site.id,
      siteSlug: site.slug,
      agencyId: site.agencyId,
      agencyName: site.agency.name || null,
      address: site.agency.address || null,
      currentLatitude,
      currentLongitude,
      targetLatitude: target.latitude,
      targetLongitude: target.longitude,
      confidence: target.confidence
    });
  }

  for (const protectedTarget of PROTECTED) {
    const site = await client.agencySite.findUnique({
      where: { id: protectedTarget.siteId },
      include: { agency: true }
    });
    if (!site) throw new Error(`Protected site ${protectedTarget.siteId} not found`);
    if (site.slug !== protectedTarget.slug || site.agencyId !== protectedTarget.agencyId) {
      throw new Error(`Protected-site identity guard failed for ${protectedTarget.siteId}`);
    }
  }

  return rows;
}

async function readProtectedState(client) {
  const rows = [];
  for (const target of PROTECTED) {
    const site = await client.agencySite.findUnique({
      where: { id: target.siteId },
      include: { agency: true }
    });
    rows.push({
      siteId: site.id,
      siteSlug: site.slug,
      agencyId: site.agencyId,
      latitude: asNumber(site.agency?.latitude),
      longitude: asNumber(site.agency?.longitude),
      address: site.agency?.address || null
    });
  }
  return rows;
}

async function main() {
  const apply = process.env[CONFIRM_ENV] === 'true';
  const snapshotPath = process.env[SNAPSHOT_ENV] || DEFAULT_SNAPSHOT;

  const rows = await readState(prisma);
  const protectedBefore = await readProtectedState(prisma);
  const originalGuardFingerprint = fingerprint({ rows, protectedBefore });

  const pendingExternalVerification = [
    'ambassade-fram-mondescale-maurepas',
    'ambassade-fram-mondescale-dax',
    'ambassade-fram-mondescale-ozoir-la-ferriere'
  ];

  const plan = rows.map(row => ({
    siteSlug: row.siteSlug,
    agencyId: row.agencyId,
    operation: sameNumber(row.currentLatitude, row.targetLatitude) && sameNumber(row.currentLongitude, row.targetLongitude)
      ? 'NOOP_ALREADY_EXPECTED'
      : 'SET_AUTHORITATIVE_GEOCOORDINATES',
    from: {
      latitude: row.currentLatitude,
      longitude: row.currentLongitude
    },
    to: {
      latitude: row.targetLatitude,
      longitude: row.targetLongitude
    },
    confidence: row.confidence
  }));

  const writes = plan.filter(item => item.operation === 'SET_AUTHORITATIVE_GEOCOORDINATES').length;

  if (!apply) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      scope: 'NETWORK_AUTHORITATIVE_GEOCOORDINATES',
      mode: 'DRY_RUN',
      mutationPerformed: false,
      targetSites: TARGETS.length,
      agencyWrites: writes,
      routeWrites: 0,
      pageWrites: 0,
      blockWrites: 0,
      protectedSites: PROTECTED.map(item => item.slug),
      protectedWrites: 0,
      pendingExternalVerification,
      guardFingerprint: originalGuardFingerprint,
      plan
    }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify({
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    guardFingerprint: originalGuardFingerprint,
    targets: rows,
    protected: protectedBefore
  }, null, 2));

  await prisma.$transaction(async tx => {
    const currentRows = await readState(tx);
    const currentProtected = await readProtectedState(tx);
    const currentFingerprint = fingerprint({ rows: currentRows, protectedBefore: currentProtected });

    if (currentFingerprint !== originalGuardFingerprint) {
      throw new Error(`Concurrent change detected: ${currentFingerprint} != ${originalGuardFingerprint}`);
    }

    for (const target of TARGETS) {
      const row = currentRows.find(item => item.agencyId === target.agencyId);
      const alreadyExpected = sameNumber(row.currentLatitude, target.latitude) && sameNumber(row.currentLongitude, target.longitude);
      if (alreadyExpected) continue;

      await tx.agency.update({
        where: { id: target.agencyId },
        data: {
          latitude: target.latitude,
          longitude: target.longitude
        }
      });
    }
  });

  const afterRows = await readState(prisma);
  const protectedAfter = await readProtectedState(prisma);

  for (const target of TARGETS) {
    const row = afterRows.find(item => item.agencyId === target.agencyId);
    if (!row) throw new Error(`Post-apply target missing for agency ${target.agencyId}`);
    if (!sameNumber(row.currentLatitude, target.latitude) || !sameNumber(row.currentLongitude, target.longitude)) {
      throw new Error(`Post-apply coordinate validation failed for ${target.slug}`);
    }
  }

  if (fingerprint(protectedAfter) !== fingerprint(protectedBefore)) {
    throw new Error('Protected Lamorlaye state changed unexpectedly');
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    scope: 'NETWORK_AUTHORITATIVE_GEOCOORDINATES',
    mode: 'APPLY',
    mutationPerformed: writes > 0,
    targetSites: TARGETS.length,
    agencyWrites: writes,
    routeWrites: 0,
    pageWrites: 0,
    blockWrites: 0,
    protectedSites: PROTECTED.map(item => item.slug),
    protectedWrites: 0,
    pendingExternalVerification,
    originalGuardFingerprint,
    snapshot: snapshotPath,
    applied: afterRows.map(row => ({
      siteSlug: row.siteSlug,
      agencyId: row.agencyId,
      latitude: row.currentLatitude,
      longitude: row.currentLongitude,
      confidence: row.confidence
    }))
  }, null, 2));
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

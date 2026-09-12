const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONTRACT = 'MSE-25.236';
const CONFIRM_ENV = 'MSE_25_236_CONFIRM';
const SNAPSHOT_ENV = 'MSE_25_236_SNAPSHOT';
const DEFAULT_SNAPSHOT = '/app/runtime-snapshots/mse-25-236-remaining-agency-geocoordinates-v1.snapshot.json';

const TARGETS = [
  {
    agencyId: 1,
    siteId: 'cms8n89kc0001n91a7c5eiz9w',
    slug: 'ambassade-fram-mondescale-maurepas',
    addressMarker: '6 place du sancerrois',
    latitude: 48.7618955,
    longitude: 1.9441889,
    confidence: 'AUTHORITATIVE_OSM_TRAVEL_AGENCY_POI',
    osmType: 'node',
    osmId: '13202421052'
  },
  {
    agencyId: 3,
    siteId: 'cms8n8cqz007pn91a2oipxuul',
    slug: 'ambassade-fram-mondescale-dax',
    addressMarker: '7 bis avenue eugéne milliès lacroix',
    latitude: 43.7107186,
    longitude: -1.0565494,
    confidence: 'AUTHORITATIVE_OSM_TRAVEL_AGENCY_POI',
    osmType: 'node',
    osmId: '13202552595'
  },
  {
    agencyId: 5,
    siteId: 'cmruz4srj0001n91bvfpsrh1f',
    slug: 'ambassade-fram-mondescale-ozoir-la-ferriere',
    addressMarker: '61 avenue du général de gaulle',
    latitude: 48.7623670,
    longitude: 2.6688323,
    confidence: 'AUTHORITATIVE_OSM_TRAVEL_AGENCY_POI',
    osmType: 'node',
    osmId: '4995106790'
  }
];

const PROTECTED = {
  agencyId: 7,
  siteId: 'cms8n8jdu00j7n91axodw128b',
  slug: 'mondescale-lamorlaye'
};

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

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function normalizeAddress(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sameCoordinate(a, b) {
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.0000001;
}

async function readTargetState(client) {
  const rows = [];
  for (const target of TARGETS) {
    const site = await client.agencySite.findUnique({ where: { id: target.siteId }, include: { agency: true } });
    if (!site) throw new Error(`Target site ${target.siteId} not found`);
    if (site.slug !== target.slug) throw new Error(`Unexpected slug for ${target.siteId}: ${site.slug}`);
    if (site.agencyId !== target.agencyId) throw new Error(`Unexpected agencyId for ${target.slug}: ${site.agencyId}`);
    if (!site.agency) throw new Error(`Agency missing for ${target.slug}`);
    const actualAddress = normalizeAddress(site.agency.address);
    const expectedAddress = normalizeAddress(target.addressMarker);
    if (actualAddress !== expectedAddress) throw new Error(`Address guard failed for ${target.slug}: '${site.agency.address}'`);
    if (site.agency.latitude != null || site.agency.longitude != null) {
      throw new Error(`Existing coordinate guard failed for ${target.slug}: ${site.agency.latitude}, ${site.agency.longitude}`);
    }
    rows.push({
      agencyId: site.agencyId,
      siteId: site.id,
      slug: site.slug,
      address: site.agency.address,
      latitude: site.agency.latitude == null ? null : Number(site.agency.latitude),
      longitude: site.agency.longitude == null ? null : Number(site.agency.longitude)
    });
  }
  return rows;
}

async function readProtectedState(client) {
  const site = await client.agencySite.findUnique({ where: { id: PROTECTED.siteId }, include: { agency: true } });
  if (!site) throw new Error('Protected Lamorlaye site missing');
  if (site.slug !== PROTECTED.slug || site.agencyId !== PROTECTED.agencyId) throw new Error('Protected Lamorlaye identity mismatch');
  return {
    siteId: site.id,
    slug: site.slug,
    agencyId: site.agencyId,
    agency: site.agency
  };
}

async function main() {
  const apply = process.env[CONFIRM_ENV] === 'true';
  const snapshotPath = process.env[SNAPSHOT_ENV] || DEFAULT_SNAPSHOT;
  const rows = await readTargetState(prisma);
  const protectedBefore = await readProtectedState(prisma);
  const guardFingerprint = fingerprint({ rows, protectedBefore });
  const plan = TARGETS.map(target => ({
    agencyId: target.agencyId,
    siteSlug: target.slug,
    operation: 'SET_AUTHORITATIVE_GEOCOORDINATES',
    latitude: target.latitude,
    longitude: target.longitude,
    confidence: target.confidence,
    source: { provider: 'OpenStreetMap', osmType: target.osmType, osmId: target.osmId }
  }));

  if (!apply) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      scope: 'REMAINING_AGENCY_GEOCOORDINATES',
      mode: 'DRY_RUN',
      mutationPerformed: false,
      targetSites: TARGETS.length,
      agencyWrites: TARGETS.length,
      routeWrites: 0,
      pageWrites: 0,
      blockWrites: 0,
      protectedSites: [PROTECTED.slug],
      protectedWrites: 0,
      guardFingerprint,
      plan
    }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify({ contract: CONTRACT, createdAt: new Date().toISOString(), guardFingerprint, targets: rows, protected: protectedBefore }, null, 2));

  await prisma.$transaction(async tx => {
    const currentRows = await readTargetState(tx);
    const currentProtected = await readProtectedState(tx);
    const currentFingerprint = fingerprint({ rows: currentRows, protectedBefore: currentProtected });
    if (currentFingerprint !== guardFingerprint) throw new Error(`Concurrent change detected: ${currentFingerprint} != ${guardFingerprint}`);

    for (const target of TARGETS) {
      await tx.agency.update({
        where: { id: target.agencyId },
        data: { latitude: target.latitude, longitude: target.longitude }
      });
    }
  });

  const verification = [];
  for (const target of TARGETS) {
    const site = await prisma.agencySite.findUnique({ where: { id: target.siteId }, include: { agency: true } });
    const valid = site && site.slug === target.slug && site.agencyId === target.agencyId && sameCoordinate(site.agency?.latitude, target.latitude) && sameCoordinate(site.agency?.longitude, target.longitude);
    verification.push({ agencyId: target.agencyId, slug: target.slug, latitude: site?.agency?.latitude == null ? null : Number(site.agency.latitude), longitude: site?.agency?.longitude == null ? null : Number(site.agency.longitude), valid });
  }

  const protectedAfter = await readProtectedState(prisma);
  const protectedUnchanged = fingerprint(protectedAfter) === fingerprint(protectedBefore);
  if (!verification.every(row => row.valid)) throw new Error('Post-apply target coordinate verification failed');
  if (!protectedUnchanged) throw new Error('Protected Lamorlaye state changed');

  console.log(JSON.stringify({
    contract: CONTRACT,
    scope: 'REMAINING_AGENCY_GEOCOORDINATES',
    mode: 'APPLY',
    mutationPerformed: true,
    targetSites: TARGETS.length,
    agencyWrites: TARGETS.length,
    routeWrites: 0,
    pageWrites: 0,
    blockWrites: 0,
    protectedSites: [PROTECTED.slug],
    protectedWrites: 0,
    originalGuardFingerprint: guardFingerprint,
    snapshot: snapshotPath,
    protectedUnchanged,
    allValid: verification.every(row => row.valid),
    verification
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

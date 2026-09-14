"use strict";

const fs = require("node:fs");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.214";
const APPLY = process.env.MSE_25_214_CONFIRM === "true";
const ROLLBACK = process.env.MSE_25_214_ROLLBACK === "true";

const SNAPSHOT =
  process.env.MSE_25_214_SNAPSHOT ||
  "/var/tmp/mse-25-214-melun-geocoordinates.snapshot.json";

const TARGET = Object.freeze({
  id: 8,
  city: "Melun",
  postalCode: "77000",
  address: "10 Rue Saint Etienne",
  phone: "0164393107",
  latitude: 48.53612,
  longitude: 2.65823,
  source: "OpenStreetMap node 13202447292",
});

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function fail(message) {
  const error = new Error(message);
  error.code = `${CONTRACT}_GUARD_FAILED`;
  throw error;
}

function assertTarget(agency) {
  if (!agency) fail("Agence 8 introuvable.");

  if (normalize(agency.city) !== normalize(TARGET.city)) {
    fail(`Ville inattendue : ${agency.city}`);
  }

  if (String(agency.postalCode || "") !== TARGET.postalCode) {
    fail(`Code postal inattendu : ${agency.postalCode}`);
  }

  if (normalize(agency.address) !== normalize(TARGET.address)) {
    fail(`Adresse inattendue : ${agency.address}`);
  }

  if (normalizePhone(agency.phone) !== TARGET.phone) {
    fail(`Téléphone inattendu : ${agency.phone}`);
  }
}

async function geoColumnsExist() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Agency'
      AND column_name IN ('latitude', 'longitude')
    ORDER BY column_name
  `);

  const names = new Set(rows.map((row) => row.column_name));

  return names.has("latitude") && names.has("longitude");
}

async function readTarget() {
  const hasGeoColumns = await geoColumnsExist();

  if (!hasGeoColumns) {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT
          "id",
          "tenantId",
          "name",
          "city",
          "postalCode",
          "address",
          "phone"
        FROM "Agency"
        WHERE "id" = $1
        LIMIT 1
      `,
      TARGET.id
    );

    const agency = rows[0] || null;

    return agency
      ? {
          ...agency,
          latitude: null,
          longitude: null,
          geoColumnsPresent: false,
        }
      : null;
  }

  const agency = await prisma.agency.findUnique({
    where: { id: TARGET.id },
    select: {
      id: true,
      tenantId: true,
      name: true,
      city: true,
      postalCode: true,
      address: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  });

  return agency
    ? {
        ...agency,
        geoColumnsPresent: true,
      }
    : null;
}

async function main() {
  const before = await readTarget();
  assertTarget(before);

  const plan = {
    contract: CONTRACT,
    mode: ROLLBACK ? "rollback" : APPLY ? "apply" : "dry-run",
    agency: {
      id: before.id,
      name: before.name,
      city: before.city,
      postalCode: before.postalCode,
      address: before.address,
    },
    current: {
      latitude: before.latitude,
      longitude: before.longitude,
    },
    target: {
      latitude: TARGET.latitude,
      longitude: TARGET.longitude,
      source: TARGET.source,
    },
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!APPLY && !ROLLBACK) {
    console.log("\nDRY-RUN : aucune mutation.");
    return;
  }

  if (APPLY && ROLLBACK) {
    fail("APPLY et ROLLBACK ne peuvent pas être activés ensemble.");
  }

  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT)) {
      fail(`Snapshot absent : ${SNAPSHOT}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

    if (snapshot?.agencyId !== TARGET.id) {
      fail("Snapshot incompatible.");
    }

    const restored = await prisma.agency.update({
      where: { id: TARGET.id },
      data: {
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    console.log("\nROLLBACK OK");
    console.log(JSON.stringify(restored, null, 2));
    return;
  }

  fs.writeFileSync(
    SNAPSHOT,
    JSON.stringify(
      {
        contract: CONTRACT,
        agencyId: TARGET.id,
        latitude: before.latitude,
        longitude: before.longitude,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  const updated = await prisma.agency.update({
    where: { id: TARGET.id },
    data: {
      latitude: TARGET.latitude,
      longitude: TARGET.longitude,
    },
    select: {
      id: true,
      name: true,
      city: true,
      latitude: true,
      longitude: true,
    },
  });

  if (
    updated.latitude !== TARGET.latitude ||
    updated.longitude !== TARGET.longitude
  ) {
    fail("La relecture post-écriture ne correspond pas aux coordonnées attendues.");
  }

  console.log("\nAPPLY OK");
  console.log(JSON.stringify(updated, null, 2));
  console.log(`Snapshot : ${SNAPSHOT}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

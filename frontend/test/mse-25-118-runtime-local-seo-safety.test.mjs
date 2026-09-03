import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  hasCompletePhysicalAgencyAddress,
  physicalAgencyAddress,
} from "../lib/public-agency-location.js";

test("MSE-25.118d requires a complete physical address before local-business location markup", () => {
  assert.equal(
    hasCompletePhysicalAgencyAddress({
      address: "12 rue du Voyage",
      postalCode: "40100",
      city: "Dax",
    }),
    true
  );

  assert.deepEqual(
    physicalAgencyAddress({
      address: "12 rue du Voyage",
      postalCode: "40100",
      city: "Dax",
      region: "Nouvelle-Aquitaine",
    }),
    {
      address: "12 rue du Voyage",
      postalCode: "40100",
      city: "Dax",
      region: "Nouvelle-Aquitaine",
    }
  );
});

test("MSE-25.118d does not invent a physical address for a visio-only agency", () => {
  const visioOnly = {
    name: "Mondescale Clermont-Ferrand",
    city: "Clermont-Ferrand",
  };

  assert.equal(hasCompletePhysicalAgencyAddress(visioOnly), false);
  assert.equal(physicalAgencyAddress(visioOnly), null);
});

test("MSE-25.118d gates JSON-LD address, geo and implicit Maps behind physical address evidence", async () => {
  const source = await readFile(new URL("../lib/seo/json-ld.js", import.meta.url), "utf8");

  assert.match(source, /const physicalAddress = physicalAgencyAddress\(/);
  assert.match(source, /address: physicalAddress\s*\?/);
  assert.match(source, /physicalAddress && latitude != null && longitude != null/);
  assert.match(source, /physicalAddress\s*\? buildGoogleMapsSearchUrl/);
});

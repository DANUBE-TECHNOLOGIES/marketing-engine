import test from "node:test";
import assert from "node:assert/strict";
import {
  destinationLocalCopy,
  rotateCommercialLinks,
} from "../lib/seo/destination-local-differentiation.js";
import { semanticSimilarity } from "../lib/seo/semantic-similarity.mjs";

const sicile = { name: "Sicile", slug: "sicile" };
const links = [
  { key: "cruise", href: "/croisieres" },
  { key: "circuit", href: "/circuits" },
  { key: "custom", href: "/sur-mesure" },
  { key: "stay", href: "/sejours" },
];

function site(slug, city, name) {
  return { slug, name, agency: { city } };
}

test("MSE-25.30 destination local copy is deterministic for the same agency and destination", () => {
  const gien = site("ambassade-fram-mondescale-gien", "Gien", "Mondescale Gien");
  const nearby = ["Briare", "Poilly-lez-Gien", "Châtillon-sur-Loire"];
  assert.deepEqual(
    destinationLocalCopy({ site: gien, destination: sicile, nearby }),
    destinationLocalCopy({ site: gien, destination: sicile, nearby })
  );
});

test("MSE-25.30 destination local copy differs across agencies beyond simple city substitution", () => {
  const gien = destinationLocalCopy({
    site: site("ambassade-fram-mondescale-gien", "Gien", "Mondescale Gien"),
    destination: sicile,
    nearby: ["Briare", "Poilly-lez-Gien", "Châtillon-sur-Loire"],
  });
  const dax = destinationLocalCopy({
    site: site("ambassade-fram-mondescale-dax", "Dax", "Mondescale Dax"),
    destination: sicile,
    nearby: ["Saint-Paul-lès-Dax", "Narrosse", "Yzosse"],
  });

  const left = `${gien.opening} ${gien.area} ${gien.value}`;
  const right = `${dax.opening} ${dax.area} ${dax.value}`;
  const score = semanticSimilarity(left, right, {
    ignored: ["Gien", "Dax", "Briare", "Poilly-lez-Gien", "Saint-Paul-lès-Dax", "Narrosse"],
    size: 2,
  });
  assert.ok(score < 0.78, `similarité locale trop élevée: ${score}`);
});

test("MSE-25.30 commercial link rotation is stable and uses only the supplied real links", () => {
  const gien = site("ambassade-fram-mondescale-gien", "Gien", "Mondescale Gien");
  const rotated = rotateCommercialLinks(links, gien, sicile);
  assert.deepEqual(
    [...rotated].map((item) => item.key).sort(),
    [...links].map((item) => item.key).sort()
  );
  assert.deepEqual(rotated, rotateCommercialLinks(links, gien, sicile));
});

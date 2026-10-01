import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const config = fs.readFileSync(
  new URL("../lib/seo/ozoir-local-expansion.js", import.meta.url),
  "utf8"
);

const component = fs.readFileSync(
  new URL("../components/public-site/OzoirLocalExpansion.jsx", import.meta.url),
  "utf8"
);

test("V4.6 strengthens Pontault-Combault acquisition intent", () => {
  assert.match(
    config,
    /agence de voyages proche de Pontault-Combault/i
  );

  assert.match(
    config,
    /Vous habitez Pontault-Combault/i
  );

  assert.match(component, /data\.pontault\.heading/);
});

test("V4.6 creates useful cruise intent content", () => {
  assert.match(
    config,
    /Votre agence de voyages pour préparer une croisière à Ozoir-la-Ferrière/i
  );

  assert.match(config, /itinéraires/i);
  assert.match(config, /compagnies/i);
  assert.match(config, /cabines/i);
  assert.match(component, /data\.cruise\.heading/);
});

test("V4.6 preserves truthful physical location", () => {
  assert.match(
    config,
    /ne dispose pas d’une agence physique à Pontault-Combault/i
  );

  assert.match(
    config,
    /agence physique à Ozoir-la-Ferrière/i
  );

  assert.doesNotMatch(component, /PostalAddress/);
  assert.doesNotMatch(component, /GeoCoordinates/);
  assert.doesNotMatch(component, /LocalBusiness/);
});

test("V4.6 preserves Ozoir primary identity", () => {
  assert.match(
    config,
    /primaryCity:\s*"Ozoir-la-Ferrière"/
  );

  assert.match(
    config,
    /siteSlug:\s*OZOIR_SITE/
  );
});

test("V4.6 keeps conversion paths", () => {
  assert.match(component, /tel:/);
  assert.match(component, /contact/);
  assert.match(component, /services/);
  assert.match(component, /destinations/);
});


test("V4.7 exposes cruise acquisition intents", () => {
  assert.match(
    config,
    /Votre agence de voyages pour préparer une croisière à Ozoir-la-Ferrière/i
  );
  assert.match(config, /Croisières maritimes/i);
  assert.match(config, /Croisières fluviales/i);
  assert.match(config, /Croisières en Méditerranée/i);
  assert.match(config, /Croisières en Europe du Nord/i);
  assert.match(config, /Croisières dans les Caraïbes/i);
  assert.match(config, /Croisières et voyages d’expédition/i);
  assert.match(config, /Pontault-Combault/i);
});

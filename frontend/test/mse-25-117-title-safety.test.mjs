import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocalPageSeo,
} from "../lib/seo/local-page-seo.js";

test(
  "MSE-25.117 keeps primary home title local and brand-qualified",
  () => {
    const site = {
      slug: "ambassade-fram-mondescale-dax",
      name: "Ambassade FRAM - Mondescale Dax",
      agency: {
        city: "Dax",
        name: "Ambassade FRAM - Mondescale Dax",
      },
    };

    const seo = buildLocalPageSeo({
      site,
      page: {
        slug: "home",
        title: "Accueil",
      },
      pageSlug: "home",
    });

    assert.equal(
      seo.title,
      "Agence de voyages à Dax | Mondescale",
    );

    assert.match(
      seo.title,
      /Dax/,
    );

    assert.match(
      seo.title,
      /Mondescale/,
    );
  },
);

test(
  "MSE-25.117 local metadata does not inject target city lists into titles",
  () => {
    const site = {
      slug: "tui-store-amilly",
      name: "TUI STORE Amilly",
      agency: {
        city: "Amilly",
        name: "TUI STORE Amilly",
      },
      targetCities: [
        "Montargis",
        "Villemandeur",
        "Châlette-sur-Loing",
        "Pannes",
      ],
    };

    const seo = buildLocalPageSeo({
      site,
      page: {
        slug: "home",
        title: "Accueil",
      },
      pageSlug: "home",
    });

    assert.equal(
      seo.title,
      "Agence de voyages à Amilly | TUI STORE Amilly",
    );

    assert.doesNotMatch(
      seo.title,
      /Montargis|Villemandeur|Châlette-sur-Loing|Pannes/,
    );

    assert.deepEqual(
      seo.targetCities,
      [
        "Montargis",
        "Villemandeur",
        "Châlette-sur-Loing",
        "Pannes",
      ],
    );
  },
);

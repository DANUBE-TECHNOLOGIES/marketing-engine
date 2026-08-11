import test from "node:test";
import assert from "node:assert/strict";

import { mergePublicMetadata } from "../lib/public-brand-legal-runtime.js";

test("brand runtime enriches favicon and open graph without overriding canonical page metadata", () => {
  const result = mergePublicMetadata(
    {
      title: "Agence de Gien",
      description: "Votre agence de voyages à Gien",
      alternates: { canonical: "https://agences.mondescale.com/agence/gien" },
      robots: { index: true, follow: true },
      openGraph: {
        title: "Agence de Gien",
        description: "Votre agence de voyages à Gien",
        url: "https://agences.mondescale.com/agence/gien",
        type: "website",
      },
    },
    {
      runtime: {
        metadata: {
          title: "Titre runtime",
          icons: { icon: "/brand/favicon.png" },
          openGraph: {
            title: "Runtime OG",
            images: ["/brand/social.jpg"],
          },
        },
      },
    }
  );

  assert.equal(result.title, "Agence de Gien");
  assert.equal(result.alternates.canonical, "https://agences.mondescale.com/agence/gien");
  assert.equal(result.robots.index, true);
  assert.equal(result.icons.icon, "/brand/favicon.png");
  assert.equal(result.openGraph.url, "https://agences.mondescale.com/agence/gien");
  assert.deepEqual(result.openGraph.images, ["/brand/social.jpg"]);
});

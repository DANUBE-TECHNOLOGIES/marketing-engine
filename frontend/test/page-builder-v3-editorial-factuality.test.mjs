"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  canApplyEditorialSuggestions,
  factualityLabel,
  normalizeFactualityAudit,
  normalizeFactualityResponse,
  normalizeGrounding,
} from "../lib/page-builder-v3/index.mjs";

test(
  "normalise un grounding absent",
  () => {
    const result =
      normalizeGrounding(null);

    assert.equal(
      result.available,
      false
    );

    assert.deepEqual(
      result.sourceFields,
      []
    );
  }
);

test(
  "normalise une réponse factuality absente",
  () => {
    const result =
      normalizeFactualityResponse(
        null
      );

    assert.equal(
      result.status,
      "safe"
    );

    assert.equal(
      result.allowed,
      true
    );
  }
);

test(
  "normalise un audit bloquant",
  () => {
    const result =
      normalizeFactualityAudit({
        issues: [
          {
            id:
              "price",
            rule:
              "price",
            severity:
              "blocked",
            message:
              "Prix non sourcé",
          },
        ],
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.blockerCount,
      1
    );
  }
);

test(
  "autorise un avertissement",
  () => {
    const result =
      normalizeFactualityAudit({
        issues: [
          {
            id:
              "climate",
            severity:
              "warning",
            message:
              "Climat à vérifier",
          },
        ],
      });

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.status,
      "warning"
    );
  }
);

test(
  "retourne le libellé bloqué",
  () => {
    assert.equal(
      factualityLabel({
        issues: [
          {
            severity:
              "blocked",
          },
        ],
      }),
      "Contenu bloqué"
    );
  }
);

test(
  "empêche l’application d’un résultat bloqué",
  () => {
    assert.equal(
      canApplyEditorialSuggestions({
        factuality: {
          issues: [
            {
              severity:
                "blocked",
            },
          ],
        },
      }),
      false
    );
  }
);

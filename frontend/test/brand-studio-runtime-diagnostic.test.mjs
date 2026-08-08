import test from "node:test";
import assert from "node:assert/strict";

import {
  BRAND_STUDIO_RUNTIME_CHECKS,
  runBrandStudioCheck,
  runBrandStudioDiagnostic,
} from "../components/brand-studio/BrandStudioDiagnostic.jsx";

test(
  "le diagnostic couvre les services principaux",
  () => {
    const ids =
      BRAND_STUDIO_RUNTIME_CHECKS
        .map(
          (
            check
          ) =>
            check.id
        );

    assert.equal(
      ids.includes(
        "sites"
      ),
      true
    );

    assert.equal(
      ids.includes(
        "assetsHealth"
      ),
      true
    );

    assert.equal(
      ids.includes(
        "brandRead"
      ),
      true
    );

    assert.equal(
      ids.includes(
        "legalRead"
      ),
      true
    );
  }
);

test(
  "un HTTP 200 est marqué opérationnel",
  async () => {
    const result =
      await runBrandStudioCheck(
        {
          id:
            "test",

          label:
            "Test",

          url:
            "/test",

          acceptedStatuses: [
            200,
          ],
        },
        {
          fetchImpl:
            async () =>
              new Response(
                JSON.stringify({
                  ok:
                    true,
                }),
                {
                  status:
                    200,

                  headers: {
                    "content-type":
                      "application/json",
                  },
                }
              ),
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.status,
      200
    );
  }
);

test(
  "un HTTP 401 est marqué en échec dans une session attendue",
  async () => {
    const result =
      await runBrandStudioCheck(
        {
          id:
            "test",

          label:
            "Test",

          url:
            "/test",

          acceptedStatuses: [
            200,
          ],
        },
        {
          fetchImpl:
            async () =>
              new Response(
                JSON.stringify({
                  error:
                    "UNAUTHORIZED",
                }),
                {
                  status:
                    401,
                }
              ),
        }
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.status,
      401
    );
  }
);

test(
  "le rapport agrège les résultats",
  async () => {
    const report =
      await runBrandStudioDiagnostic({
        fetchImpl:
          async () =>
            new Response(
              JSON.stringify({
                ok:
                  true,
              }),
              {
                status:
                  200,
              }
            ),
      });

    assert.equal(
      report.total,
      BRAND_STUDIO_RUNTIME_CHECKS
        .length
    );

    assert.equal(
      report.success,
      true
    );

    assert.equal(
      report.failed,
      0
    );
  }
);

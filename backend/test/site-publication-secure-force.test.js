"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  sitePublicationHeaderValue,
  sitePublicationSecureTokenMatches,
  assertSitePublicationForceAuthorized,
} =
  require(
    "../src/modules/site-publication/service"
  );

function restore(
  previous
) {
  if (
    previous ===
    undefined
  ) {
    delete process.env
      .SITE_PUBLICATION_FORCE_TOKEN;

    return;
  }

  process.env
    .SITE_PUBLICATION_FORCE_TOKEN =
    previous;
}

test(
  "lit le jeton sans dépendre de la casse",
  () => {
    assert.equal(
      sitePublicationHeaderValue(
        {
          "X-Site-Publication-Force-Token":
            "secret",
        },
        "x-site-publication-force-token"
      ),
      "secret"
    );
  }
);

test(
  "compare les secrets",
  () => {
    assert.equal(
      sitePublicationSecureTokenMatches(
        "a".repeat(
          64
        ),
        "a".repeat(
          64
        )
      ),
      true
    );

    assert.equal(
      sitePublicationSecureTokenMatches(
        "a".repeat(
          64
        ),
        "b".repeat(
          64
        )
      ),
      false
    );

    assert.equal(
      sitePublicationSecureTokenMatches(
        "a".repeat(
          64
        ),
        "court"
      ),
      false
    );
  }
);

test(
  "refuse force lorsque le serveur n’est pas configuré",
  () => {
    const previous =
      process.env
        .SITE_PUBLICATION_FORCE_TOKEN;

    delete process.env
      .SITE_PUBLICATION_FORCE_TOKEN;

    try {
      assert.throws(
        () =>
          assertSitePublicationForceAuthorized(
            {}
          ),
        (
          error
        ) =>
          error.code ===
          "SITE_PUBLICATION_FORCE_DISABLED"
      );
    } finally {
      restore(
        previous
      );
    }
  }
);

test(
  "refuse un mauvais secret",
  () => {
    const previous =
      process.env
        .SITE_PUBLICATION_FORCE_TOKEN;

    process.env
      .SITE_PUBLICATION_FORCE_TOKEN =
      "a".repeat(
        64
      );

    try {
      assert.throws(
        () =>
          assertSitePublicationForceAuthorized({
            "x-site-publication-force-token":
              "b".repeat(
                64
              ),
          }),
        (
          error
        ) =>
          error.code ===
          "SITE_PUBLICATION_FORCE_FORBIDDEN"
      );
    } finally {
      restore(
        previous
      );
    }
  }
);

test(
  "accepte le secret exact",
  () => {
    const previous =
      process.env
        .SITE_PUBLICATION_FORCE_TOKEN;

    const token =
      "c".repeat(
        64
      );

    process.env
      .SITE_PUBLICATION_FORCE_TOKEN =
      token;

    try {
      assert.doesNotThrow(
        () =>
          assertSitePublicationForceAuthorized({
            "x-site-publication-force-token":
              token,
          })
      );
    } finally {
      restore(
        previous
      );
    }
  }
);

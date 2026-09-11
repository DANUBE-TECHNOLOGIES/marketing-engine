const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath = path.join(
  __dirname,
  "../scripts/mse-25-207-lamorlaye-team-cleanup-v1.js"
);

const script =
  fs.readFileSync(
    scriptPath,
    "utf8"
  );

test(
  "MSE-25.207 targets exact Lamorlaye Team page",
  () => {
    assert.match(
      script,
      /cms8n8meo00jzn91akxbd5c5i/
    );

    assert.match(
      script,
      /\/agence\/mondescale-lamorlaye\/equipe/
    );

    assert.match(
      script,
      /page\.pageType !== "TEAM"/
    );
  }
);

test(
  "MSE-25.207 targets only audited legacy blocks",
  () => {
    assert.match(
      script,
      /cmsztn4f200gwtdhd9iproju9/
    );

    assert.match(
      script,
      /cmsztn4f200gxtdhdqdqffwmj/
    );

    assert.match(
      script,
      /cmsztn4f200gytdhdlmhif90z/
    );
  }
);

test(
  "MSE-25.207 preserves Stephanie editorial block",
  () => {
    assert.match(
      script,
      /cmtvmj4ry0009kah7gxnezk5c/
    );

    assert.match(
      script,
      /Stephanie editorial block unexpectedly changed/
    );
  }
);

test(
  "MSE-25.207 hides generic text on both viewports",
  () => {
    assert.match(
      script,
      /GENERIC_TEXT_ID[\s\S]*visibleDesktop: false[\s\S]*visibleMobile: false/
    );
  }
);

test(
  "MSE-25.207 hides generic team on both viewports",
  () => {
    assert.match(
      script,
      /GENERIC_TEAM_ID[\s\S]*visibleDesktop: false[\s\S]*visibleMobile: false/
    );
  }
);

test(
  "MSE-25.207 canonicalizes only legacy Contact CTA",
  () => {
    assert.match(
      script,
      /\/agence\/mondescale-lamorlaye\/contact/
    );

    assert.match(
      script,
      /primaryCta/
    );
  }
);

test(
  "MSE-25.207 protects page SEO and unrelated blocks",
  () => {
    assert.match(
      script,
      /seoTitle: page\.seoTitle/
    );

    assert.match(
      script,
      /metaDescription/
    );

    assert.match(
      script,
      /blocks: page\.blocks\.map/
    );

    assert.match(
      script,
      /sections: page\.sections/
    );
  }
);

test(
  "MSE-25.207 supports dry-run snapshot and rollback",
  () => {
    assert.match(
      script,
      /DRY_RUN/
    );

    assert.match(
      script,
      /snapshot\.json/
    );

    assert.match(
      script,
      /--rollback/
    );
  }
);

test(
  "MSE-25.207 requires explicit apply confirmation",
  () => {
    assert.match(
      script,
      /MSE_25_207_CONFIRM/
    );

    assert.match(
      script,
      /=== "true"/
    );
  }
);

test(
  "MSE-25.207 does not create pages or alter routing surfaces",
  () => {
    assert.doesNotMatch(
      script,
      /\.create\s*\(/
    );

    assert.doesNotMatch(
      script,
      /\.delete\s*\(/
    );

    assert.doesNotMatch(
      script,
      /canonicalUrl|canonicalHref|rel=["']canonical["']|sitemap|redirect|rewrite/i
    );

    assert.doesNotMatch(
      script,
      /prisma\.agencySitePage\.(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/i
    );

    assert.doesNotMatch(
      script,
      /prisma\.(?:route|routing|redirect|sitemap|canonical)\w*\.(?:create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/i
    );
  }
);

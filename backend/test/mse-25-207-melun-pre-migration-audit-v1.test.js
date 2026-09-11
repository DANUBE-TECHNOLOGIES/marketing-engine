"use strict";

const fs = require("fs");
const path = require("path");

describe("MSE-25.207 — Melun pre-migration audit V1", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "scripts",
    "mse-25-207-melun-pre-migration-audit-v1.js"
  );
  const source = fs.readFileSync(scriptPath, "utf8");

  test("targets only the current Melun slug by default", () => {
    expect(source).toContain('"tui-store-melun"');
    expect(source).toContain('normalize(site.agency?.city) !== "melun"');
  });

  test("records but does not activate the future slug", () => {
    expect(source).toContain('futureSlug: "ambassade-fram-mondescale-melun"');
    expect(source).toContain('mode: "READ_ONLY"');
    expect(source).toContain("mutationPerformed: false");
  });

  test("contains no Prisma write operation", () => {
    expect(source).not.toMatch(/prisma\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
    expect(source).not.toMatch(/tx\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
  });

  test("guards against premature Ambassade FRAM publication", () => {
    expect(source).toContain('"ambassade fram"');
    expect(source).toContain("noPrematureAmbassadeFramContent");
  });
});

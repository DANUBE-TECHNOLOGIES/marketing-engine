"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  sendPublicSiteError,
} = require("../src/modules/public-site-read/routes");

function responseRecorder() {
  return {
    statusCode: null,
    payload: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test("MSE-25.9 public renderer preserves safe 404 errors as JSON", () => {
  const response = responseRecorder();
  const error = new Error("Mini-site introuvable.");
  error.code = "PUBLIC_SITE_NOT_FOUND";
  error.statusCode = 404;
  error.details = { slug: "inconnu" };

  sendPublicSiteError(response, error);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.payload, {
    error: "PUBLIC_SITE_NOT_FOUND",
    message: "Mini-site introuvable.",
    details: { slug: "inconnu" },
  });
});

test("MSE-25.9 public renderer masks internal 500 details", () => {
  const response = responseRecorder();
  const error = new Error("database password leaked here");
  error.code = "PRISMA_FAILURE";
  error.statusCode = 500;
  error.details = { secret: "never expose" };

  sendPublicSiteError(response, error);

  assert.equal(response.statusCode, 500);
  assert.equal(response.payload.error, "PRISMA_FAILURE");
  assert.equal(response.payload.message, "Le mini-site est momentanément indisponible.");
  assert.deepEqual(response.payload.details, {});
});

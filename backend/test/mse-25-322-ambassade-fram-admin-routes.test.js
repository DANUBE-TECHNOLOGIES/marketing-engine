const test = require("node:test");
const assert = require("node:assert/strict");
const createAdminRoutes = require("../src/modules/ambassade-fram/admin-routes");

test("FRAM admin routes fail closed without authorization middleware", () => {
  assert.throws(() => createAdminRoutes({ prisma: {} }), /authorization required/);
  assert.throws(() => createAdminRoutes({ prisma: {}, authorize: true }), /authorization required/);
});

test("FRAM admin routes can be assembled with explicit middleware", () => {
  const router = createAdminRoutes({ prisma: {}, authorize: (_req, _res, next) => next() });
  assert.equal(typeof router, "function");
});

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

test("FRAM admin rejects an unverified administrator context", async () => {
  const router = createAdminRoutes({ prisma: {}, authorize: (req, _res, next) => {
    req.tenantId = "tenant-a";
    req.user = { role: "admin" };
    next();
  } });
  const guard = router.stack.find(layer => !layer.route && layer.handle.length === 3 && layer.handle.toString().includes("framAdminAuthenticated"));
  assert.ok(guard);
  let statusCode;
  const res = { status(code) { statusCode = code; return this; }, json() {} };
  guard.handle({ tenantId: "tenant-a", user: { role: "admin" } }, res, () => { throw Error("Must not authorize"); });
  assert.equal(statusCode, 403);
});

test("FRAM admin rejects a verified flag without administrator role", () => {
  const router = createAdminRoutes({ prisma: {}, authorize: (_req, _res, next) => next() });
  const guard = router.stack.find(layer => !layer.route && layer.handle.length === 3 && layer.handle.toString().includes("framAdminAuthenticated"));
  assert.ok(guard);
  let statusCode;
  const res = { status(code) { statusCode = code; return this; }, json() {} };
  guard.handle({ tenantId: "tenant-a", user: { role: "viewer" }, framAdminAuthenticated: true }, res, () => { throw Error("Must not authorize"); });
  assert.equal(statusCode, 403);
});

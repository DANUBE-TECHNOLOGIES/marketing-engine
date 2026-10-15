const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminService } = require("../src/modules/ambassade-fram/admin-service");

test("agency outside tenant cannot be approved", async () => {
  let writes = 0;
  const service = createAdminService({
    agency: { findFirst: async () => null },
    framAmbassadorAgency: { upsert: async () => { writes++; } },
  });
  await assert.rejects(service.approveAgency("tenant-a", 10), RangeError);
  assert.equal(writes, 0);
});

test("reactivation preserves original approval date", async () => {
  let args;
  const service = createAdminService({
    agency: { findFirst: async () => ({ id: 10 }) },
    framAmbassadorAgency: { upsert: async value => { args = value; return value; } },
  });
  await service.approveAgency("tenant-a", 10);
  assert.equal(args.create.enabled, true);
  assert.ok(args.create.approvedAt instanceof Date);
  assert.deepEqual(args.update, { enabled: true });
});

test("disabling preserves the approval timestamp", async () => {
  let args;
  const service = createAdminService({
    agency: { findFirst: async () => ({ id: 10 }) },
    framAmbassadorAgency: { updateMany: async value => { args = value; return { count: 1 }; } },
  });
  await service.disableAgency("tenant-a", 10);
  assert.deepEqual(args, { where: { agencyId: 10 }, data: { enabled: false } });
});

#!/usr/bin/env node
"use strict";

const { PrismaClient } = require("@prisma/client");
const flexiblePayment = require("../src/modules/flexible-payment-experience");
const { checkFlexiblePaymentVmReadiness } = require("../src/modules/flexible-payment-experience/runtime-readiness");

async function main() {
  const prisma = new PrismaClient();
  try {
    const report = await checkFlexiblePaymentVmReadiness({
      prisma,
      moduleExports: flexiblePayment,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ready) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error?.message || String(error)}\n`);
  process.exitCode = 1;
});

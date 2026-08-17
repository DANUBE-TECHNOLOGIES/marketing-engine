"use strict";

const { normalizePaymentPolicy } = require("./payment-experience");

function toPolicyRecord(record) {
  if (!record) return null;
  return normalizePaymentPolicy({
    enabled: record.enabled,
    products: Array.isArray(record.products) ? record.products : [],
    installmentCounts: Array.isArray(record.installmentCounts) ? record.installmentCounts : [],
    feeMode: record.feeMode,
    disclaimer: record.disclaimer,
    ctaLabel: record.ctaLabel,
  });
}

class PaymentPolicyRepository {
  constructor(prisma) {
    if (!prisma) throw new TypeError("PaymentPolicyRepository requires Prisma.");
    this.prisma = prisma;
  }

  async findBySiteId(siteId) {
    if (this.prisma.agencyPaymentPolicy?.findUnique) {
      const record = await this.prisma.agencyPaymentPolicy.findUnique({
        where: { siteId: String(siteId) },
      });
      return toPolicyRecord(record);
    }

    const rows = await this.prisma.$queryRaw`
      SELECT
        "siteId",
        "enabled",
        "products",
        "installmentCounts",
        "feeMode",
        "disclaimer",
        "ctaLabel",
        "createdAt",
        "updatedAt"
      FROM "AgencyPaymentPolicy"
      WHERE "siteId" = ${String(siteId)}
      LIMIT 1
    `;

    return toPolicyRecord(rows?.[0] || null);
  }

  async upsert(siteId, input) {
    const policy = normalizePaymentPolicy(input);

    if (this.prisma.agencyPaymentPolicy?.upsert) {
      const record = await this.prisma.agencyPaymentPolicy.upsert({
        where: { siteId: String(siteId) },
        create: {
          siteId: String(siteId),
          ...policy,
        },
        update: policy,
      });
      return toPolicyRecord(record);
    }

    const products = JSON.stringify(policy.products);
    const installmentCounts = JSON.stringify(policy.installmentCounts);
    const rows = await this.prisma.$queryRaw`
      INSERT INTO "AgencyPaymentPolicy" (
        "siteId",
        "enabled",
        "products",
        "installmentCounts",
        "feeMode",
        "disclaimer",
        "ctaLabel",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${String(siteId)},
        ${policy.enabled},
        CAST(${products} AS jsonb),
        CAST(${installmentCounts} AS jsonb),
        ${policy.feeMode},
        ${policy.disclaimer},
        ${policy.ctaLabel},
        NOW(),
        NOW()
      )
      ON CONFLICT ("siteId") DO UPDATE SET
        "enabled" = EXCLUDED."enabled",
        "products" = EXCLUDED."products",
        "installmentCounts" = EXCLUDED."installmentCounts",
        "feeMode" = EXCLUDED."feeMode",
        "disclaimer" = EXCLUDED."disclaimer",
        "ctaLabel" = EXCLUDED."ctaLabel",
        "updatedAt" = NOW()
      RETURNING
        "siteId",
        "enabled",
        "products",
        "installmentCounts",
        "feeMode",
        "disclaimer",
        "ctaLabel",
        "createdAt",
        "updatedAt"
    `;

    return toPolicyRecord(rows?.[0] || null);
  }
}

module.exports = PaymentPolicyRepository;
module.exports.toPolicyRecord = toPolicyRecord;

const { PrismaClient } = require("@prisma/client");

/**
 * Client Prisma partagé par tous les nouveaux modules.
 *
 * En développement, nodemon peut recharger plusieurs fois les fichiers.
 * Le stockage dans globalThis évite de multiplier les connexions Prisma.
 */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__mondescalePrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__mondescalePrisma = prisma;
}

module.exports = prisma;

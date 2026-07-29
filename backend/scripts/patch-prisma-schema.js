const fs = require("node:fs");
const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error("schema.prisma introuvable");
let s = fs.readFileSync(file, "utf8");
if (!s.includes("agencySites AgencySite[]")) {
  const model = s.match(/model Agency \{[\s\S]*?\n\}/);
  if (!model) throw new Error("model Agency introuvable");
  const patched = model[0].replace(/\n\}/, "\n  agencySites AgencySite[]\n}");
  s = s.replace(model[0], patched);
}
if (!s.includes("model AgencySitePage")) {
  s += `\n\n// ======================================================\n// SPRINT 007A - AGENCY SITE GENERATOR\n// ======================================================\nmodel AgencySite {\n  id          String   @id @default(cuid())\n  agencyId    Int      @unique\n  name        String\n  slug        String   @unique\n  basePath    String   @unique\n  status      String   @default(\"draft\")\n  theme       String   @default(\"mondescale-default\")\n  generatedAt DateTime?\n  publishedAt DateTime?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  agency Agency           @relation(fields: [agencyId], references: [id], onDelete: Cascade)\n  pages  AgencySitePage[]\n\n  @@index([status])\n}\n\nmodel AgencySitePage {\n  id              String   @id @default(cuid())\n  siteId          String\n  parentId        String?\n  title           String\n  slug            String\n  path            String   @unique\n  pageType        String\n  menuTitle       String\n  menuLocation    String\n  displayOrder    Int\n  seoTitle        String\n  metaDescription String\n  h1              String\n  schemaType      String   @default(\"WebPage\")\n  status          String   @default(\"draft\")\n  published       Boolean  @default(false)\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  site     AgencySite       @relation(fields: [siteId], references: [id], onDelete: Cascade)\n  parent   AgencySitePage?  @relation(\"AgencySitePageTree\", fields: [parentId], references: [id], onDelete: SetNull)\n  children AgencySitePage[] @relation(\"AgencySitePageTree\")\n\n  @@unique([siteId, slug])\n  @@index([siteId])\n  @@index([parentId])\n  @@index([pageType])\n  @@index([menuLocation, displayOrder])\n  @@index([status])\n}\n`;
}
fs.writeFileSync(file, s);

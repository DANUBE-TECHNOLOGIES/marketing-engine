const fs = require("node:fs"); const file = process.argv[2]; if (!file || !fs.existsSync(file)) throw new Error("schema.prisma introuvable"); let s=fs.readFileSync(file,"utf8");
if (!s.includes("sections AgencySiteSection[]")) {
  const m=s.match(/model AgencySitePage \{[\s\S]*?\n\}/); if(!m) throw new Error("model AgencySitePage introuvable: installer Sprint 007A d'abord");
  s=s.replace(m[0],m[0].replace(/\n\}/,"\n  sections AgencySiteSection[]\n}"));
}
if (!s.includes("model AgencySiteSection")) s += `\n\n// SPRINT 007B - STRUCTURED PAGE CONTENT\nmodel AgencySiteSection {\n  id           String   @id @default(cuid())\n  pageId       String\n  sectionType  String\n  jsonContent  Json\n  displayOrder Int\n  status       String   @default("draft")\n  createdAt    DateTime @default(now())\n  updatedAt    DateTime @updatedAt\n\n  page AgencySitePage @relation(fields: [pageId], references: [id], onDelete: Cascade)\n\n  @@unique([pageId, sectionType])\n  @@index([pageId, displayOrder])\n  @@index([sectionType])\n  @@index([status])\n}\n`;
fs.writeFileSync(file,s);

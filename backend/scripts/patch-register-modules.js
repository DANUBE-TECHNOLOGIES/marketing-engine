const fs = require("node:fs");
const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error("register-modules.js introuvable");
let source = fs.readFileSync(file, "utf8");
if (!source.includes('require("./agency-site")')) {
  const imports = [...source.matchAll(/^const .*require\("\.\/[^\"]+"\);$/gm)];
  if (!imports.length) throw new Error("Point d'insertion des imports introuvable");
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  source = source.slice(0, at) + '\nconst agencySite = require("./agency-site");' + source.slice(at);
}
if (!source.includes("agencySite.routes({ prisma })")) {
  const marker = /\n};\s*$/;
  if (!marker.test(source)) throw new Error("Fin de registerModules introuvable");
  source = source.replace(marker, '\n\n  if (agencySite.routes) {\n    app.use(agencySite.routes({ prisma }));\n  }\n};\n');
}
fs.writeFileSync(file, source);

const ALLOWED_ENTITY_TYPES = new Set(["country","destination","region","theme","experience","practical","faq"]);
function assertEntityDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("Document knowledge invalide.");
  for (const field of ["type","slug","title"]) if (!document[field] || typeof document[field] !== "string") throw new Error(`Champ obligatoire absent ou invalide: ${field}`);
  if (!ALLOWED_ENTITY_TYPES.has(document.type)) throw new Error(`Type knowledge non autorisé: ${document.type}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.slug)) throw new Error(`Slug invalide: ${document.slug}`);
  if (document.relations && !Array.isArray(document.relations)) throw new Error("relations doit être un tableau.");
  if (document.blocks && !Array.isArray(document.blocks)) throw new Error("blocks doit être un tableau.");
  return document;
}
module.exports={ALLOWED_ENTITY_TYPES,assertEntityDocument};

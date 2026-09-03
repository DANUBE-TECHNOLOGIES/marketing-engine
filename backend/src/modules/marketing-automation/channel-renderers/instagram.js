const { truncate, hashtags } = require("../utils");
module.exports = function renderInstagram(source, options = {}) {
  const intro = options.hook || `✨ Cap sur ${source.destination}`;
  const body = [intro, source.excerpt, source.highlights.slice(0, 5).map((x) => `• ${x}`).join("\n"), options.cta || "Enregistrez cette idée et contactez votre conseillère pour construire votre voyage.", source.legal].filter(Boolean).join("\n\n");
  return { channel: "instagram", text: truncate(body, 2200), hashtags: hashtags([source.destination, ...source.keywords, "voyage", "agencedevoyage", source.agencyCity], 12), link: source.url, limits: { text: 2200, hashtags: 30 } };
};

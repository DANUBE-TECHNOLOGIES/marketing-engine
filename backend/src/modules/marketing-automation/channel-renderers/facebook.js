const { truncate, hashtags } = require("../utils");
module.exports = function renderFacebook(source, options = {}) {
  const hook = options.hook || `✈️ ${source.title}`;
  const cta = options.cta || `Parlons de votre projet avec ${source.agencyName}${source.agencyCity ? ` à ${source.agencyCity}` : ""}.`;
  const body = [hook, source.excerpt, source.highlights.slice(0, 4).map((x) => `✓ ${x}`).join("\n"), source.offer, cta, source.url, source.legal].filter(Boolean).join("\n\n");
  return { channel: "facebook", text: truncate(body, 5000), hashtags: hashtags([source.destination, "voyage", "conseilvoyage", source.agencyCity], 6), link: source.url, limits: { text: 5000 } };
};

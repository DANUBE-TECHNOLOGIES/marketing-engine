const { truncate, hashtags } = require("../utils");
module.exports = function renderGoogleBusiness(source, options = {}) {
  const cta = options.cta || `Échangez avec votre conseiller ${source.agencyName}${source.agencyCity ? ` à ${source.agencyCity}` : ""}.`;
  const highlights = source.highlights.slice(0, 3).join(" • ");
  const body = [source.title, source.excerpt, highlights, source.offer, cta, source.url].filter(Boolean).join("\n\n");
  return { channel: "google_business", text: truncate(body, 1500), hashtags: hashtags([source.destination, "voyage", source.agencyCity], 3), cta: "LEARN_MORE", link: source.url, limits: { text: 1500 } };
};

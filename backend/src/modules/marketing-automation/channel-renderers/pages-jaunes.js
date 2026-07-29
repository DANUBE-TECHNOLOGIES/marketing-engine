const { truncate } = require("../utils");
module.exports = function renderPagesJaunes(source, options = {}) {
  const body = [source.title, source.excerpt, source.highlights.slice(0, 3).join(", "), options.cta || `Prenez rendez-vous avec ${source.agencyName}${source.agencyCity ? ` à ${source.agencyCity}` : ""}.`, source.phone].filter(Boolean).join(" ");
  return { channel: "pages_jaunes", text: truncate(body, 1500), link: source.url, limits: { text: 1500 } };
};

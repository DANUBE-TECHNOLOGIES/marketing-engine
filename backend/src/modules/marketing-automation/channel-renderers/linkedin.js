const { truncate, hashtags } = require("../utils");
module.exports = function renderLinkedIn(source, options = {}) {
  const body = [options.hook || source.title, source.excerpt, source.highlights.slice(0, 4).map((x) => `• ${x}`).join("\n"), options.cta || `Notre équipe ${source.agencyName} vous accompagne avant, pendant et après votre séjour.`, source.url].filter(Boolean).join("\n\n");
  return { channel: "linkedin", text: truncate(body, 3000), hashtags: hashtags([source.destination, "tourisme", "voyage", "conseilclient"], 5), link: source.url, limits: { text: 3000 } };
};

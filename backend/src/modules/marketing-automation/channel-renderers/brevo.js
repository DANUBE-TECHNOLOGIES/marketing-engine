const { truncate } = require("../utils");
module.exports = function renderBrevo(source, options = {}) {
  const subject = truncate(options.subject || `${source.destination} : votre prochaine escapade ?`, 90);
  const preheader = truncate(options.preheader || source.excerpt, 130);
  const paragraphs = [source.excerpt, source.highlights.length ? `<ul>${source.highlights.slice(0, 5).map((x) => `<li>${x}</li>`).join("")}</ul>` : "", source.offer ? `<p><strong>${source.offer}</strong></p>` : "", `<p>Votre conseiller ${source.agencyName} vous accompagne pour personnaliser ce voyage.</p>`].filter(Boolean);
  return { channel: "brevo", subject, preheader, html: `<h1>${source.title}</h1>${paragraphs.join("")}<p><a href="${source.bookingUrl || source.url}">Demander un devis</a></p>${source.legal ? `<small>${source.legal}</small>` : ""}`, text: truncate([source.title, source.excerpt, source.offer, source.bookingUrl || source.url].filter(Boolean).join("\n\n"), 10000), link: source.bookingUrl || source.url, limits: { subject: 90, preheader: 130 } };
};

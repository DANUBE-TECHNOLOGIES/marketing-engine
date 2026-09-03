const CHANNELS = ["google_business", "facebook", "instagram", "linkedin", "brevo", "pages_jaunes"];
function httpError(message, status = 400) { const error = new Error(message); error.status = status; return error; }
function validateRender(payload = {}) {
  if (!payload.source || typeof payload.source !== "object") throw httpError("source est obligatoire");
  const channels = payload.channels || CHANNELS;
  if (!Array.isArray(channels) || !channels.length) throw httpError("channels doit contenir au moins un canal");
  const unknown = channels.filter((channel) => !CHANNELS.includes(channel));
  if (unknown.length) throw httpError(`Canaux inconnus: ${unknown.join(", ")}`);
  return { channels };
}
function validateCampaign(payload = {}) {
  validateRender(payload);
  if (!payload.name && !payload.source?.title) throw httpError("name ou source.title est obligatoire");
}
module.exports = { CHANNELS, validateRender, validateCampaign, httpError };

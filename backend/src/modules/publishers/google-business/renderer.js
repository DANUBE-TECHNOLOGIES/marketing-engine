const VALID_TOPICS = new Set(["STANDARD", "EVENT", "OFFER", "ALERT"]);
const VALID_ACTIONS = new Set(["BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP", "CALL"]);

function trimText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function renderGoogleLocalPost(publicationPayload = {}, options = {}) {
  const text = trimText(publicationPayload.text || publicationPayload.summary || publicationPayload.content, 1500);
  if (!text) {
    const error = new Error("Le contenu Google Business est vide");
    error.status = 400;
    throw error;
  }
  const topicType = String(options.topicType || "STANDARD").toUpperCase();
  if (!VALID_TOPICS.has(topicType)) throw new Error(`topicType Google Business invalide: ${topicType}`);
  const payload = { languageCode: options.languageCode || "fr-FR", summary: text, topicType };
  const url = options.url || publicationPayload.url;
  const actionType = String(options.actionType || "LEARN_MORE").toUpperCase();
  if (url && VALID_ACTIONS.has(actionType)) payload.callToAction = { actionType, url };
  const mediaUrl = options.mediaUrl || publicationPayload.mediaUrl;
  if (mediaUrl) payload.media = [{ mediaFormat: "PHOTO", sourceUrl: mediaUrl }];
  return payload;
}
module.exports = { renderGoogleLocalPost, trimText };

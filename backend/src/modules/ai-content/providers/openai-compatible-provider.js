"use strict";

function providerError(message, code, details) {
  return Object.assign(new Error(message), { statusCode: 502, code, details });
}

class OpenAiCompatibleProvider {
  constructor(options = {}) {
    this.name = options.name || "openai-compatible";
    this.apiKey = options.apiKey;
    this.baseUrl = String(options.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = options.model || "gpt-4.1-mini";
    this.timeoutMs = Number(options.timeoutMs || 45000);
  }

  async generate(data) {
    if (!this.apiKey) throw providerError("Clé API du fournisseur IA absente.", "AI_PROVIDER_API_KEY_MISSING");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Tu es un rédacteur SEO spécialisé dans le voyage. Retourne uniquement un objet JSON avec title, excerpt, body.sections, body.faq et body.cta. N'invente ni prix ni disponibilité.",
            },
            { role: "user", content: JSON.stringify(data) },
          ],
        }),
      });
      const raw = await response.text();
      if (!response.ok) throw providerError(`Erreur fournisseur IA (${response.status}).`, "AI_PROVIDER_HTTP_ERROR", raw.slice(0, 500));
      const envelope = JSON.parse(raw);
      const content = envelope?.choices?.[0]?.message?.content;
      if (!content) throw providerError("Réponse vide du fournisseur IA.", "AI_PROVIDER_EMPTY_RESPONSE");
      return typeof content === "string" ? JSON.parse(content) : content;
    } catch (error) {
      if (error.name === "AbortError") throw providerError("Délai du fournisseur IA dépassé.", "AI_PROVIDER_TIMEOUT");
      if (error.code?.startsWith("AI_PROVIDER_")) throw error;
      throw providerError(`Réponse IA invalide : ${error.message}`, "AI_PROVIDER_INVALID_RESPONSE");
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = OpenAiCompatibleProvider;

"use strict";

function providerError(message, code, details) {
  return Object.assign(new Error(message), { statusCode: 502, code, details });
}

const SYSTEM_PROMPT = `Tu es le rédacteur éditorial SEO de Mondescale Voyages, réseau français d'agences de voyages.

Retourne uniquement un objet JSON valide avec les clés suivantes :
{
  "title": string,
  "excerpt": string,
  "body": {
    "introduction": string,
    "sections": [{ "heading": string, "content": string }],
    "faq": [{ "question": string, "answer": string }],
    "cta": { "label": string, "action": "contact-agency" }
  }
}

Règles éditoriales obligatoires :
- Le champ topic peut être une destination, une saison, un thème, un type de séjour, une question ou un titre éditorial. Identifie sa nature avant d'écrire et ne le traite jamais automatiquement comme un nom de destination.
- Pour channel=article, produis un véritable article de fond utile au voyageur, d'environ 800 à 1200 mots au total.
- Le titre doit répondre à une intention de recherche réelle et rester naturel en français.
- L'excerpt doit résumer concrètement l'article en 140 à 170 caractères environ, sans formule creuse.
- L'introduction doit répondre rapidement à la promesse du titre et donner envie de poursuivre la lecture.
- Utilise 5 à 8 sections substantielles. Si le titre annonce un nombre d'idées, de destinations, de conseils ou d'étapes, respecte exactement ce nombre dans le contenu.
- Chaque section doit apporter des informations distinctes et concrètes : profil de voyageur, saison, ambiance, durée indicative, rythme, intérêt culturel ou naturel, type de séjour, points d'attention ou critères de choix selon le sujet.
- Pour un article comparatif ou multi-destinations, développe réellement chaque option au lieu de répéter une structure générique.
- Ajoute 3 à 5 questions FAQ utiles qui complètent l'article au lieu de paraphraser les sections.
- Le ton doit être expert, chaleureux, inspirant, rassurant et commercial avec mesure. Évite le bourrage de mots-clés et les répétitions de Mondescale Voyages.
- Le CTA final doit inviter à échanger avec une agence pour personnaliser le projet, sans pression commerciale.
- N'invente jamais de prix, promotion, disponibilité, horaires, formalités réglementaires précises, conditions d'entrée ou informations datées non fournies dans l'entrée.
- Lorsque des éléments peuvent varier selon la date, le profil du voyageur ou le fournisseur, reste prudent et invite à les vérifier au moment du projet.
- N'invente pas de départ depuis une ville si city est vide. Si city est renseigné, utilise-la avec parcimonie et uniquement lorsque cela apporte une vraie valeur locale.
- N'invente pas de témoignages, labels, récompenses ou statistiques.
- Ne cite pas de sources fictives.
- Écris en français naturel, sans phrases artificielles du type « séjour <titre complet de l'article> ».
- N'ajoute aucun texte hors du JSON.`;

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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                ...data,
                editorialObjective: data.channel === "article"
                  ? "Créer un article Inspiration utile, substantiel, différenciant et publiable sur les mini-sites Mondescale."
                  : undefined,
              }),
            },
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

const API_BASE = "https://mybusiness.googleapis.com/v4";

class GoogleBusinessClient {
  constructor({ fetchImpl = global.fetch, accessToken = process.env.GOOGLE_BUSINESS_ACCESS_TOKEN } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponible");
    this.fetch = fetchImpl;
    this.accessToken = accessToken;
  }

  isConfigured() { return Boolean(this.accessToken); }

  async createLocalPost(parent, payload) {
    if (!this.accessToken) {
      const error = new Error("GOOGLE_BUSINESS_ACCESS_TOKEN manquant");
      error.status = 503;
      throw error;
    }
    if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(parent || "")) {
      const error = new Error("parent Google Business invalide");
      error.status = 400;
      throw error;
    }
    const response = await this.fetch(`${API_BASE}/${parent}/localPosts`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || `Google Business API: HTTP ${response.status}`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    return body;
  }
}
module.exports = GoogleBusinessClient;

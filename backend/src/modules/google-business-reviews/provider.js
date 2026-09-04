"use strict";

const getGoogleAccessToken = require("../../lib/googleAccessToken");
const fetchGoogleReviews = require("../../lib/googleReviews");

class GoogleBusinessReviewsProvider {
  constructor(prisma, fetchImpl = fetch) {
    this.prisma = prisma;
    this.fetchImpl = fetchImpl;
    this.connection = null;
  }

  async getConnection() {
    if (this.connection) return this.connection;

    const accessToken = await getGoogleAccessToken(this.prisma);
    const response = await this.fetchImpl(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body?.error?.message || "Impossible de lire le compte Google Business Profile."
      );
      error.statusCode = response.status;
      error.code = "GOOGLE_BUSINESS_ACCOUNT_READ_FAILED";
      throw error;
    }

    const accountName = body.accounts?.[0]?.name;
    if (!accountName) {
      const error = new Error("Aucun compte Google Business trouvé.");
      error.statusCode = 502;
      error.code = "GOOGLE_BUSINESS_ACCOUNT_NOT_FOUND";
      throw error;
    }

    this.connection = { accessToken, accountName };
    return this.connection;
  }

  async listReviews(googleLocationId) {
    const { accessToken, accountName } = await this.getConnection();
    return fetchGoogleReviews({
      accessToken,
      accountName,
      googleLocationId,
    });
  }
}

module.exports = GoogleBusinessReviewsProvider;

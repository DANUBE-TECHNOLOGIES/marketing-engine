"use strict";

function parseLimit(value, fallback = 100, maximum = 500) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error("Le paramètre limit doit être un entier positif.");
    error.statusCode = 400;
    error.code = "INVALID_LIMIT";
    throw error;
  }

  return Math.min(parsed, maximum);
}

function requireSearchQuery(value) {
  const query = String(value || "").trim();

  if (query.length < 2) {
    const error = new Error(
      "Le paramètre q doit contenir au moins 2 caractères."
    );
    error.statusCode = 400;
    error.code = "INVALID_SEARCH_QUERY";
    throw error;
  }

  return query;
}

module.exports = {
  parseLimit,
  requireSearchQuery,
};

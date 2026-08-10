"use strict";

function httpError(message, code) {
  return Object.assign(new Error(message), {
    statusCode: 400,
    code,
  });
}

function cleanText(value, max) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function validateEditorialUpdate(input = {}) {
  const title = cleanText(input.title, 90);
  const excerpt = cleanText(input.excerpt, 240);

  if (!title) {
    throw httpError(
      "Le titre éditorial est obligatoire.",
      "AI_CONTENT_TITLE_REQUIRED"
    );
  }

  const patch = {
    title,
    excerpt: excerpt || null,
  };

  if (input.body && typeof input.body === "object" && !Array.isArray(input.body)) {
    patch.body = input.body;
  }

  return patch;
}

function assertEditableEditorialContent(content) {
  const status = String(content?.status || "").toLowerCase();

  if (content?.campaignId) {
    const error = new Error(
      "Ce contenu appartient à une campagne et doit être modifié depuis le Campaign Manager."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_CAMPAIGN_REVIEW_REQUIRED";
    throw error;
  }

  if (status === "published") {
    const error = new Error(
      "Dépubliez ce contenu avant de le modifier."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_UNPUBLISH_BEFORE_EDIT";
    throw error;
  }

  if (!["draft", "review", "approved"].includes(status)) {
    const error = new Error(
      "Ce contenu ne peut pas être modifié dans son état actuel."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_NOT_EDITABLE";
    throw error;
  }
}

module.exports = {
  validateEditorialUpdate,
  assertEditableEditorialContent,
};

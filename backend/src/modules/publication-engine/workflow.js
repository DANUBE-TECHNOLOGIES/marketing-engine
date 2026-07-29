"use strict";

const STATES = Object.freeze({
  DRAFT: "draft",
  REVIEW: "review",
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  ARCHIVED: "archived",
});

const TRANSITIONS = Object.freeze({
  draft: new Set(["review", "published", "archived"]),
  review: new Set(["draft", "published", "archived"]),
  published: new Set(["unpublished", "archived"]),
  unpublished: new Set(["draft", "review", "published", "archived"]),
  archived: new Set(["draft"]),
});

function normalizeState(value) {
  const state = String(value || STATES.DRAFT).trim().toLowerCase();
  if (!Object.values(STATES).includes(state)) {
    throw new Error(`Statut de publication invalide: ${value}`);
  }
  return state;
}

function assertTransition(from, to, { force = false } = {}) {
  const source = normalizeState(from);
  const target = normalizeState(to);
  if (source === target) return { from: source, to: target, noop: true };
  if (!force && !TRANSITIONS[source]?.has(target)) {
    throw new Error(`Transition interdite: ${source} -> ${target}`);
  }
  return { from: source, to: target, noop: false };
}

function stateToPageData(state, now = new Date()) {
  const normalized = normalizeState(state);
  return {
    status: normalized,
    published: normalized === STATES.PUBLISHED,
    publishedAt: normalized === STATES.PUBLISHED ? now : null,
  };
}

module.exports = { STATES, TRANSITIONS, normalizeState, assertTransition, stateToPageData };

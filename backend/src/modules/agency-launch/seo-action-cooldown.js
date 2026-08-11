"use strict";

const DEFAULT_COOLDOWN_DAYS = 30;
const SOURCE_COOLDOWN_DAYS = {
  LOCAL_CITATIONS: 14,
  LOCAL_SEO: 14,
  LOCAL_RANKINGS: 30,
  CONTENT_SIMILARITY: 30,
  LOCAL_TRUST: 30,
  LOCAL_CONTENT: 30,
};

function daysSince(value, now = new Date()) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

function sameTarget(action, historyItem) {
  if (action?.keywordId && historyItem?.keywordId) {
    return Number(action.keywordId) === Number(historyItem.keywordId);
  }
  if (action?.keyword && historyItem?.keyword) {
    return String(action.keyword).trim().toLowerCase() === String(historyItem.keyword).trim().toLowerCase();
  }
  if (action?.targetPage?.slug && historyItem?.targetPage?.slug) {
    return String(action.targetPage.slug).trim().toLowerCase() === String(historyItem.targetPage.slug).trim().toLowerCase();
  }
  return true;
}

function matchingHistory(action, history = []) {
  return (history || []).find((item) =>
    item?.source === action?.source &&
    item?.code === action?.code &&
    sameTarget(action, item)
  ) || null;
}

function cooldownDaysFor(action) {
  return SOURCE_COOLDOWN_DAYS[action?.source] || DEFAULT_COOLDOWN_DAYS;
}

function applySeoActionCooldown(queue, history = [], now = new Date()) {
  const actions = Array.isArray(queue?.actions) ? queue.actions : [];
  const visible = [];
  const suppressed = [];

  for (const item of actions) {
    const previous = matchingHistory(item, history);
    const ageDays = daysSince(previous?.executedAt, now);
    const cooldownDays = cooldownDaysFor(item);
    const coolingDown = ageDays != null && ageDays < cooldownDays;

    if (coolingDown) {
      suppressed.push({
        ...item,
        cooldown: {
          active: true,
          executedAt: previous.executedAt,
          ageDays,
          cooldownDays,
          remainingDays: Math.max(0, cooldownDays - ageDays),
        },
      });
    } else {
      visible.push(item);
    }
  }

  return {
    ...queue,
    version: "1.2",
    total: visible.length,
    highPriority: visible.filter((item) => ["critical", "high"].includes(item.priority)).length,
    suppressedCount: suppressed.length,
    actions: visible,
    suppressed: suppressed.slice(0, 30),
  };
}

module.exports = {
  DEFAULT_COOLDOWN_DAYS,
  SOURCE_COOLDOWN_DAYS,
  daysSince,
  sameTarget,
  matchingHistory,
  cooldownDaysFor,
  applySeoActionCooldown,
};

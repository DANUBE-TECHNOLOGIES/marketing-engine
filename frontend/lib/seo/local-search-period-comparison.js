const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== text) return null;
  return date;
}

export function localSearchPeriodDays(period = null) {
  const start = parseDateOnly(period?.start);
  const end = parseDateOnly(period?.end);
  if (!start || !end || end < start) return null;
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function compareLocalSearchPeriods(baselinePeriod = null, currentPeriod = null) {
  const baselineDays = localSearchPeriodDays(baselinePeriod);
  const currentDays = localSearchPeriodDays(currentPeriod);

  if (baselineDays == null || currentDays == null) {
    return {
      status: "unknown",
      baselineDays,
      currentDays,
      comparable: false,
    };
  }

  const comparable = baselineDays === currentDays;
  return {
    status: comparable ? "comparable" : "not-comparable",
    baselineDays,
    currentDays,
    comparable,
  };
}

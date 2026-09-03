export function localSearchPeriod({ startDate, endDate } = {}) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    days,
  };
}

export function comparableLocalSearchPeriods(a, b) {
  const first = localSearchPeriod(a);
  const second = localSearchPeriod(b);
  return Boolean(first && second && first.days === second.days);
}

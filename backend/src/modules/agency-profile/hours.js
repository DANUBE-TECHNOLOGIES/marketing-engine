"use strict";

const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

function normalizeTime(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 5);
  const hours = String(value.hours ?? value.hour ?? 0).padStart(2, "0");
  const minutes = String(value.minutes ?? value.minute ?? 0).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function normalizeRegularHours(input) {
  const periods = input?.periods || input?.regularHours?.periods || [];
  return periods.map((period) => ({
    openDay: period.openDay || period.openDayOfWeek,
    openTime: normalizeTime(period.openTime),
    closeDay: period.closeDay || period.closeDayOfWeek,
    closeTime: normalizeTime(period.closeTime),
  })).filter((period) =>
    period.openDay && period.openTime && period.closeDay && period.closeTime
  );
}

function normalizeSpecialHours(input) {
  const periods = input?.specialHourPeriods || input?.specialHours?.specialHourPeriods || [];
  return periods.map((period) => ({
    startDate: period.startDate || null,
    endDate: period.endDate || period.startDate || null,
    openTime: normalizeTime(period.openTime),
    closeTime: normalizeTime(period.closeTime),
    closed: Boolean(period.closed),
  }));
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function dateKey(date, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekday(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date).toUpperCase();
}

function localMinutes(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function dateObjectToKey(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value.year !== undefined && value.month !== undefined && value.day !== undefined) {
    return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
  }
  return null;
}

function specialPeriodsForDate(specialHours, todayKey) {
  return (specialHours || []).filter((period) => {
    const start = dateObjectToKey(period.startDate);
    const end = dateObjectToKey(period.endDate || period.startDate);
    return start && end && todayKey >= start && todayKey <= end;
  });
}

function statusForHours(regularHours, specialHours, timezone = "Europe/Paris", now = new Date()) {
  const todayKey = dateKey(now, timezone);
  const today = weekday(now, timezone);
  const currentMinutes = localMinutes(now, timezone);
  const special = specialPeriodsForDate(specialHours, todayKey);

  if (special.some((period) => period.closed)) {
    return {
      isOpen: false,
      label: "Fermé aujourd’hui",
      closesAt: null,
      opensAt: null,
      source: "special",
    };
  }

  const sourcePeriods = special.length
    ? special
    : (regularHours || []).filter((period) => period.openDay === today);

  for (const period of sourcePeriods) {
    if (!period.openTime || !period.closeTime) continue;

    const open = minutesFromTime(period.openTime);
    const close = minutesFromTime(period.closeTime);

    if (currentMinutes >= open && currentMinutes < close) {
      return {
        isOpen: true,
        label: `Ouvert · ferme à ${period.closeTime}`,
        closesAt: period.closeTime,
        opensAt: null,
        source: special.length ? "special" : "regular",
      };
    }

    if (currentMinutes < open) {
      return {
        isOpen: false,
        label: `Fermé · ouvre à ${period.openTime}`,
        closesAt: null,
        opensAt: period.openTime,
        source: special.length ? "special" : "regular",
      };
    }
  }

  return {
    isOpen: false,
    label: "Fermé",
    closesAt: null,
    opensAt: null,
    source: special.length ? "special" : "regular",
  };
}

function weeklySchedule(regularHours = []) {
  return DAYS.map((day) => ({
    day,
    periods: regularHours
      .filter((period) => period.openDay === day)
      .map((period) => ({
        openTime: period.openTime,
        closeTime: period.closeTime,
      })),
  }));
}

module.exports = {
  normalizeRegularHours,
  normalizeSpecialHours,
  statusForHours,
  weeklySchedule,
};

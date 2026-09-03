"use strict";
function grade(score) { if (score >= 90) return "A"; if (score >= 75) return "B"; if (score >= 60) return "C"; if (score >= 40) return "D"; return "E"; }
function calculate(checks) {
  const possible = checks.reduce((sum, item) => sum + item.weight, 0);
  const earned = checks.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;
  const categories = {};
  for (const check of checks) {
    const current = categories[check.category] || { earned: 0, possible: 0 };
    current.possible += check.weight;
    if (check.passed) current.earned += check.weight;
    categories[check.category] = current;
  }
  Object.keys(categories).forEach(key => { const item = categories[key]; item.score = item.possible ? Math.round(item.earned / item.possible * 100) : 0; });
  return { score, grade: grade(score), earned, possible, categories };
}
module.exports = { calculate, grade };

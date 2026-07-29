function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function validatePlanInput(input = {}) {
  const destinationSlug = String(input.destinationSlug || input.destination || '').trim();
  if (!destinationSlug) {
    const error = new Error('destinationSlug est obligatoire');
    error.statusCode = 400;
    throw error;
  }
  return {
    destinationSlug,
    siteId: input.siteId ? String(input.siteId) : null,
    siteSlug: input.siteSlug ? String(input.siteSlug) : null,
    scope: input.scope === 'portfolio' ? 'portfolio' : 'site',
    limit: parsePositiveInt(input.limit, 20, 50)
  };
}

module.exports = { validatePlanInput };

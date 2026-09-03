function validatePlan(payload = {}) {
  const errors = [];
  if (!payload.startDate) errors.push("startDate est requis");
  if (!payload.endDate) errors.push("endDate est requis");
  if (!Array.isArray(payload.destinations) || payload.destinations.length === 0) errors.push("destinations doit contenir au moins un élément");
  if (payload.postsPerWeek !== undefined && (Number(payload.postsPerWeek) < 1 || Number(payload.postsPerWeek) > 7)) errors.push("postsPerWeek doit être compris entre 1 et 7");
  if (errors.length) {
    const error = new Error(errors.join("; "));
    error.status = 400;
    throw error;
  }
  return payload;
}
module.exports = { validatePlan };

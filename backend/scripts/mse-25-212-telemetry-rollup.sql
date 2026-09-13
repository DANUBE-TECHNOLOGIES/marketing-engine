SELECT
  "siteSlug",
  COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='VIEW') AS views,
  COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='START') AS starts,
  COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='FORM_REACHED') AS form_reached,
  COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='LEAD_SUBMIT') AS lead_submits
FROM "AcquisitionFunnelEvent"
GROUP BY "siteSlug"
ORDER BY views DESC;

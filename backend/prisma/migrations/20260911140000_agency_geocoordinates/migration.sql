-- MSE-25.214 — network agency GeoCoordinates persistence.
-- Nullable additive fields: no existing agency record is rewritten.

ALTER TABLE "Agency"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "Agency"
  ADD CONSTRAINT "Agency_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));

ALTER TABLE "Agency"
  ADD CONSTRAINT "Agency_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

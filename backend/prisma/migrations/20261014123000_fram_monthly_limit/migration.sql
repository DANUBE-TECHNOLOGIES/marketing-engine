CREATE OR REPLACE FUNCTION fram_monthly_offer_guard() RETURNS trigger AS $$
DECLARE offer_count integer;
BEGIN
 IF NEW."type" = 'EXCLUS_AMBASSADE' AND NEW."status" = 'PUBLISHED' THEN
  PERFORM pg_advisory_xact_lock(hashtext('fram-month:' || NEW."campaignMonth"));
  SELECT count(*) INTO offer_count FROM "FramOffer"
   WHERE "type" = 'EXCLUS_AMBASSADE' AND "status" = 'PUBLISHED'
   AND "campaignMonth" = NEW."campaignMonth" AND "id" <> NEW."id";
  IF offer_count >= 4 THEN
   RAISE EXCEPTION 'Monthly FRAM offer limit exceeded' USING ERRCODE = '23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER fram_monthly_offer_guard_trigger
BEFORE INSERT OR UPDATE OF "type", "status", "campaignMonth" ON "FramOffer"
FOR EACH ROW EXECUTE FUNCTION fram_monthly_offer_guard();

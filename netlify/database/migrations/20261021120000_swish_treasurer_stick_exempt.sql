-- Swish-inställningar, kassabehörighet för spelare, rabattundantag för Avslagen klubba
-- och databasskydd för anmälningar. Endast tillägg – inga befintliga belopp eller statusar ändras.

-- 1. Swish: mottagarens nummer och namn (konfigureras av administratören).
INSERT INTO settings (key, value) VALUES ('swish_number', ''), ('swish_name', '') ON CONFLICT (key) DO NOTHING;

-- 2. Kassabehörighet: får registrera verifierade betalningar. Kopplad till spelar-ID.
ALTER TABLE players ADD COLUMN can_register_payments INTEGER NOT NULL DEFAULT 0 CHECK (can_register_payments IN (0, 1));
-- Johannes med tröjnummer 2 – bara om exakt en sådan riktig, aktiv spelare finns.
UPDATE players SET can_register_payments = 1
WHERE jersey = '2' AND lower(first_name) LIKE 'johannes%' AND is_demo = 0 AND active = 1
  AND (SELECT COUNT(*) FROM players WHERE jersey = '2' AND lower(first_name) LIKE 'johannes%' AND is_demo = 0 AND active = 1) = 1;

-- 3. Böteskategorier som aldrig får juniorrabatt. Avslagen klubba (typ "stick") kostar alltid fullt.
ALTER TABLE categories ADD COLUMN junior_exempt INTEGER NOT NULL DEFAULT 0 CHECK (junior_exempt IN (0, 1));
UPDATE categories SET junior_exempt = 1 WHERE kind = 'stick';

-- 4. Anmälningar: en avgjord anmälan (godkänd/avslagen) kan aldrig byta status igen, och en
--    godkänd anmälan måste peka på just den bot som skapades för den.
CREATE OR REPLACE FUNCTION fine_reports_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('approved', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Anmälan % är redan avgjord', OLD.report_no USING ERRCODE = 'P0001';
  END IF;
  IF OLD.fine_id IS NOT NULL AND NEW.fine_id IS DISTINCT FROM OLD.fine_id THEN
    RAISE EXCEPTION 'Anmälan % är redan kopplad till en bot', OLD.report_no USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'approved' AND NOT EXISTS (SELECT 1 FROM fines WHERE id = NEW.fine_id AND report_id = NEW.id) THEN
    RAISE EXCEPTION 'Godkänd anmälan % saknar sin egen bot', NEW.report_no USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER fine_reports_guard BEFORE UPDATE ON fine_reports FOR EACH ROW EXECUTE FUNCTION fine_reports_guard();

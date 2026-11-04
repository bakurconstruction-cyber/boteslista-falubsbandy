-- Aktiv månad: den månad administratören har valt som aktiv. Styr Swish-meddelandet
-- ("Böter November"), startsidans kort "Aktiv månads böter" och vilken månad Månadsskifte öppnar.
-- Endast ett tillägg i settings – inga befintliga rader ändras.
-- Startvärde: innevarande månad (svensk tid) när migrationen körs, begränsad till den aktiva säsongen.
-- Därefter ändras den bara när administratören byter aktiv månad.
INSERT INTO settings (key, value)
SELECT 'active_month', GREATEST(substr(s.start_date, 1, 7), LEAST(substr(s.end_date, 1, 7), to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM')))
FROM seasons s WHERE s.active = 1
ORDER BY s.id DESC LIMIT 1
ON CONFLICT (key) DO NOTHING;

-- Spelarkonton, bötesanmälningar och juniorrabatt.
-- Endast tillägg: inga tabeller eller kolumner tas bort och inga befintliga belopp ändras.

-- 1. Ny roll "player" (spelarkonto) och koppling konto → spelar-ID.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','viewer','player'));
ALTER TABLE users ADD COLUMN player_id TEXT REFERENCES players(id);
CREATE UNIQUE INDEX users_one_account_per_player ON users (player_id) WHERE player_id IS NOT NULL;

-- 2. Juniorrabatt per spelare (procent, 0 = ingen rabatt). Kopplad till spelar-ID, inte tröjnummer.
ALTER TABLE players ADD COLUMN junior_discount INTEGER NOT NULL DEFAULT 0 CHECK (junior_discount IN (0, 50));

-- 3. Böter: ordinarie belopp och rabatt sparas på boten när den blir officiell.
--    amount = belopp att betala (som tidigare). Befintliga böter: base_amount NULL = ingen rabatt.
ALTER TABLE fines ADD COLUMN base_amount INTEGER;
ALTER TABLE fines ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fines ADD COLUMN discount_pct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fines ADD COLUMN report_id INTEGER;
-- En anmälan kan aldrig bli mer än en bot – garanteras av databasen även vid samtidiga klick.
CREATE UNIQUE INDEX fines_one_per_report ON fines (report_id) WHERE report_id IS NOT NULL;
ALTER TABLE fines ADD CONSTRAINT fines_discount_consistent CHECK (
  discount_amount >= 0 AND discount_pct BETWEEN 0 AND 100
  AND (base_amount IS NULL OR amount = base_amount - discount_amount)
  AND (base_amount IS NOT NULL OR discount_amount = 0)
);

-- 4. Bötesanmälningar. Påverkar varken skuld, kassa eller leaderboard förrän de godkänts
--    och blivit en officiell bot (fine_id). fine_id är unik → en anmälan kan bara ge en bot.
CREATE TABLE fine_reports (
  id SERIAL PRIMARY KEY,
  report_no TEXT NOT NULL UNIQUE,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  category_name TEXT NOT NULL,
  category_number INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL CHECK (amount > 0),
  incident_date TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  reporter_user_id INTEGER NOT NULL REFERENCES users(id),
  reporter_player_id TEXT REFERENCES players(id),
  reporter_name TEXT NOT NULL,
  reporter_jersey TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','disputed','approved','rejected')),
  dispute_reason TEXT, disputed_at TEXT,
  decided_by TEXT, decided_at TEXT, decision_note TEXT,
  approved_by_player INTEGER NOT NULL DEFAULT 0,
  fine_id INTEGER UNIQUE REFERENCES fines(id),
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  CHECK (reporter_player_id IS NULL OR reporter_player_id <> player_id),
  CHECK ((status = 'approved') = (fine_id IS NOT NULL))
);
CREATE INDEX fine_reports_player ON fine_reports(player_id);
CREATE INDEX fine_reports_status ON fine_reports(status);

INSERT INTO counters (name, value) VALUES ('report', 0) ON CONFLICT (name) DO NOTHING;

-- 5. Juniorrabatt för nuvarande nr 10 – bara om exakt en riktig, aktiv spelare har nummer 10.
--    Kopplingen sker till spelarens ID; byter han nummer senare följer rabatten med honom.
UPDATE players SET junior_discount = 50
WHERE jersey = '10' AND is_demo = 0 AND active = 1
  AND (SELECT COUNT(*) FROM players WHERE jersey = '10' AND is_demo = 0 AND active = 1) = 1;

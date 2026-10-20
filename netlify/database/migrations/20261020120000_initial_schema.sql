-- Böteskassan 26/27 – grundschema. Alla belopp i öre (heltal).
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE users (
  id SERIAL PRIMARY KEY, username TEXT NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','viewer')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX users_username_lower ON users (lower(username));
CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
CREATE TABLE players (
  id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, jersey TEXT, position TEXT,
  active INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '', is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE categories (
  id SERIAL PRIMARY KEY, number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, default_amount INTEGER NOT NULL,
  kind TEXT NOT NULL, unit_note TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE fines (
  id SERIAL PRIMARY KEY, fine_no TEXT NOT NULL UNIQUE, season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id TEXT NOT NULL REFERENCES players(id), category_id INTEGER NOT NULL REFERENCES categories(id),
  category_name TEXT NOT NULL, category_number INTEGER NOT NULL, kind TEXT NOT NULL,
  issued_date TEXT NOT NULL, due_date TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1, amount INTEGER NOT NULL CHECK (amount > 0),
  ref_fine_id INTEGER REFERENCES fines(id), rule_key TEXT, calc TEXT,
  voided INTEGER NOT NULL DEFAULT 0, void_reason TEXT, voided_at TEXT, voided_by TEXT,
  registered_by TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX fines_player ON fines(player_id);
CREATE UNIQUE INDEX fines_rule_unique ON fines(player_id, rule_key) WHERE rule_key IS NOT NULL AND voided = 0;
CREATE TABLE payments (
  id SERIAL PRIMARY KEY, payment_no TEXT NOT NULL UNIQUE, season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id TEXT NOT NULL REFERENCES players(id), date TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL, reference TEXT NOT NULL DEFAULT '', comment TEXT NOT NULL DEFAULT '',
  reversed INTEGER NOT NULL DEFAULT 0, reverse_reason TEXT, reversed_at TEXT, reversed_by TEXT,
  idempotency_key TEXT UNIQUE, registered_by TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE allocations (
  id SERIAL PRIMARY KEY, payment_id INTEGER NOT NULL REFERENCES payments(id), fine_id INTEGER NOT NULL REFERENCES fines(id),
  amount INTEGER NOT NULL CHECK (amount > 0), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
  released_at TEXT, release_reason TEXT
);
CREATE INDEX alloc_fine ON allocations(fine_id);
CREATE INDEX alloc_payment ON allocations(payment_id);
CREATE TABLE cash_events (
  id SERIAL PRIMARY KEY, event_no TEXT NOT NULL UNIQUE, season_id INTEGER NOT NULL REFERENCES seasons(id),
  type TEXT NOT NULL CHECK (type IN ('income','expense','refund')), date TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL, player_id TEXT REFERENCES players(id), voided INTEGER NOT NULL DEFAULT 0, void_reason TEXT,
  registered_by TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE month_closings (
  season_id INTEGER NOT NULL, period TEXT NOT NULL, closed_by TEXT NOT NULL, closed_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '', PRIMARY KEY (season_id, period)
);
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY, ts TEXT NOT NULL, username TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL,
  entity_id TEXT, old_value TEXT, new_value TEXT, reason TEXT
);

-- Startdata
INSERT INTO seasons (name, start_date, end_date, active) VALUES ('2026/2027', '2026-08-01', '2027-04-30', 1);
INSERT INTO categories (number, name, default_amount, kind, unit_note) VALUES
  (1, 'Glömd pryl', 5000, 'per_item', 'per pryl'),
  (2, 'Ostädad plats', 10000, 'fixed', ''),
  (3, 'Fartrand i toalett', 5000, 'fixed', ''),
  (4, 'Spets på träning', 2500, 'fixed', ''),
  (5, 'Spets på match', 5000, 'fixed', ''),
  (6, 'Fel färg på tröja/damask', 5000, 'fixed', ''),
  (7, 'Huvudbonad under måltid med laget', 5000, 'fixed', ''),
  (8, 'Försenad till is/fys', 10000, 'fixed', ''),
  (9, 'Bild i tidning', 2500, 'fixed', ''),
  (10, 'Intervju med media', 10000, 'fixed', ''),
  (11, 'Ej med ut på stan under lagfest', 25000, 'fixed', ''),
  (12, 'Telefonsignal under teori', 20000, 'fixed', ''),
  (13, 'Telefon framme efter isvärmning', 15000, 'fixed', ''),
  (14, 'Försenad till samling', 20000, 'fixed', ''),
  (15, 'Gör så bussen inte åker utsatt tid', 20000, 'fixed', ''),
  (16, 'Onödig utvisning (går till öråd)', 20000, 'fixed', ''),
  (17, 'Ej skött städvecka', 30000, 'per_item', 'per person'),
  (18, 'Avslagen klubba', 0, 'stick', '50 % av klubbans värde + ny klubba'),
  (19, 'Skorna ej på hyllan', 5000, 'fixed', ''),
  (20, 'Glömd fika vid födelsedag', 30000, 'fixed', ''),
  (21, 'Ej profilklädd till match', 10000, 'fixed', ''),
  (22, 'Inte fått några böter på 2 veckor', 2000, 'no_fines', 'särskild regel'),
  (23, 'Minst böter till kassan efter säsong', 30000, 'least_fines', 'säsongsregel'),
  (24, 'Siste man har glömt att slå på tvättmaskinen', 10000, 'fixed', ''),
  (25, 'Kliva på klubbmärket', 50000, 'fixed', ''),
  (26, 'Inte klickat i laget.se', 5000, 'fixed', ''),
  (27, 'Glömt hänga tillbaka matchtröjan', 10000, 'fixed', ''),
  (28, 'Planterad bot', 0, 'planted', 'samma belopp som den planterade boten'),
  (29, 'Ej betalat in böter senast sista dagen i månaden', 20000, 'late', 'särskild regel');
INSERT INTO settings (key, value) VALUES
  ('team_name', 'Falu BS Bandy'),
  ('start_balance', '0'),
  ('payment_info', 'Swish till kassören: 07X-XXX XX XX (ändra under Inställningar)'),
  ('rule22_enabled', '1'), ('rule22_days', '14'), ('rule23_enabled', '1'), ('rule29_enabled', '1');
INSERT INTO counters (name, value) VALUES
  ('fine', 0), ('payment', 0), ('player', 0), ('cash', 0),
  ('demo_fine', 0), ('demo_payment', 0), ('demo_player', 0), ('demo_cash', 0);

# Böteskassan 26/27

Webbapp för ett bandylags böteskassa säsongen 2026/2027: spelare, bötesregister med löpande bötesnummer, inbetalningar med fördelning mot böter, tillgodohavanden, kassaredovisning, leaderboard, månadsskifte med påminnelser, särskilda regler (22, 23, 29), roller och ändringslogg.

## Teknik

| Del | Val |
|---|---|
| Drift | **Netlify**: gränssnittet från `public/`, API:t som en Netlify Function (`netlify/functions/api.mjs` → `server/app.js`) |
| Databas | **Netlify Database** (Postgres). Schema och böteslistan 2026/2027 i `netlify/database/migrations/` – Netlify skapar databasen och kör migrationen automatiskt vid första deploy. |
| Inloggning | Egna konton, lösenord hashade med scrypt, sessionscookie (HttpOnly, SameSite=Strict, Secure) |
| Gränssnitt | Vanilla JavaScript + egen CSS, inget byggsteg |

Belopp lagras i **öre** (heltal). Alla ändringar körs i databastransaktioner med lås, så bötesnummer aldrig dubbleras även om två registrerar samtidigt. Datum i svensk tid.

## Publicera på Netlify (projektet boteslista-falubsbandy)

Enklast från din dator, i mappen `boteskassan`:

```bash
npm install -g netlify-cli
netlify login
netlify link --id 81d22cb5-8259-406d-8e8b-155a23c84fbb
netlify deploy --build --prod
```

Alternativt: lägg mappen i ett GitHub-repo och koppla repot till projektet i Netlify (Project configuration → Build & deploy → Link repository). Då publiceras varje push automatiskt.

Efter första deploy:
1. Öppna https://boteslista-falubsbandy.netlify.app och skapa administratörskontot direkt – **den som öppnar sidan först blir administratör**.
2. Kontrollera under **Data & Storage → Database** i Netlify att databasen skapats. Netlify Database kräver en kreditbaserad plan och förbrukar krediter.

## Köra lokalt (för test)

Krav: Node.js 20.12+.

```bash
npm install
npm start          # http://localhost:3000
```

Utan `DATABASE_URL` startar en lokal Postgres-kompatibel databas automatiskt (sparas i `data/pg`). Med `DATABASE_URL=postgres://…` används den databasen.

## Kom igång i appen

1. **Första gången** skapar du ett administratörskonto (minst 8 tecken i lösenordet).
2. **Inställningar → Allmänt**: lagets namn, Swish-nummer och startsaldo.
3. **Spelare**: lägg till en i taget eller *Importera CSV* (mall: `exempel-spelare.csv`, kolumner `förnamn;efternamn;tröjnummer;position;anteckningar`).
4. **Inställningar → Användare**: skapa ett läskonto åt laget (roll *Läsbehörighet*).

Exempeldata (märkt "Exempel", nummer `X-…`) kan läggas in och tas bort under **Inställningar → Export & data** utan att riktiga uppgifter påverkas.

Kortkommandon: **N** = ny bot, **B** = ny inbetalning.

## Hur reglerna fungerar

- **Sista betalningsdag** = sista kalenderdagen i den månad boten utfärdades (kan ändras per bot).
- **Bot 18 (klubba):** ange klubbans värde och kostnad för ny klubba – beräkningen visas innan du registrerar.
- **Bot 28 (planterad):** ange ursprungligt bötesnummer; beloppet hämtas automatiskt och den nya boten får eget nummer.
- **Bot 22, 23, 29:** registreras via sidan **Regler** (29 även från **Månadsskifte**). Appen räknar fram förslag automatiskt, men **ingen bot registreras utan att en administratör godkänner**. Databasen stoppar dubbletter för samma period. Reglerna slås på/av under Inställningar → Regler.
- **Makulering** kräver anledning. Boten finns kvar i historiken men räknas inte; redan betalda pengar blir tillgodohavande. Bötesnummer återanvänds aldrig.
- **Betalningar** raderas aldrig. Fel rättas med *Återför* eller *Korrigera* (återför + ny registrering), alltid med anledning.
- **Kassasaldo** = startsaldo + inbetalningar + övriga inkomster − återbetalningar − utgifter. Obetalda böter räknas inte som pengar.
- **Påminnelser** skickas inte automatiskt – appen skapar text som du kopierar till lagets chatt.

## Tester

```bash
npm test
```

Testerna kör hela API:t mot en tillfällig databas och täcker: behörigheter, registrering och löpande bötesnummer, delbetalning, full betalning, överbetalning/tillgodohavande/återbetalning, makulering, förseningsbot vid månadsskifte (inkl. dubblettskydd), planterad bot, klubbberäkning, leaderboard med delade placeringar, kassasaldo efter betalningar/utgifter/återföring, ändringslogg, export, CSV-import och att exempeldata kan tas bort utan att röra riktiga data.

## Säkerhetskopiering

**Inställningar → Export & data**: hela databasen som JSON plus CSV för varje register och månads-/säsongsrapporter. Ladda ned vid varje månadsskifte. Netlify Database har dessutom egna ögonblicksbilder (snapshots) i Netlifys gränssnitt.

### Miljövariabler (valfria)
| Variabel | Beskrivning |
|---|---|
| `DATABASE_URL` | Använd en egen Postgres i stället för Netlify Database |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Skapar första administratören automatiskt om inga användare finns |

## Begränsningar att känna till
- En säsong (2026/2027) är aktiv. Datamodellen har säsonger, men gränssnitt för att starta en ny säsong finns inte ännu.
- Inga automatiska integrationer: Swish, bank eller chatt är inte kopplade. Inbetalningar registreras manuellt och påminnelser kopieras manuellt.
- Kör appen över HTTPS om den nås via internet.

## Filstruktur
```
netlify/database/migrations/  schema och startdata (böteslistan)
netlify/functions/api.mjs     Netlify Function som kör API:t
server/db.js       databasanslutning, transaktioner, nummerräknare
server/logic.js    alla beräkningar: saldon, status, leaderboard, regler, kassa
server/ops.js      alla ändringar med validering och ändringslogg
server/app.js      API, inloggning, behörigheter, export
server/local.js    lokal server för test
public/            gränssnittet (index.html, styles.css, js/)
test/              automatiska tester av arbetsflödena
```

## Om funktionen
`netlify/functions/api.mjs` är en färdigpaketerad fil (allt inklusive `pg` i en fil). Källan är `netlify/src/api.mjs`. Efter ändringar i `server/` bygger du om den med:

```bash
npx esbuild netlify/src/api.mjs --bundle --platform=node --target=node20 --format=esm --external:pg-native --outfile=netlify/functions/api.mjs --banner:js="import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);"
```
(och ändra sedan `var config` till `export const config` i slutet av filen)

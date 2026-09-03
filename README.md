# Medical Operations Center – Routenkalkulation

Webapp für die Routenkalkulation im Medical Operations Center: Transporteure
(Kreisverbände, Ortsvereine, externe Dienstleister) verwalten und für eine
Patientenfahrt (Start, Ziel, bis zu 5 Zwischenstopps) die wirtschaftlichsten
Transporteure **entlang der gesamten Route** finden – nicht nur rund um Start
und Ziel.

## Funktionen

- **Login, Benutzerverwaltung, Einladungen, Passwort-Reset** (Administrator)
- **Transporteur-Verwaltung**: Typ (Kreisverband/Ortsverein/Extern),
  Fahrzeugtypen (PKW/VAN/KTW/N-KTW/RTW/ITW), Ärzte ja/nein, Tempurmatratze
  ja/nein, Kunden-Zuordnung, Standort per Adresssuche
- **Excel-Import** für Transporteur-Stammdaten (Anlegen + Aktualisieren)
- **Kundenverwaltung** (nicht jeder Verband fährt für jeden Kunden)
- **Routenkalkulation**: Start/Ziel/bis zu 5 Zwischenstopps per
  Adress-Autocomplete (Photon/OSM), per Drag & Drop umsortierbar (Ziel vor
  Start ziehen vertauscht die Rollen entsprechend), Routing über
  OpenRouteService, für **alle** passenden Transporteure (bundesweit, kein
  Entfernungs-Vorfilter) wird der echte Gesamtumlauf berechnet (Basis →
  Start → … → Ziel → zurück zur Basis), Top-5-Liste mit „Mehr laden“.
  Kartenmarker unterscheiden DRK-Verband (grün) und Drittverband (gelb);
  optionale Live-Vorschau aller Standorte eines Fahrzeugtyps auf der Karte
  vor der Berechnung
- **Notfalltransport-Modus**: Suche eingeschränkt auf als „Leistungsstark“
  markierte Verbände, in der Statistik gesondert gekennzeichnet, es werden
  mindestens die Top 3 Transporteure je Anfrage getrackt
- **Statistik/Logging**: Anfrageverlauf je Disponent (Benutzerprofil) und
  aggregierte Auswertung für Administratoren (inkl. Top-3-Transporteure und
  Notfall-Kennzeichnung je Anfrage)
- **Reports (Administratoren + Rolle „Business Development“)**: Monats-,
  Jahres- oder frei wählbarer Zeitraum als präsentationsfertiges PDF
  (Kennzahlen, Diagramm nach Fahrzeugtyp, Top-Transporteure, Auswertung nach
  Kunde/Disponent) unter `/reports`
- **Puffer-Staffel** (Einstellungen): Administratoren können einen nach
  Gesamtumlauf gestaffelten km-Aufschlag definieren (z. B. „< 50 km: kein
  Puffer, 50–150 km: 5 km, > 150 km: 15 km“), der auf den angezeigten
  Gesamtumlauf aufgeschlagen wird (die Wirtschaftlichkeits-Rangfolge selbst
  bleibt unbeeinflusst). Pro Kunde individualisierbar oder deaktivierbar –
  eine kundenspezifische Staffel ersetzt die allgemeine, es wird nie addiert.

## Tech-Stack

Next.js (App Router, TypeScript) · PostgreSQL + PostGIS · Prisma ·
Leaflet/OpenStreetMap · OpenRouteService · Photon · Nodemailer (SMTP) ·
Docker Compose + Caddy (automatisches HTTPS)

## Lokale Entwicklung

Voraussetzungen: Node.js 22+, eine PostgreSQL-Datenbank mit PostGIS-Extension
(lokal per `docker compose up db` oder eigene Installation).

```bash
npm install
cp .env.example .env   # Werte anpassen, siehe unten
npx prisma migrate dev
npm run seed            # legt einen Admin-Account an
npm run dev
```

Der Seed-Befehl legt standardmäßig `admin@example.com` / `changeme123` an.
Mit den Umgebungsvariablen `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` lässt
sich das anpassen:

```bash
SEED_ADMIN_EMAIL=deine@adresse.de SEED_ADMIN_PASSWORD=EinSicheresPasswort npm run seed
```

**Wichtig:** Bitte das initiale Passwort nach dem ersten Login sofort über
„Passwort zurücksetzen“ ändern.

## Umgebungsvariablen (`.env`)

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindung (Datenbank braucht die PostGIS-Extension) |
| `SESSION_SECRET` | Langer, zufälliger String zum Signieren der Login-Sessions – **in Produktion unbedingt ändern** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Zugangsdaten des bestehenden Mailservers für Einladungs-/Reset-Mails |
| `ORS_API_KEY` | API-Key von [openrouteservice.org](https://openrouteservice.org/dev/#/signup) (kostenloses Kontingent reicht dank Matrix-API i. d. R. aus) |
| `PHOTON_URL` | Standard: `https://photon.komoot.io/api`. Bei hohem Volumen ggf. eigenen Photon-Server eintragen |
| `GEOCODER_CONTACT_EMAIL` | Kontakt-E-Mail für den User-Agent (Höflichkeitsstandard, kein Zwang) |
| `APP_URL` | Öffentliche Basis-URL der App (für Links in E-Mails) |

## Excel-Import: erwartete Spalten

Die Import-Funktion (Transporteure → „Excel-Import“) erkennt folgende
Spaltenüberschriften (Groß-/Kleinschreibung egal). **Sobald ihr die
tatsächliche Struktur eures CRM-Exports habt**, bitte die Zuordnung in
`src/lib/organizationImport.ts` (Objekt `COLUMNS`) an die echten
Spaltennamen anpassen – die Logik selbst bleibt gleich.

| Spalte(n) | Bedeutung |
|---|---|
| `ID` / `CRM-ID` / `Kürzel` | Eindeutige ID zum Wiedererkennen bei erneutem Import (optional, sonst wird nach `Name` gematcht) |
| `Name` | Name des Transporteurs (**Pflichtfeld**) |
| `Typ` | „Kreisverband“, „Ortsverein“ oder „Extern“ |
| `Straße`, `PLZ`, `Ort`, `Land` | Adresse (wird geokodiert, falls keine Koordinaten angegeben sind) |
| `Breitengrad` / `Längengrad` | Koordinaten (optional, wenn Adresse vorhanden) |
| `PKW`, `VAN`, `KTW`, `N-KTW`, `RTW`, `ITW` | „Ja“/„Nein“ je Fahrzeugtyp |
| `Ärzte` | „Ja“/„Nein“ |
| `Tempurmatratze` | „Ja“/„Nein“ |
| `Kunden` | Kundennamen, durch Komma/Semikolon getrennt (werden bei Bedarf automatisch angelegt) |
| `Kontakt Name`, `Kontakt Telefon`, `Kontakt E-Mail` | optional |
| `Aktiv` | „Ja“/„Nein“ (Standard: Ja) |
| `Notizen` | optional |

Ein erneuter Import mit gleicher `ID` (bzw. gleichem `Name`) **aktualisiert**
den bestehenden Datensatz, statt ihn zu duplizieren.

## Deployment auf einem Hetzner Cloud Server

1. **Server erstellen**: Hetzner Cloud, z. B. Typ CX22 (2 vCPU/4 GB RAM),
   Ubuntu 24.04. Domain (A-Record) auf die Server-IP zeigen lassen.
2. **Docker installieren** (auf dem Server):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Repository klonen** und `.env` konfigurieren:
   ```bash
   git clone <repo-url> medical-operations-center
   cd medical-operations-center
   cp .env.example .env
   nano .env   # SESSION_SECRET, SMTP_*, ORS_API_KEY, APP_URL (https://eure-domain.de) eintragen
   ```
4. **Domain für Caddy hinterlegen** (automatisches HTTPS via Let's Encrypt):
   ```bash
   echo "DOMAIN=eure-domain.de" >> .env
   ```
5. **Starten**:
   ```bash
   docker compose up -d --build
   ```
   Dabei wendet der einmalige `migrate`-Dienst automatisch alle
   Datenbank-Migrationen an (inkl. Aktivierung der PostGIS-Extension),
   bevor die App startet.
6. **Admin-Account anlegen**:
   ```bash
   docker compose exec \
     -e SEED_ADMIN_EMAIL=deine@adresse.de \
     -e SEED_ADMIN_PASSWORD=EinSicheresPasswort \
     app node prisma/seed.cjs
   ```
7. Caddy stellt die App automatisch per HTTPS unter der konfigurierten Domain
   bereit (Ports 80/443).

### Updates einspielen

```bash
git pull
docker compose up -d --build
```

## Bekannte Einschränkungen / Annahmen

- **Rückweg-Distanz**: Die Strecke „Ziel → Basis“ wird näherungsweise gleich
  der Strecke „Basis → Ziel“ gesetzt (kein zweiter Matrix-Call pro
  Kandidat), da Einbahnstraßen-Effekte auf Fernstrecken i. d. R.
  vernachlässigbar sind.
- **Fahrzeugprofil**: Alle Fahrzeugtypen werden aktuell mit dem
  ORS-Routing-Profil „driving-car“ berechnet (kein spezielles
  Rettungswagen-Profil verfügbar).
- **Photon**: Öffentlicher Server (komoot), aus Fairness gedrosselt (im Code
  per Warteschlange). Bei sehr hohem Suchvolumen ggf. einen eigenen
  Photon-Server betreiben und `PHOTON_URL` anpassen.
- **OpenRouteService Free-Tier**: Dank Matrix-API (ein Call für alle
  Kandidaten) reicht das kostenlose Kontingent für den beschriebenen
  Anwendungsfall i. d. R. aus. Bei Bedarf ist ein Umstieg auf selbst
  gehostetes OSRM möglich, ohne die App-Logik umzubauen (nur `src/lib/ors.ts`
  betroffen).
- **Kein geografischer Vorfilter bei der Transporteur-Suche**: Es wird für
  *alle* Transporteure, die Fahrzeugtyp/Arzt/Tempurmatratze/Kunde erfüllen,
  der echte Gesamtumlauf über die Matrix-API berechnet (bundesweit, in
  Batches von 1000 pro Aufruf) statt vorher nach Entfernung zur Route zu
  filtern. Ein reiner Entfernungs-Vorfilter (z. B. "nur Transporteure im
  30-km-Korridor") wäre ungenau: Ein Transporteur, der weiter von der
  Routenlinie entfernt liegt, kann trotzdem einen kürzeren echten
  Gesamtumlauf haben, wenn er günstig zu Start *und* Ziel liegt. Bei sehr
  großer Anzahl an Transporteuren (deutlich über ca. 1000 gleichzeitig
  passenden) ließe sich bei Bedarf wieder ein Vorfilter ergänzen; für den
  hier beschriebenen Anwendungsfall ist das nicht nötig.

## Offene Punkte für den Produktivbetrieb

- [ ] `SESSION_SECRET` durch einen langen, zufälligen Wert ersetzen
- [ ] `ORS_API_KEY` eintragen (openrouteservice.org)
- [ ] SMTP-Zugangsdaten eintragen und Test-Mail verschicken
- [ ] Initiales Admin-Passwort nach erstem Login ändern
- [ ] Spalten-Zuordnung in `src/lib/organizationImport.ts` an den echten
      CRM-Export anpassen, sobald die Struktur vorliegt

# Medical Operations Center – Routenkalkulation

Webapp für die Routenkalkulation im Medical Operations Center: Transporteure
(Kreisverbände, Ortsvereine, externe Dienstleister) verwalten und für eine
Patientenfahrt (Start, Ziel, bis zu 3 Zwischenstopps) die wirtschaftlichsten
Transporteure **entlang der gesamten Route** finden – nicht nur rund um Start
und Ziel.

## Funktionen

- **Login, Benutzerverwaltung, Einladungen, Passwort-Reset** (Administrator)
- **Transporteur-Verwaltung**: Typ (Kreisverband/Ortsverein/Extern),
  Fahrzeugtypen (PKW/VAN/KTW/N-KTW/RTW/ITW), Ärzte ja/nein, Tempurmatratze
  ja/nein, Kunden-Zuordnung, Standort per Adresssuche
- **Excel-Import** für Transporteur-Stammdaten (Anlegen + Aktualisieren)
- **Kundenverwaltung** (nicht jeder Verband fährt für jeden Kunden)
- **Routenkalkulation**: Start/Ziel/Zwischenstopps per Adress-Autocomplete
  (Nominatim/OSM), Routing über OpenRouteService, Korridor-Suche entlang der
  gesamten Strecke via PostGIS, Ranking nach **Gesamtumlauf** (Basis → Start
  → … → Ziel → zurück zur Basis), Top-5-Liste mit „Mehr laden“
- **Statistik/Logging**: Anfrageverlauf je Disponent (Benutzerprofil) und
  aggregierte Auswertung für Administratoren

## Tech-Stack

Next.js (App Router, TypeScript) · PostgreSQL + PostGIS · Prisma ·
Leaflet/OpenStreetMap · OpenRouteService · Nominatim · Nodemailer (SMTP) ·
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
| `NOMINATIM_URL` | Standard: `https://nominatim.openstreetmap.org`. Bei hohem Volumen ggf. eigenen Nominatim-Server eintragen |
| `NOMINATIM_EMAIL` | Kontakt-E-Mail für den User-Agent (von Nominatim vorgeschrieben) |
| `APP_URL` | Öffentliche Basis-URL der App (für Links in E-Mails) |
| `ROUTE_CORRIDOR_BUFFER_M` | Suchradius um die Route in Metern (Standard 30000 = 30 km) |

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
- **Nominatim**: Öffentlicher Server, Nutzungsrichtlinie max. 1 Anfrage/Sek.
  (im Code per Warteschlange erzwungen). Bei sehr hohem Suchvolumen ggf.
  einen eigenen Nominatim-Server betreiben und `NOMINATIM_URL` anpassen.
- **OpenRouteService Free-Tier**: Dank Matrix-API (ein Call für alle
  Kandidaten) reicht das kostenlose Kontingent für den beschriebenen
  Anwendungsfall i. d. R. aus. Bei Bedarf ist ein Umstieg auf selbst
  gehostetes OSRM möglich, ohne die App-Logik umzubauen (nur `src/lib/ors.ts`
  betroffen).

## Offene Punkte für den Produktivbetrieb

- [ ] `SESSION_SECRET` durch einen langen, zufälligen Wert ersetzen
- [ ] `ORS_API_KEY` eintragen (openrouteservice.org)
- [ ] SMTP-Zugangsdaten eintragen und Test-Mail verschicken
- [ ] Initiales Admin-Passwort nach erstem Login ändern
- [ ] Spalten-Zuordnung in `src/lib/organizationImport.ts` an den echten
      CRM-Export anpassen, sobald die Struktur vorliegt

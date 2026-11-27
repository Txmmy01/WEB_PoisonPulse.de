# PoisonPulse.de

Creator- und Community-Website für PoisonPulse, HugoSMP und den **[POISN]**-Clan.

## Funktionen

- Responsive Creator-Landingpage mit PoisonPulse-Branding und Logo
- Umschaltbares Dark-/Light-Theme
- Creator-Links: YouTube, Twitch und Discord
- Dynamische Clan-Mitgliederliste
- Öffentliches Bewerbungsformular
- News-Bereich
- 24-Türchen-Adventskalender mit datumsabhängiger Freischaltung
- Admin-Dashboard für News, Clanmitglieder, Bewerbungen und Adventskalender
- Benutzername/Passwort-Login über serverseitige Umgebungsvariablen
- SQLite-Datenbank für persistente Speicherung auf der KVM

## Deployment auf der KVM

Voraussetzungen: Node.js 20 oder neuer und npm.

1. Repository auf die KVM klonen und in den Projektordner wechseln.
2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
3. Beispiel-Konfiguration kopieren:
   ```bash
   cp .env.example .env
   ```
4. `.env` bearbeiten. Setze einen eigenen Admin-Benutzernamen, ein starkes Passwort (mindestens 12 Zeichen) und einen langen zufälligen `SESSION_SECRET`. Beispiel für einen geheimen Schlüssel:
   ```bash
   openssl rand -hex 48
   ```
   Als `DATA_DIR` einen persistenten Ordner auf der KVM angeben, z. B. `/var/lib/poisonpulse`.
5. Datenordner anlegen und dem Linux-Benutzer der App Schreibrechte geben:
   ```bash
   sudo mkdir -p /var/lib/poisonpulse
   sudo chown -R $USER:$USER /var/lib/poisonpulse
   ```
6. Starten:
   ```bash
   npm start
   ```
7. Reverse Proxy (z. B. Nginx/Caddy) auf `127.0.0.1:3000` konfigurieren und HTTPS aktivieren. Die App bindet an `0.0.0.0`; den Node-Port nicht ungeschützt ins Internet freigeben.

### Dauerbetrieb mit systemd (optional)

Lege `/etc/systemd/system/poisonpulse.service` an (Pfade und Benutzer anpassen):

```ini
[Unit]
Description=PoisonPulse Website
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/poisonpulse
EnvironmentFile=/opt/poisonpulse/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Danach:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now poisonpulse
sudo systemctl status poisonpulse
```

Achte darauf, dass `www-data` Schreibrechte auf den in `DATA_DIR` gesetzten Ordner hat.

## Speicher & Sicherheit

- Inhalte und Bewerbungen liegen in `$DATA_DIR/poisonpulse.sqlite`.
- Login-Sitzungen werden ebenfalls im Datenordner gespeichert.
- `.env` enthält Zugangsdaten und darf niemals committet oder öffentlich geteilt werden.
- `.env.example` enthält ausschließlich Platzhalter.
- Backups: App stoppen oder SQLite-Backup mit `sqlite3`/Backup-Tool erstellen und den kompletten `DATA_DIR` sichern.
- Admin-Login ist durch Rate-Limit begrenzt; Session-Cookie ist HttpOnly und SameSite Strict.
- Für Produktion HTTPS über Reverse Proxy verwenden.

## Debian 13: systemd, Nginx und Backups

Beispiel-Konfigurationen liegen unter `deploy/` und `scripts/`:

- `deploy/poisonpulse.service.example` – systemd-Dienst mit eingeschränkten Rechten
- `deploy/nginx-poisonpulse.conf.example` – Reverse Proxy für Nginx
- `scripts/backup.sh` – konsistente SQLite-Backups inklusive Session-Datenbank

Für einen eigenen Linux-Dienstbenutzer und die Verzeichnisse:

```bash
sudo apt update
sudo apt install -y nodejs npm nginx sqlite3
sudo adduser --system --group --home /opt/poisonpulse poisonpulse
sudo mkdir -p /opt/poisonpulse /var/lib/poisonpulse /var/backups/poisonpulse
sudo chown -R poisonpulse:poisonpulse /opt/poisonpulse /var/lib/poisonpulse
sudo chmod 700 /var/lib/poisonpulse
```

Repository nach `/opt/poisonpulse` deployen, dort `npm ci --omit=dev` ausführen und die Datei `.env` mit restriktiven Rechten ablegen (`chown root:poisonpulse .env && chmod 640 .env`). Den Dienstbenutzer `poisonpulse` für `DATA_DIR` schreibberechtigen.

Die Beispiel-Service-Datei nach `/etc/systemd/system/poisonpulse.service` kopieren, Pfade bei Bedarf anpassen und aktivieren:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now poisonpulse
sudo systemctl status poisonpulse
```

Nginx-Beispiel nach `/etc/nginx/sites-available/poisonpulse` kopieren, Domain einsetzen, aktivieren und danach HTTPS mit Certbot einrichten:

```bash
sudo ln -s /etc/nginx/sites-available/poisonpulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Backups manuell ausführen:

```bash
sudo -u poisonpulse DATA_DIR=/var/lib/poisonpulse BACKUP_DIR=/var/backups/poisonpulse bash scripts/backup.sh
```

Für produktiven Betrieb zusätzlich regelmäßige externe/off-server Backups einrichten.

## Lokal testen

```bash
npm install
cp .env.example .env
# .env ausfüllen
npm start
```

Dann Website unter `http://localhost:3000` und Admin unter `http://localhost:3000/admin/` öffnen.

## Projektstruktur

- `index.html` – öffentliche Website
- `admin/index.html` – Admin-Dashboard
- `js/site.js` – öffentliche API-Anbindung
- `server.js` – Express-Backend, Login und API
- `.env.example` – sichere Vorlage für KVM-Umgebungsvariablen
- `data/` – zur Laufzeit angelegte SQLite-Datenbank (nicht committen)

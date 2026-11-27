# PoisonPulse.de

Creator- und Community-Website für PoisonPulse, HugoSMP und den **[POISN]**-Clan.

## Website

- Responsive Creator-Landingpage mit PoisonPulse-Branding und Logo
- Umschaltbares Dark-/Light-Theme
- Creator-Links: YouTube, Twitch und Discord
- Clanbereich mit dynamischer Mitgliederliste
- Öffentliches Bewerbungsformular
- News-Bereich mit dynamischen Veröffentlichungen
- 24-Türchen-Adventskalender mit datumsabhängiger Freischaltung
- Admin-Dashboard für News, Clanmitglieder, Bewerbungen und Adventskalender

## Supabase einrichten (einmalig)

Die Website ist statisch hostbar. Für Login, Bewerbungen und dynamische Inhalte wird ein eigenes Supabase-Projekt benötigt.

1. Erstelle ein Projekt unter https://supabase.com/.
2. Öffne im Supabase Dashboard den **SQL Editor** und führe den vollständigen Inhalt von `supabase/schema.sql` aus.
3. Öffne **Project Settings → API** und kopiere die Project URL sowie den **anon/public key**.
4. Öffne `config.example.js` im Repository und ersetze `YOUR_PROJECT_ID` und `YOUR_SUPABASE_ANON_KEY` durch diese Werte. Der anon key darf im Browser verwendet werden; niemals den `service_role` key eintragen.
5. Lege unter **Authentication → Users** deinen Benutzer an (E-Mail/Passwort).
6. Führe im SQL Editor den folgenden Befehl aus und ersetze die E-Mail-Adresse:
   ```sql
   insert into public.profiles (id, role)
   select id, 'admin' from auth.users where email = 'DEINE-EMAIL@BEISPIEL.DE';
   ```
7. Öffne nach dem Deployment `/admin/` und melde dich mit diesem Benutzer an.

**Sicherheit:** Admin-Aktionen werden zusätzlich durch Supabase Row Level Security abgesichert. Das Frontend blendet das Dashboard ohne Admin-Profil aus; die Datenbankrichtlinien sind die eigentliche Zugriffskontrolle. Den service_role key niemals veröffentlichen.

## Lokal starten

Öffne `index.html` direkt im Browser oder starte einen lokalen Webserver:

```bash
python -m http.server 8000
```

Danach http://localhost:8000 öffnen. Die Adminseite liegt unter http://localhost:8000/admin/.

## Veröffentlichung

Repository mit GitHub Pages oder einem anderen statischen Webhoster verbinden. Als Veröffentlichungsordner das Repository-Root verwenden. Nach Eintragen der Supabase-Projektdaten funktionieren Login, News, Clanverwaltung, Bewerbungen und Kalender.

## Projektstruktur

- `index.html` – öffentliche Website
- `admin/index.html` – Admin-Dashboard
- `js/site.js` – öffentliche Datenbankintegration
- `config.example.js` – öffentliche Supabase-Konfiguration (Projekt-URL + anon key)
- `supabase/schema.sql` – Tabellen und Row-Level-Security-Regeln

## Hinweise

- News werden erst nach dem Anlegen und Veröffentlichen im Adminbereich öffentlich angezeigt.
- Clanmitglieder lassen sich im Adminbereich hinzufügen, bearbeiten, sortieren (Datenbankfeld `sort_order`) und ausblenden.
- Bewerbungen sind nur für berechtigte Admins sichtbar.
- Adventskalender-Inhalte werden erst am eingetragenen Datum angezeigt, wenn das Türchen veröffentlicht wurde.
- Die Website enthält keine erfundenen Clanmitglieder oder News. PoisonPulse ist als Owner in der statischen Ausgangsansicht dargestellt.

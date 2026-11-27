# PoisonPulse.de

Creator- und Community-Website für PoisonPulse, HugoSMP und den **[POISN]**-Clan.

## Enthalten

- Responsive Landingpage mit Creator-, Clan-, News- und Community-Bereichen
- Umschaltbares Dark-/Light-Theme (Einstellung bleibt im Browser gespeichert)
- Verknüpfungen zu YouTube, Twitch und Discord
- PoisonPulse-Branding und Logo
- Mobile Navigation und dezente Scroll-Animationen

## Lokal starten

Die aktuelle Version ist eine statische Website ohne Build-Schritt. Öffne `index.html` direkt im Browser oder starte einen lokalen Webserver, z. B.:

```bash
python -m http.server 8000
```

Danach unter http://localhost:8000 öffnen.

## Deployment

Kann direkt über GitHub Pages oder jeden statischen Webhoster veröffentlicht werden.

## Noch offen für die nächste Ausbaustufe

- Geschützter Adminbereich mit serverseitiger Authentifizierung
- Datenbank für News, Clanmitglieder und Bewerbungen
- Dynamische YouTube-Videos und Clanprofile
- Adventskalender

**Wichtig:** News und Clanmitglieder sind in dieser ersten statischen Version noch nicht über ein Admin-Dashboard verwaltbar. Dafür wird im nächsten Schritt ein Backend mit Authentifizierung und Datenbank benötigt. Zugangsdaten oder Admin-Passwörter dürfen nicht in eine reine Frontend-Datei geschrieben werden.

# Sicherheitsaktivierung

## Deployment

1. Alle ausstehenden Migrationen anwenden, insbesondere
   `supabase/migrations/20261011140000_security_hardening.sql` nach der Firmen-
   und Todo-Zuweisungsmigration. Bei verknuepftem CLI-Projekt: `npx supabase db push`.
2. Webapp neu bauen und deployen. Nur den Produktionsserver verwenden, niemals
   `next dev` ins Internet freigeben. Die Nonce-CSP erfordert dynamisches Rendering;
   HTML darf nicht im CDN zwischengespeichert werden.
3. Edge Function erneut deployen:
   `npx supabase functions deploy send-due-notifications --no-verify-jwt`.
   Der Cron-Secret bleibt erforderlich.
4. `SUPABASE_SERVICE_ROLE_KEY` ausschliesslich als serverseitiges Hosting-Secret
   setzen. Niemals mit `NEXT_PUBLIC_` praefixieren oder in Git speichern.
5. Nach ausdruecklicher Zustimmung des jeweiligen Firmeninhabers die Firmen-UUID
   in `AI_APPROVED_COMPANY_IDS` aufnehmen (kommagetrennt). Ohne Freigabe bleiben
   Auswertungen gesperrt. Nur aggregierte Daten werden uebermittelt; die Frage
   selbst wird ebenfalls an den Anbieter gesendet. Keine Geheimnisse eingeben.
6. Anbieter-Vertraege, Verarbeitungslokation, Aufbewahrung und Trainingsnutzung
   vor Freigabe pruefen. Beim AI-Anbieter ein zusaetzliches Kostenlimit setzen.

## Grenzen und Rechte

- AI: sechs Anfragen pro Nutzer und Minute, 100 pro Firma und UTC-Tag,
  maximal drei gleichzeitig. Reservierungen verfallen nach drei Minuten;
  auch fehlgeschlagene Anfragen zaehlen. Fehlende Limits sperren den Dienst.
- Push: nur Google FCM, Mozilla und Apple ueber HTTPS, maximal zehn
  Abonnements pro Nutzer, fuenf Sekunden Verbindungstimeout.
  Andere Push-Anbieter werden bewusst abgewiesen.
- Kundenlogos sind privat, URLs gelten fuenf Minuten. Bereits heruntergeladene
  oder zuvor extern gecachte Logos koennen nicht zurueckgerufen werden.
- Das alte Basisschema nicht erneut nach den Firmenmigrationen ausfuehren.
- CSP erlaubt keine beliebigen Inline-Scripts. Inline-Styles bleiben fuer
  Diagramme und Drag-and-drop erlaubt.

## Noch Betriebsseitig Aktivieren

- Supabase Auth: E-Mail-Bestaetigung, starke Passwortregeln, Schutz vor
  geleakten Passwoertern soweit verfuegbar und restriktive Auth-Rate-Limits.
- Auth-Redirects nur auf konkrete produktive HTTPS-URLs begrenzen.
- MFA fuer Inhaber/Administratoren einrichten. Eine verpflichtende AAL2-Pruefung
  ist noch nicht implementiert; dafuer fehlen Enrollment- und Challenge-Ansichten.
- CAPTCHA erfordert einen Anbieter-Key und Integration im Login; aktuell nicht
  aktiviert. Nicht allein im Dashboard einschalten, sonst scheitert der Login.
- Hosting: HTTPS, Request-Groessen-/Zeitlimits, WAF, Backups und Logs mit
  begrenzter Aufbewahrung. Service-/AI-/Cron-Secrets bei Verdacht rotieren.
- Live-RLS mit getrennten Testaccounts und echten Storage-Buckets pruefen.
  Lokale Tests sind keine Garantie fuer die produktive Konfiguration.

## Pruefungen

`node --test tests/company.test.mjs`

`node --experimental-strip-types --test tests/security.test.mjs`

`npm audit --omit=dev` und `npm run build`

Entwicklungsabhaengigkeiten separat mit `npm audit` pruefen. Keine fremden
Glob-Muster oder ungeprueften Projekte durch verwundbare Lint-Werkzeuge verarbeiten.
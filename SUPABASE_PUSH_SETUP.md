# Supabase Web-Push einrichten

Die App speichert Push-Abonnements in Supabase. Eine Edge Function prüft täglich fällige Rechnungen und Prospect-Aufgaben und sendet Web-Push-Nachrichten.

## Status dieses Projekts

- Datenbankmigration: eingerichtet
- Edge Function `send-due-notifications`: aktiv
- VAPID- und Cron-Secrets: in Supabase gesetzt
- Cron `wendico-due-notifications`: täglich um 08:00 UTC aktiv
- Lokaler Public VAPID Key: in `.env.local` gesetzt

Für ein späteres Hosting muss `NEXT_PUBLIC_VAPID_PUBLIC_KEY` zusätzlich beim Hosting-Anbieter als Umgebungsvariable hinterlegt werden. Der Wert steht lokal in `.env.local`.

## 1. Datenbankschema aktualisieren

Im Supabase Dashboard unter **SQL Editor** den vollständigen Inhalt von `supabase/schema.sql` ausführen.

## 2. Supabase CLI anmelden und Projekt verknüpfen

```bash
npx supabase login
npx supabase link --project-ref DEINE_PROJECT_REF
```

Die Project Reference steht in der Supabase-Projekt-URL vor `.supabase.co`.

## 3. VAPID-Schlüssel erzeugen

```bash
npx web-push generate-vapid-keys
```

Den ausgegebenen Public Key in `.env.local` eintragen:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=DEIN_PUBLIC_KEY
```

Einen langen zufälligen Cron-Schlüssel erzeugen:

```bash
openssl rand -hex 32
```

## 4. Secrets für die Edge Function setzen

```bash
npx supabase secrets set \
  VAPID_SUBJECT=mailto:info.wendco@gmail.com \
  VAPID_PUBLIC_KEY=DEIN_PUBLIC_KEY \
  VAPID_PRIVATE_KEY=DEIN_PRIVATE_KEY \
  CRON_SECRET=DEIN_CRON_SECRET
```

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase Edge Functions automatisch bereit. Den Private Key und den Cron-Schlüssel niemals in `.env.local` oder Git speichern.

## 5. Edge Function deployen

```bash
npx supabase functions deploy send-due-notifications --no-verify-jwt
```

## 6. Täglichen Versand planen

Im Supabase SQL Editor zuerst unter **Database > Extensions** die Erweiterungen `pg_cron` und `pg_net` aktivieren. Danach diesen SQL-Block mit Projekt-URL und Cron-Schlüssel ausführen:

```sql
select cron.schedule(
  'wendico-due-notifications',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://DEINE_PROJECT_REF.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'DEIN_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Der Cron läuft in UTC. `0 8 * * *` bedeutet täglich um 08:00 UTC.

## 7. Webapp aktivieren

1. App neu deployen oder lokal neu starten.
2. Auf dem Handy als Webapp installieren.
3. Anmelden und die Glocke oben öffnen.
4. **Browser-Benachrichtigungen aktivieren** auswählen.
5. Die Benachrichtigungsfreigabe des Betriebssystems bestätigen.

Auf iOS funktionieren Web-Push-Nachrichten ab iOS 16.4 für Apps, die über **Zum Home-Bildschirm** installiert wurden.

## Test

Die Function kann man einmal manuell auslösen:

```bash
curl -X POST \
  -H "x-cron-secret: DEIN_CRON_SECRET" \
  https://DEINE_PROJECT_REF.supabase.co/functions/v1/send-due-notifications
```

Eine versendete Rechnung oder eine offene Prospect-Aufgabe mit heutigem bzw. vergangenem Fälligkeitsdatum erzeugt eine Nachricht. Pro Eintrag und Tag wird höchstens eine Nachricht versendet.

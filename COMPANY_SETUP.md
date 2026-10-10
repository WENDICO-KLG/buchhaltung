# Gemeinsame Firmen und Teamrechte

## Aktivierung

1. Zuerst alle bestehenden Migrationen anwenden, dann
   `supabase/migrations/20261011120000_company_memberships.sql`.
   Bei einem bereits verknuepften CLI-Projekt: `npx supabase db push`.
   Alternativ die neue Migration im Supabase SQL Editor ausfuehren.
2. Die aktualisierte Webapp deployen.
3. Fuer gemeinsamen Push-Versand auch die Edge Function aktualisieren:
   `npx supabase functions deploy send-due-notifications --no-verify-jwt`.

Die Migration uebernimmt vorhandene Accounts als Firmeninhaber. Bestehende
Geschaeftsdaten und Dateien bleiben erhalten. Die bisherige Spalte `user_id`
enthaelt fuer Geschaeftsdaten nun die Firmen-ID (die ID des Inhabers), nicht
die ID des aktuell angemeldeten Mitarbeiters. Push-Abonnements bleiben privat.
Neue Accounts bekommen nicht automatisch eine eigene Firma.

Nach dieser Migration **nicht erneut das alte `supabase/schema.sql` ausfuehren**:
Es stellt benutzerbasierte Policies wieder her und kann dadurch Leserechte
aushebeln. Fuer weitere Updates ausschliesslich die Migrationen verwenden.

## Bedienung

Unter Einstellungen > Firma & Team koennen Inhaber oder Administratoren eine
E-Mail-Adresse einladen. Die Einladung erscheint nach Registrierung oder
Anmeldung mit dieser bestaetigten E-Mail-Adresse in den Einstellungen des
Empfaengers. Es wird keine Einladungs-E-Mail versendet. Einladungen gelten
sieben Tage und koennen widerrufen oder erneut erstellt werden.

Nach Annahme wird die gemeinsame Firma ausgewaehlt. Mitglieder mit mehreren
Firmen koennen in den Einstellungen wechseln. Vorhandene eigene Firmendaten
werden beim Beitritt nicht zusammengefuehrt oder geloescht.

| Rolle | Berechtigungen |
| --- | --- |
| Inhaber | Alle Firmendaten, Firmenprofil, Team und Administratoren verwalten |
| Administrator | Firmendaten, Firmenprofil, Mitarbeiter, Leser und deren Einladungen verwalten |
| Mitarbeiter | Firmendaten lesen, erstellen, bearbeiten und loeschen |
| Leser | Firmendaten lesen und exportieren; keine Schreib- oder Teamrechte |

Der Inhaber kann nicht entfernt oder herabgestuft werden. Administratoren
koennen keine anderen Administratoren oder Inhaber veraendern. Das Entfernen
eines Mitglieds entzieht dessen Datenbank- und Datei-Zugriff; bereits exportierte
Daten und zuvor ausgestellte Datei-URLs werden dadurch nicht zurueckgerufen.
Signierte private Datei-URLs gelten 60 Sekunden. Nach der Sicherheitsmigration
sind auch Kundenlogos privat (URLs gelten fuenf Minuten). Aktivierung und
verbleibende Betriebsanforderungen: [SECURITY_SETUP.md](SECURITY_SETUP.md).
Eigene Firmen anlegen ist auf eine Firma pro Inhaber begrenzt.

## Tests

`npm run test:company` fuehrt die Migration gegen ein lokales PostgreSQL via
PGlite aus und prueft bestehende Daten, Einladungen, bestaetigte E-Mail-Adressen,
Rollen, Fremdfirmenzugriff, Verknuepfungen, Dateirechte und Mitgliederentzug.
Es werden keine produktiven Daten oder Accounts veraendert.
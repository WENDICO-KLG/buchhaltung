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

Die Migration `supabase/migrations/20261011160000_commissions_and_page_access.sql`
aktiviert den Rechner und Seitenfreigaben. Inhaber und Administratoren koennen
unter Firma & Team die Seiten fuer Mitarbeiter/Leser einzeln freigeben.
Einstellungen bleiben erreichbar; Inhaber/Administratoren behalten Vollzugriff.
Die Freigabe der Uebersicht erlaubt auch die Finanzgrunddaten (Kunden/Ausgaben),
die deren Kennzahlen benoetigen. Seitenrechte ersetzen nicht die Rollenrechte:
Leser bleiben ohne Schreibrechte. Bestehende Mitgliedschaften behalten zunaechst
alle aktuellen Seiten; Freigaben danach gezielt einschraenken.

Auf Kundenkarten aktivieren Inhaber/Administratoren den Provisionsschalter.
Im Rechner werden ausschliesslich aktivierte Kunden angezeigt. Dort werden
Mitarbeiter und Prozentsatz zugeordnet; Provision gilt nur fuer einmalige Einnahmen.
Mitarbeiter/Leser sehen nur ihnen zugeteilte Kunden. Abschalten loescht die
Provisionszuordnung; erneutes Aktivieren startet ohne Zuordnung. Zeitraumfilter
verwenden das einmalige Zahlungsdatum; undatierte Betraege sind nur ohne Filter
enthalten. Berechnungen sind Vorschauen, keine Auszahlung oder Lohnabrechnung.
Die Push-Edge-Function ebenfalls neu deployen, damit Seitenrechte beim Versand
beruecksichtigt werden.

Mit `supabase/migrations/20261011150000_company_member_names.sql` werden
firmenbezogene Anzeigenamen aktiviert. Unter Firma & Team den Stift neben
dem Mitglied anklicken, Namen eingeben und speichern. Ein leerer Name stellt
die E-Mail-Anzeige wieder her. Todo-Karten und Zuweisungslisten verwenden den
Anzeigenamen. Inhaber duerfen alle Namen bearbeiten; Administratoren die Namen
von Mitarbeitern und Lesern sowie ihren eigenen. Die E-Mail-Adresse des
Benutzerkontos bleibt unveraendert.

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
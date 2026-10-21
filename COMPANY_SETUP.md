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

Die Migration `supabase/migrations/20261019100000_ayleen_social_media.sql`
aktiviert die Seite **Ayleen Social Media** unter `/social-media`.
Alle vorherigen Migrationen muessen bereits angewendet sein; anschliessend
`npx supabase db push` ausfuehren oder die neue Migration im SQL Editor anwenden.
Unter Einstellungen > Firma & Team Ayleen als Mitarbeiter einladen und die Seite
**Ayleen Social Media** freigeben. Die neue Seite wird Mitarbeitern und Lesern
nicht automatisch freigegeben; Inhaber und Administratoren haben Vollzugriff.
Auftraege enthalten Bezeichnung, Post-Link, Leistungsdatum und Preis in CHF.
Das Leistungsdatum bestimmt den Abrechnungsmonat. Die Monatsansicht zeigt
Gesamtverguetung, bereits bezahlte Betraege und den offenen Auszahlungsbetrag;
darunter stehen die Summen aller erfassten Monate.
Nur Inhaber und Administratoren koennen Auftraege als bezahlt/offen markieren.
Bezahlte Auftraege koennen Mitarbeiter nicht mehr bearbeiten oder loeschen.
Leser haben ausschliesslich Lesezugriff. Die Zahlungsmarkierung bestaetigt eine
manuell erfolgte Zahlung, loest aber keine Ueberweisung aus. Die Auftraege
werden nicht automatisch als Ausgaben in die bestehende Finanzuebersicht gebucht.

Die Migration `supabase/migrations/20261011180000_todo_priority.sql` aktiviert
Todo-Prioritaeten Hoch, Normal und Niedrig. Bestehende Aufgaben erhalten Normal.
Prioritaeten sind im Formular und direkt auf der Karte aenderbar und filterbar.
Offene Aufgaben werden je Spalte zuerst nach Ueberfaelligkeit, dann Prioritaet
und Faelligkeit sortiert. Erledigte Aufgaben bleiben nach letzter Aenderung sortiert.

Die Migration `supabase/migrations/20261011170000_dashboard_commissions.sql`
ergaenzt datumsbezogene Provisionssummen fuer die Uebersicht. Das Ergebnis wird
als Umsatz minus Ausgaben minus Provisionen inklusive Monatsbonus berechnet.
Die Uebersichtsfreigabe reicht zum Lesen dieser Summen; sie enthaelt keine
Mitarbeiterzuordnungen. Provisionen sind berechnete Verpflichtungen, keine
bestaetigten Auszahlungen. Nicht nochmals als Ausgabe erfassen, sonst werden
sie doppelt abgezogen. Undatierte oder nicht zugeteilte Kunden zaehlen nicht.

Die Migration `supabase/migrations/20261011160000_commissions_and_page_access.sql`
aktiviert den Rechner und Seitenfreigaben. Inhaber und Administratoren koennen
unter Firma & Team die Seiten fuer Mitarbeiter/Leser einzeln freigeben.
Einstellungen bleiben erreichbar; Inhaber/Administratoren behalten Vollzugriff.
Die Freigabe der Uebersicht erlaubt auch die Finanzgrunddaten (Kunden/Ausgaben),
die deren Kennzahlen benoetigen. Seitenrechte ersetzen nicht die Rollenrechte:
Leser bleiben ohne Schreibrechte. Bestehende Mitgliedschaften behalten zunaechst
alle aktuellen Seiten; Freigaben danach gezielt einschraenken.

Fuer Sales-Mitarbeiter genuegt die Freigabe "Prospects": Sie umfasst die Pipeline,
das Einwand-Training (`/prospects/training`) und den Spickzettel (`/prospects/script`).
Wer eine nicht freigegebene Seite oeffnet, landet automatisch auf der ersten
freigegebenen Seite. Die Texte fuer Training und Spickzettel stehen in
`lib/sales-training.ts`; der Trainingsfortschritt wird pro Geraet im Browser gespeichert.

Auf Kundenkarten aktivieren Inhaber/Administratoren den Provisionsschalter.
Im Rechner werden ausschliesslich aktivierte Kunden angezeigt. Dort werden
Mitarbeiter und Prozentsatz zugeordnet; Provision gilt nur fuer einmalige Einnahmen.
Mitarbeiter/Leser sehen nur ihnen zugeteilte Kunden. Abschalten loescht die
Provisionszuordnung; erneutes Aktivieren startet ohne Zuordnung. Zeitraumfilter
verwenden das einmalige Zahlungsdatum; undatierte Betraege sind nur ohne Filter
enthalten. Berechnungen sind Vorschauen, keine Auszahlung oder Lohnabrechnung.
Der Rechner verwendet jetzt fest 10 % Grundprovision. Ab drei zugeteilten,
provisionsfaehigen Kunden mit positivem Einmalbetrag im selben Monat bekommt
der Mitarbeiter 50 % der gesamten Monatsprovision als Bonus (effektiv 15 %).
Die Schwelle wird immer ueber den ganzen Monat bestimmt, auch wenn ein
Teilzeitraum angezeigt wird. Monate und Mitarbeiter werden getrennt gezaehlt.
Als Abschlussdatum gilt aktuell das gespeicherte einmalige Zahlungsdatum.
Bei abweichendem Verkaufsabschlussdatum muss ein eigenes Datumsfeld ergaenzt
werden. Alte kundenspezifische Prozentsaetze werden nicht mehr zur Berechnung
verwendet; neue Zuordnungen speichern 10 %. Beim Entzug einer Zuordnung oder
Abschalten eines Kunden wird die Vorschau neu berechnet; keine Auszahlungshistorie.

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
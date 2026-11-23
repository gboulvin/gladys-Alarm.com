# Alarm.com

Steuern Sie Ihre Alarm.com-Sicherheitsanlage mit Gladys Assistant: Alarm
scharf und unscharf schalten, Tür-, Fenster-, Bewegungs-, Wasser- und
Rauchmelder verfolgen sowie die mit Ihrer Zentrale gekoppelten Schlösser,
Garagentore, Lichter und Thermostate bedienen.

Alarm.com ist ein **Cloud**-Dienst: Die Integration kommuniziert über das
Internet mit Alarm.com, mit demselben Konto wie die Alarm.com-App. Sie spricht
nicht mit der Zentrale in Ihrem lokalen Netzwerk.

## Was Sie erhalten

| Alarm.com-Gerät             | In Gladys                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Partition (die Alarmanlage) | Scharfschaltmodus: Unscharf, Intern scharf, Extern scharf, Nacht scharf (falls unterstützt) |
| Tür-/Fensterkontakt         | Öffnungssensor + Batterie schwach                                                           |
| Bewegungsmelder             | Bewegungssensor + Batterie schwach                                                          |
| Wassermelder                | Lecksensor + Batterie schwach                                                               |
| Rauch-/CO-Melder            | Rauch-/CO-Sensor + Batterie schwach                                                         |
| Glasbruchmelder             | Vibrationssensor + Batterie schwach                                                         |
| Smart Lock                  | Schloss (ver-/entriegeln) + Batterie schwach                                                |
| Garagentor                  | Schalter (1 = offen, 0 = geschlossen)                                                       |
| Licht / Dimmer              | Ein/Aus, Helligkeit                                                                         |
| Thermostat                  | Temperatur, Sollwert, Luftfeuchtigkeit (falls gemessen)                                     |

## Konfiguration

1. Öffnen Sie den Tab **Konfiguration** der Integration.
2. Geben Sie **Benutzernamen** und **Passwort** Ihres Alarm.com-Kontos ein.
   Wir empfehlen, in der Alarm.com-App einen eigenen Zugang für Gladys mit
   nur den nötigen Rechten anzulegen.
3. Passen Sie bei Bedarf das **Aktualisierungsintervall** (standardmäßig 60
   Sekunden, mindestens 30) und die **Scharfschalt-Optionen** an: offene
   Sensoren überbrücken, ohne Eingangsverzögerung, stilles Scharfschalten.
   Sie gelten, sofern Ihre Zentrale sie unterstützt.
4. Speichern. Die Geräte erscheinen im Tab **Erkennung** und können
   hinzugefügt werden.

### Zwei-Faktor-Authentifizierung

Nutzt Ihr Konto die Zwei-Faktor-Authentifizierung, verlangt der
Verbindungsstatus einen Code:

- **Authenticator-App**: Öffnen Sie **Zwei-Faktor-Code prüfen**, wählen Sie
  _Authenticator-App_ und geben Sie den Code der App ein.
- **SMS oder E-Mail**: Führen Sie zuerst **Zwei-Faktor-Code senden** aus,
  dann **Zwei-Faktor-Code prüfen** mit dem erhaltenen Code.

Gladys wird danach als vertrauenswürdiges Gerät gespeichert („Gladys
Assistant“ in der Liste von Alarm.com): Der Code wird nicht erneut verlangt,
auch nicht nach einem Neustart.

**Verbindung testen** meldet sich neu an und zeigt, was gefunden wurde.

## Szenen

Auslöser (Szenen-Editor, Kategorie **Integrationen**):

- **Alarm.com: Scharfschaltzustand geändert** — Filter nach Partition und
  neuem Zustand. Variablen: `state`, `previous_state`, `partition_name`.
- **Alarm.com: Sensor ausgelöst** — Tür oder Fenster geöffnet, Bewegung,
  Wasser, Rauch, CO oder Glasbruch erkannt. Variablen: `kind`, `sensor_name`.
- **Alarm.com: Schloss ver- oder entriegelt** — Variablen: `state`,
  `lock_name`.
- **Alarm.com: Batterie schwach** — Variable: `device_name`.

Aktionen:

- **Alarm.com: scharf schalten** — Modus (extern, intern, Nacht) und Optionen.
  Partition leer lassen, um alle Partitionen scharf zu schalten.
- **Alarm.com: unscharf schalten** — eine oder alle Partitionen.
- **Alarm.com: Zustand lesen** — liest Alarm.com sofort und liefert den
  Scharfschaltzustand, Anzahl und Namen der offenen Sensoren und die Anzahl
  schwacher Batterien für die folgenden Aktionen.

## Dashboard-Widgets

- **Alarmzentrale** — Scharfschaltzustand, offene Sensoren, offene Schlösser,
  schwache Batterien und Schaltflächen zum Scharfschalten. Die Schaltfläche
  **Unscharf** erscheint nur, wenn **Unscharfschalten über das Dashboard
  erlauben** aktiviert ist, und verlangt eine Bestätigung.
- **Alarmsensoren** — alle Sensoren, offene, aktive und schwache zuerst.

## Gut zu wissen

- Alarm.com bietet Endkunden keine offizielle öffentliche API: Die
  Integration nutzt die Web-API der Alarm.com-Website. Eine Änderung dort kann
  sie bis zu einem Update unterbrechen.
- Änderungen werden in jedem Aktualisierungsintervall gelesen. Gladys ersetzt
  keine Alarmüberwachung durch Ihren Errichter.
- Thermostatmodi (Heizen, Kühlen, Auto) werden noch nicht angeboten.

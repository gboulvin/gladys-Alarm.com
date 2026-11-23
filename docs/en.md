# Alarm.com

Control your Alarm.com security system from Gladys Assistant: arm and disarm
the alarm, follow your door, window, motion, water and smoke sensors, and
drive the locks, garage doors, lights and thermostats paired with your panel.

Alarm.com is a **cloud** service: the integration talks to Alarm.com over the
Internet, with the same account as the Alarm.com app. It does not talk to the
panel on your local network.

## What you get

| Alarm.com device      | In Gladys                                                                   |
| --------------------- | --------------------------------------------------------------------------- |
| Partition (the alarm) | Arming mode: Disarmed, Armed stay, Armed away, Armed night (when supported) |
| Door/window contact   | Opening sensor + low battery                                                |
| Motion sensor         | Motion sensor + low battery                                                 |
| Water sensor          | Leak sensor + low battery                                                   |
| Smoke / CO detector   | Smoke / CO sensor + low battery                                             |
| Glass break detector  | Vibration sensor + low battery                                              |
| Smart lock            | Lock (lock / unlock) + low battery                                          |
| Garage door           | Switch (1 = open, 0 = closed)                                               |
| Light / dimmer        | On/off, brightness                                                          |
| Thermostat            | Temperature, setpoint, humidity (when measured)                             |

## Configuration

1. Open the **Configuration** tab of the integration.
2. Enter the **username** and the **password** of your Alarm.com account. We
   recommend creating a dedicated login for Gladys in the Alarm.com app
   (**Users** / **Logins**), with only the permissions you need.
3. Optionally change the **refresh interval** (60 seconds by default, 30
   seconds minimum) and the **arming options**: bypass open sensors, no entry
   delay, silent arming. They apply when your panel supports them.
4. Save. The devices appear in the **Discovery** tab, ready to be added.

### Two-factor authentication

If your account uses two-factor authentication, the connection status asks
for a code:

- **Authenticator app**: open **Verify the two-factor code**, choose
  _Authenticator app_, type the code from the app.
- **SMS or email**: run **Send a two-factor code** first, then **Verify the
  two-factor code** with the code received.

Gladys is then registered as a trusted device ("Gladys Assistant" in the
Alarm.com trusted devices list): the code is not asked again, restarts
included. Removing that trusted device on Alarm.com asks for a new code.

**Test the connection** signs in again and lists what was found.

## Scenes

Triggers (scene editor, **Integrations** category):

- **Alarm.com: arming state changed** — filter on the partition and the new
  state. Variables: `state`, `previous_state`, `partition_name`.
- **Alarm.com: sensor triggered** — a door or window opened, motion, water,
  smoke, CO or glass break detected. Filter on the sensor and the detection.
  Variables: `kind`, `sensor_name`.
- **Alarm.com: lock locked or unlocked** — variables: `state`, `lock_name`.
- **Alarm.com: low battery** — variable: `device_name`.

Actions:

- **Alarm.com: arm** — mode (away, stay, night) and options. Leave the
  partition empty to arm every partition.
- **Alarm.com: disarm** — one partition, or all of them.
- **Alarm.com: read the status** — reads Alarm.com right away and returns the
  arming state, the number and names of the open sensors and the number of low
  batteries, to use in the next actions (e.g. "notify me instead of arming when
  a window is open").

The standard device triggers and actions of Gladys also work on every device.

## Dashboard widgets

- **Alarm panel** — arming state, open sensors, unlocked locks, low batteries,
  and arming buttons. Choose the partition in the widget settings (the first
  one otherwise). The **Disarm** button only appears when **Allow disarming
  from the dashboard** is enabled in the configuration, and asks for
  confirmation: anyone who can see the dashboard could use it.
- **Alarm sensors** — every sensor, open, active and low-battery ones first.

## Good to know

- Alarm.com has no official public API for end users: the integration uses
  the web API of the Alarm.com website. A change on their side can break it
  until an update is published.
- Changes are read every refresh interval: an alarm triggered between two
  reads shows up at the next one. Do not rely on Gladys as your monitoring
  service: your alarm company remains in charge of the alarm itself.
- Thermostat modes (heat, cool, auto) are not exposed yet; the setpoint
  follows the current mode.

## Troubleshooting

- **"Alarm.com refused the username or the password"**: check them by
  signing in on www.alarm.com.
- **"Alarm.com asks you to set up two-factor authentication"**: sign in once
  on www.alarm.com and follow the setup, then save the configuration again.
- **A device is missing**: only the device types listed above are supported.
  Panic buttons, sirens and cameras are not.

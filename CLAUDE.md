# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** for **Alarm.com** security systems:
a Node.js service (Node 22+, ESM, no build step) that runs in its own sandboxed
Docker container and talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It started from the official JavaScript template
([integration-template-js](https://github.com/GladysAssistant/integration-template-js)).

Alarm.com has no public API for end users: the integration uses the JSON:API
endpoints of the www.alarm.com web application (the same ones as the
community library `pyalarmdotcomajax`). It is a **cloud-only** integration
(`"transports": ["cloud"]`): it polls the account, there is no local access
to the panel.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/client.test.js           # one file
node --test --test-name-pattern "widget"  # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                     SDK wiring only: handlers registered before connect()
src/controller.js            session, polling, snapshot, publication, commands, 2FA
src/alarmcom/client.js       Alarm.com web session (login, 2FA, cookies, JSON:API calls)
src/alarmcom/cookieJar.js    minimal cookie jar (a single host)
src/alarmcom/constants.js    endpoints and the numeric enums of the web app
src/alarmcom/model.js        raw catalog resources -> plain snapshot (the ONLY place
                             that reads Alarm.com attribute names)
src/alarmcom/commands.js     arm / disarm / lock / garage / light / thermostat commands
src/alarmcom/errors.js       typed errors (credentials, OTP required, permission...)
src/devices/<type>.js        snapshot entry -> Gladys device, states, setValue
src/devices/index.js         registry + dispatch helpers
src/events.js                scene triggers: snapshot diff -> one event per transition
src/scenes.js                scene action handlers (manifest `scene_actions`)
src/widgets.js               dashboard widget handlers (manifest `widgets`)
src/actions.js               Configuration-screen actions (manifest `actions`)
src/config.js                DEFAULT_CONFIG (mirrors the manifest defaults) + normalization
src/i18n.js                  every user-facing text, in en / fr / de / es
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md        user documentation, re-hosted by Gladys (en + fr mandatory)
test/                        node --test, fake Gladys (SDK) + fake Alarm.com (test/fixtures.js)
.github/scripts/release.mjs  release helpers (manifest bump, changelog), tested in test/
```

## Rules

- **External ids are forever.** `gladys.externalIds(type, alarmComId)`, the
  Alarm.com id being the stable device id of the account — never a name.
  Feature keys (`arm-state`, `state`, `battery-low`, `lock`, `open`, `power`,
  `brightness`, `temperature`, `target-temperature`, `humidity`), manifest
  keys (`config_schema`, `actions`, `scene_triggers`, `scene_actions`,
  `widgets`), the arming mode values (`disarmed`, `armed_stay`,
  `armed_away`, `armed_night`) and sensor kinds are stored by Gladys and by
  the users' scenes: never rename one.
- **Every feature carries `name`, `min`, `max`, `read_only` and
  `has_feedback`** (Gladys stores them NOT NULL). `test/devices.test.js`
  checks it, and the SDK's fake Gladys refuses a payload without them.
- **Secrets.** Never log the password, the cookies (`afg`,
  `twoFactorAuthenticationId`, session) nor a two-factor code. The trusted
  device cookie lives in the integration config under `two_factor_cookie`
  (outside `config_schema`), written with `gladys.setConfig`.
- **Security of the widgets.** A dashboard can hang on a wall. Never offer
  disarming in a widget unless `allow_widget_disarm` is on, and re-check it
  in the action handler. Widget `params` come from our own content, never
  from user input.
- **Alarm.com quirks stay in `src/alarmcom/`.** Device modules only see the
  snapshot shape of `model.js`. A change of the Alarm.com payload is fixed in
  `model.js` (and its test), not across the code.
- **Scene events** fire on transitions only, never on the first snapshot and
  never in response to a received command. Data keys must be declared in the
  trigger `fields`/`variables` (`test/events.test.js`).
- **The container rootfs is read-only.** Write only under `/data`.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading: the Release workflow moves the section.
- **Internationalization.** Every user-facing text exists in **English,
  French, German and Spanish**: manifest texts (`label`, `description`,
  `placeholder`), `src/i18n.js` (statuses, toasts, widget texts) and
  `docs/{en,fr,de,es}.md`, kept in sync. `test/manifest.test.js` and
  `test/i18n.test.js` fail on a missing language.
- **Manifest.** The catalog `description` holds 10 to 100 characters per
  language. Scene triggers, scene actions and widgets need
  `gladys_version >= 5.1.0`. `test/manifest.test.js` ties the manifest to the
  code (defaults, handlers, trigger keys): change both sides together.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network (`test/fixtures.js` fakes
  www.alarm.com).

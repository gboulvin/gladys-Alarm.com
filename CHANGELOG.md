# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-23

### Added

- Alarm.com cloud integration, built on the official JavaScript template:
  sign-in with the Alarm.com account, two-factor authentication (authenticator
  app, SMS or email) with Gladys registered as a trusted device.
- Devices: partitions (disarm, arm stay, arm away, arm night), door/window,
  motion, water, smoke, CO and glass break sensors with their low-battery
  flag, smart locks, garage doors, lights and dimmers, thermostats
  (temperature, setpoint, humidity).
- Scene triggers: arming state changed, sensor triggered, lock locked or
  unlocked, low battery.
- Scene actions: arm (with bypass, entry delay and silent options), disarm,
  read the status (arming state, open sensors, low batteries).
- Dashboard widgets: alarm panel (state, alerts, arming buttons, optional
  confirmed disarm button) and sensors overview.
- Configuration actions: test the connection, send and verify a two-factor
  code.
- Every user-facing text in English, French, German and Spanish, and the user
  documentation in the four languages.

[Unreleased]: https://github.com/gboulvin/gladys-Alarm.com/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gboulvin/gladys-Alarm.com/releases/tag/v1.0.0

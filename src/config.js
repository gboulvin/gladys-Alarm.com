// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys, from the `config_schema` of
// `gladys-assistant-integration.json`. This module provides the defaults and
// normalizes the received object, so the rest of the code never deals with
// `undefined` or with numbers sent as strings.
// -----------------------------------------------------------------------------

// Defaults: they MUST match the `default` values of the manifest config_schema
// (checked by test/manifest.test.js).
export const DEFAULT_CONFIG = {
  username: '',
  password: '',
  // Seconds between two reads of Alarm.com. Alarm.com is a cloud service:
  // faster polling does not make the panel report faster, and may get the
  // account rate-limited.
  poll_frequency: 60,
  force_bypass: false,
  no_entry_delay: false,
  silent_arming: false,
  allow_widget_disarm: false,
};

export const POLL_FREQUENCY_BOUNDS = { min: 30, max: 3600 };

// Internal storage key (outside config_schema, never shown in the UI): the
// "trusted device" cookie Alarm.com issues after a two-factor login.
export const TWO_FACTOR_COOKIE_KEY = 'two_factor_cookie';

const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} raw - config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const pollFrequency = Number(raw.poll_frequency ?? DEFAULT_CONFIG.poll_frequency);
  const config = {
    username: String(raw.username ?? '').trim(),
    password: String(raw.password ?? ''),
    poll_frequency: Number.isFinite(pollFrequency)
      ? Math.min(Math.max(pollFrequency, POLL_FREQUENCY_BOUNDS.min), POLL_FREQUENCY_BOUNDS.max)
      : DEFAULT_CONFIG.poll_frequency,
    force_bypass: toBoolean(raw.force_bypass ?? DEFAULT_CONFIG.force_bypass),
    no_entry_delay: toBoolean(raw.no_entry_delay ?? DEFAULT_CONFIG.no_entry_delay),
    silent_arming: toBoolean(raw.silent_arming ?? DEFAULT_CONFIG.silent_arming),
    allow_widget_disarm: toBoolean(raw.allow_widget_disarm ?? DEFAULT_CONFIG.allow_widget_disarm),
    [TWO_FACTOR_COOKIE_KEY]: String(raw[TWO_FACTOR_COOKIE_KEY] ?? ''),
  };
  // The arming options, in the shape of commands.armPartition.
  config.armingOptions = {
    forceBypass: config.force_bypass,
    noEntryDelay: config.no_entry_delay,
    silentArming: config.silent_arming,
  };
  return config;
}

/** Whether a change of configuration needs a new Alarm.com login. */
export function credentialsChanged(previous, next) {
  return previous.username !== next.username || previous.password !== next.password;
}

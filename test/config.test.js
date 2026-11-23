import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, credentialsChanged, normalizeConfig } from '../src/config.js';

test('normalizeConfig applies the defaults', () => {
  const config = normalizeConfig();
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    assert.equal(config[key], value, key);
  }
  assert.deepEqual(config.armingOptions, {
    forceBypass: false,
    noEntryDelay: false,
    silentArming: false,
  });
});

test('normalizeConfig coerces the form values and bounds the refresh interval', () => {
  const config = normalizeConfig({
    username: '  john@example.com ',
    poll_frequency: '5',
    force_bypass: 'true',
  });
  assert.equal(config.username, 'john@example.com');
  assert.equal(config.poll_frequency, 30);
  assert.equal(config.force_bypass, true);
  assert.equal(normalizeConfig({ poll_frequency: 'abc' }).poll_frequency, 60);
  assert.equal(normalizeConfig({ poll_frequency: 99999 }).poll_frequency, 3600);
});

test('only a change of username or password needs a new session', () => {
  const base = normalizeConfig({ username: 'a', password: 'b' });
  assert.equal(
    credentialsChanged(
      base,
      normalizeConfig({ username: 'a', password: 'b', poll_frequency: 120 }),
    ),
    false,
  );
  assert.equal(credentialsChanged(base, normalizeConfig({ username: 'a', password: 'c' })), true);
  assert.equal(
    credentialsChanged(
      base,
      normalizeConfig({ username: 'a', password: 'b', two_factor_cookie: 'x' }),
    ),
    false,
  );
});

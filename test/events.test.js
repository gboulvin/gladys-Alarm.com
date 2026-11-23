import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { buildSnapshot } from '../src/alarmcom/model.js';
import { SCENE_TRIGGER_KEYS, diffEvents } from '../src/events.js';
import { catalogResources } from './fixtures.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const gladys = createFakeGladys();
const before = buildSnapshot(catalogResources());
const after = buildSnapshot(
  catalogResources({
    '9001-127': { state: 2 },
    '9001-2': { state: 4 },
    '9001-4': { state: 6 },
    '9001-50': { state: 2, lowBattery: true },
  }),
);

test('no event on the first snapshot', () => {
  assert.deepEqual(diffEvents(gladys, undefined, after), []);
});

test('one event per transition, none when nothing changes', () => {
  assert.deepEqual(diffEvents(gladys, after, after), []);
  const events = diffEvents(gladys, before, after);
  assert.deepEqual(
    events.map((event) => event.key),
    [
      'alarm_state_changed',
      'sensor_triggered',
      'sensor_triggered',
      'lock_state_changed',
      'low_battery',
    ],
  );
  const alarm = events[0].data;
  assert.equal(alarm.state, 'armed_stay');
  assert.equal(alarm.previous_state, 'disarmed');
  assert.equal(alarm.device, gladys.externalIds('partition', '9001-127').device);
});

test('a sensor going back to rest fires nothing', () => {
  assert.equal(
    diffEvents(gladys, after, before).filter((event) => event.key === 'sensor_triggered').length,
    0,
  );
});

test('event data only carries keys the trigger declares, with valid filter values', () => {
  const events = diffEvents(gladys, before, after);
  for (const { key, data } of events) {
    const trigger = manifest.scene_triggers.find((entry) => entry.key === key);
    assert.ok(trigger, `trigger ${key} is declared`);
    const declared = [...(trigger.fields ?? []), ...(trigger.variables ?? [])].map((f) => f.key);
    for (const [dataKey, value] of Object.entries(data)) {
      assert.ok(declared.includes(dataKey), `${key}: data.${dataKey} is not declared`);
      assert.ok(
        value === null || typeof value !== 'object',
        `${key}: data.${dataKey} is a primitive`,
      );
      const filter = trigger.fields?.find((field) => field.key === dataKey && field.options);
      if (filter) {
        assert.ok(
          filter.options.some((option) => option.value === value),
          `${key}: "${value}" is one of the ${dataKey} options`,
        );
      }
    }
  }
});

test('SCENE_TRIGGER_KEYS lists the declared triggers', () => {
  assert.deepEqual(
    [...SCENE_TRIGGER_KEYS].sort(),
    manifest.scene_triggers.map((trigger) => trigger.key).sort(),
  );
});

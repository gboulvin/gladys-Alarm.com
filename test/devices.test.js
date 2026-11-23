import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { buildSnapshot } from '../src/alarmcom/model.js';
import { buildDiscoveredDevices, collectStates, resolveDevice } from '../src/devices/index.js';
import { sensorValue } from '../src/devices/sensor.js';
import { catalogResources } from './fixtures.js';

const gladys = createFakeGladys();
const snapshot = buildSnapshot(catalogResources(), { usesCelsius: true });

test('every feature carries the columns Gladys needs to create it', () => {
  for (const device of buildDiscoveredDevices(gladys, snapshot)) {
    assert.ok(device.features.length > 0, `${device.name} has features`);
    for (const feature of device.features) {
      for (const column of ['name', 'min', 'max', 'read_only', 'has_feedback']) {
        assert.notEqual(feature[column], undefined, `${feature.external_id}.${column}`);
        assert.notEqual(feature[column], null, `${feature.external_id}.${column}`);
      }
      assert.ok(feature.external_id.startsWith(`${device.external_id}:`));
    }
  }
});

test('the fake Gladys accepts the devices and their states', async () => {
  const fresh = createFakeGladys();
  await fresh.publishDiscoveredDevices(buildDiscoveredDevices(fresh, snapshot));
  await fresh.publishStates(collectStates(fresh, snapshot));
  assert.equal(fresh.fake.discoveredDevices.length, 11);
});

test('external ids are built from the Alarm.com ids', () => {
  const ids = buildDiscoveredDevices(gladys, snapshot).map((device) => device.external_id);
  assert.ok(ids.includes(gladys.externalIds('partition', '9001-127').device));
  assert.ok(ids.includes(gladys.externalIds('sensor', '9001-1').device));
  assert.equal(new Set(ids).size, ids.length, 'external ids are unique');
});

test('the partition offers its arming modes as a select', () => {
  const partition = buildDiscoveredDevices(gladys, snapshot).find(
    (d) => d.model === 'Alarm.com partition',
  );
  const [feature] = partition.features;
  assert.equal(feature.category, 'text');
  assert.equal(feature.type, 'select');
  assert.deepEqual(
    feature.supported_options.map((option) => option.value),
    ['disarmed', 'armed_stay', 'armed_away', 'armed_night'],
  );
  const states = collectStates(gladys, snapshot);
  const armState = states.find((s) => s.device_feature_external_id === feature.external_id);
  assert.equal(armState.text, 'disarmed');
});

test('opening sensors read 1 when closed, other detections 1 when active', () => {
  assert.equal(sensorValue({ kind: 'opening', active: false }), 1);
  assert.equal(sensorValue({ kind: 'opening', active: true }), 0);
  assert.equal(sensorValue({ kind: 'motion', active: true }), 1);
  assert.equal(sensorValue({ kind: 'leak', active: false }), 0);
});

test('resolveDevice finds the entry of a device external id', () => {
  const resolved = resolveDevice(gladys, snapshot, gladys.externalIds('lock', '9001-50').device);
  assert.equal(resolved.deviceType.type, 'lock');
  assert.equal(resolved.entry.name, 'Front lock');
  assert.equal(resolveDevice(gladys, snapshot, 'ext:unknown'), undefined);
});

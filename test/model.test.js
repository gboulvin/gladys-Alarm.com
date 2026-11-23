import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SENSOR_KINDS, buildSnapshot, sensorKind } from '../src/alarmcom/model.js';
import { catalogResources } from './fixtures.js';

test('the snapshot maps every supported device of the catalog', () => {
  const snapshot = buildSnapshot(catalogResources(), { usesCelsius: true, systemId: '9001' });
  assert.equal(snapshot.partitions.length, 1);
  assert.deepEqual(
    snapshot.sensors.map((sensor) => [sensor.name, sensor.kind]),
    [
      ['Front door', SENSOR_KINDS.OPENING],
      ['Hallway motion', SENSOR_KINDS.MOTION],
      ['Kitchen smoke', SENSOR_KINDS.SMOKE],
      ['Basement water', SENSOR_KINDS.LEAK],
      ['Living room glass', SENSOR_KINDS.GLASS_BREAK],
    ],
    'the panic button is left out',
  );
  assert.equal(snapshot.locks.length, 1);
  assert.equal(snapshot.garageDoors.length, 1);
  assert.equal(snapshot.lights.length, 2);
  assert.equal(snapshot.thermostats.length, 1);
});

test('partition: state names and night arming support', () => {
  const [partition] = buildSnapshot(catalogResources({ '9001-127': { state: 3 } })).partitions;
  assert.equal(partition.state, 'armed_away');
  assert.equal(partition.supportsNight, true);
  const [noNight] = buildSnapshot(
    catalogResources({ '9001-127': { extendedArmingOptions: { ArmedNight: [] } } }),
  ).partitions;
  assert.equal(noNight.supportsNight, false);
});

test('sensor kind falls back on the shape of the state', () => {
  assert.equal(sensorKind(999, 2), SENSOR_KINDS.OPENING);
  assert.equal(sensorKind(999, 4), SENSOR_KINDS.MOTION);
  assert.equal(sensorKind(999, 6), SENSOR_KINDS.LEAK);
  assert.equal(sensorKind(999, 0), null);
  assert.equal(sensorKind(69, 1), null, 'a mobile phone is ignored');
});

test('active flag, lock, garage door, light and thermostat values', () => {
  const snapshot = buildSnapshot(
    catalogResources({
      '9001-1': { state: 2, lowBattery: true },
      '9001-50': { state: 2 },
      '9001-60': { state: 1 },
    }),
    { usesCelsius: true },
  );
  const door = snapshot.sensors.find((sensor) => sensor.id === '9001-1');
  assert.equal(door.active, true);
  assert.equal(door.lowBattery, true);
  assert.equal(snapshot.locks[0].locked, false);
  assert.equal(snapshot.garageDoors[0].open, true);
  assert.equal(snapshot.lights[0].on, true);
  assert.equal(snapshot.lights[0].brightness, 80);
  assert.equal(snapshot.lights[1].on, false);
  assert.equal(snapshot.lights[1].brightness, null);
  assert.equal(snapshot.thermostats[0].ambientTemperature, 20.5);
  assert.equal(snapshot.thermostats[0].usesCelsius, true);
});

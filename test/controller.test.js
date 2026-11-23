import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { AlarmComController, CONNECTION } from '../src/controller.js';
import { normalizeConfig } from '../src/config.js';
import { AuthenticationError, OtpRequiredError } from '../src/alarmcom/errors.js';
import { catalogResources, createFakeClient } from './fixtures.js';
import { CREDENTIALS, startController } from './helpers.js';

test('start logs in, publishes the devices and their states, reports connected', async () => {
  const { gladys, controller } = await startController();
  assert.equal(controller.connection, CONNECTION.CONNECTED);
  assert.equal(gladys.fake.discoveredDevices.length, 11);
  assert.ok(gladys.fake.states.length > 0);
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.equal(gladys.fake.sceneEvents.length, 0, 'no event on the first read');
});

test('without credentials: no client, a status message asks for them', async () => {
  const gladys = createFakeGladys();
  const controller = new AlarmComController(gladys, { createClient: () => assert.fail() });
  await controller.start(normalizeConfig({}));
  assert.equal(controller.connection, CONNECTION.NOT_CONFIGURED);
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.ok(gladys.fake.connectionStatus.message.fr);
});

test('a refused password is reported as such', async () => {
  const client = createFakeClient();
  client.loginError = new AuthenticationError('refused');
  const { gladys, controller } = await startController({ client });
  assert.equal(controller.connection, CONNECTION.ERROR);
  assert.match(gladys.fake.connectionStatus.message.en, /refused the username/);
});

test('a refresh publishes only the changed states and fires the transitions', async () => {
  const { gladys, controller, client } = await startController();
  const statesBefore = gladys.fake.states.length;
  await controller.refresh();
  assert.equal(gladys.fake.states.length, statesBefore, 'nothing changed, nothing published');

  client.resources = catalogResources({
    '9001-127': { state: 3 },
    '9001-1': { state: 2 },
    '9001-50': { state: 2 },
    '9001-2': { lowBattery: true },
  });
  await controller.refresh();
  const newStates = gladys.fake.states.slice(statesBefore);
  assert.equal(newStates.length, 4, 'arm state, door, lock, battery');
  assert.deepEqual(gladys.fake.sceneEvents.map((event) => event.key).sort(), [
    'alarm_state_changed',
    'lock_state_changed',
    'low_battery',
    'sensor_triggered',
  ]);
});

test('the device list is published again when a device appears', async () => {
  const { gladys, controller, client } = await startController();
  const publications = gladys.fake.bodies('POST', '/discovered_device').length;
  client.resources = [
    ...catalogResources(),
    {
      id: '9001-9',
      type: 'devices/sensor',
      attributes: { description: 'Back door', state: 1, deviceType: 1 },
    },
  ];
  await controller.refresh();
  assert.equal(gladys.fake.bodies('POST', '/discovered_device').length, publications + 1);
  assert.equal(gladys.fake.discoveredDevices.length, 12);
});

test('device commands reach the right Alarm.com endpoint', async () => {
  const { gladys, controller, client } = await startController();
  const device = (type, id) => ({ external_id: gladys.externalIds(type, id).device });
  const feature = (type, id, key) => ({ external_id: gladys.externalIds(type, id).feature(key) });

  await controller.setValue(
    device('partition', '9001-127'),
    feature('partition', '9001-127', 'arm-state'),
    'armed_night',
  );
  await controller.setValue(device('lock', '9001-50'), feature('lock', '9001-50', 'lock'), 0);
  await controller.setValue(
    device('garage-door', '9001-60'),
    feature('garage-door', '9001-60', 'open'),
    1,
  );
  await controller.setValue(
    device('light', '9001-70'),
    feature('light', '9001-70', 'brightness'),
    40,
  );
  await controller.setValue(
    device('thermostat', '9001-80'),
    feature('thermostat', '9001-80', 'target-temperature'),
    22,
  );

  assert.deepEqual(client.commands, [
    {
      endpoint: 'web/api/devices/partitions/9001-127',
      command: 'armStay',
      body: { nightArming: true },
    },
    { endpoint: 'web/api/devices/locks/9001-50', command: 'unlock', body: {} },
    { endpoint: 'web/api/devices/garageDoors/9001-60', command: 'open', body: {} },
    { endpoint: 'web/api/devices/lights/9001-70', command: 'turnOn', body: { dimmerLevel: 40 } },
    {
      endpoint: 'web/api/devices/thermostats/9001-80',
      command: 'setState',
      body: { desiredHeatSetpoint: 22 },
    },
  ]);
  await assert.rejects(
    controller.setValue(device('sensor', '9001-1'), feature('sensor', '9001-1', 'state'), 1),
    /No Alarm.com device/,
  );
});

test('arming options of the configuration are sent when the panel supports them', async () => {
  const { controller, client } = await startController({
    config: { force_bypass: true, silent_arming: true },
  });
  await controller.arm(undefined, 'armed_away');
  assert.deepEqual(client.commands.at(-1).body, { forceBypass: true, silentArming: true });
});

test('two-factor: the status asks for the code, the verified code is saved', async () => {
  const client = createFakeClient();
  client.loginError = new OtpRequiredError(['app', 'sms']);
  const { gladys, controller } = await startController({ client });
  assert.equal(controller.connection, CONNECTION.OTP_REQUIRED);
  assert.match(gladys.fake.connectionStatus.message.en, /app, sms/);

  await controller.requestOtp('sms');
  assert.deepEqual(client.otpRequests, ['sms']);

  client.loginError = undefined;
  await controller.verifyOtp('123456', 'app');
  assert.deepEqual(client.submitted, { code: '123456', method: 'app' });
  assert.equal(gladys.fake.config.two_factor_cookie, 'trusted-cookie');
  assert.equal(controller.connection, CONNECTION.CONNECTED);
  assert.equal(gladys.fake.discoveredDevices.length, 11);
});

test('the trusted-device cookie of the configuration reaches the client', async () => {
  let options;
  const gladys = createFakeGladys();
  const controller = new AlarmComController(gladys, {
    createClient: (o) => {
      options = o;
      return createFakeClient();
    },
  });
  await controller.start(normalizeConfig({ ...CREDENTIALS, two_factor_cookie: 'KEEP' }));
  controller.stop();
  assert.equal(options.twoFactorCookie, 'KEEP');
});

test('testConnection reports what was found', async () => {
  const { controller } = await startController();
  const message = await controller.testConnection();
  assert.match(message.en, /1 partition\(s\), 5 sensor\(s\), 5 other device\(s\)/);
  assert.ok(message.fr && message.de && message.es);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { startController } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const outputsOf = (key) =>
  manifest.scene_actions.find((action) => action.key === key).outputs.map((output) => output.key);

function assertDeclared(key, outputs) {
  const declared = outputsOf(key);
  for (const [name, value] of Object.entries(outputs)) {
    assert.ok(declared.includes(name), `${key}: output ${name} is not declared`);
    assert.ok(typeof value !== 'object', `${key}: output ${name} is a scalar`);
  }
}

test('arm_system arms every partition when none is chosen', async () => {
  const { controller, client } = await startController();
  const outputs = await SCENE_ACTIONS.arm_system(controller, { fields: { mode: 'armed_stay' } });
  assert.deepEqual(outputs, { success: true, state: 'armed_stay', partitions: 1 });
  assertDeclared('arm_system', outputs);
  assert.equal(client.commands.at(-1).command, 'armStay');
});

test('arm_system sends the options the scene asked for', async () => {
  const { gladys, controller, client } = await startController();
  await SCENE_ACTIONS.arm_system(controller, {
    fields: {
      device: gladys.externalIds('partition', '9001-127').device,
      mode: 'armed_away',
      no_entry_delay: true,
    },
  });
  assert.deepEqual(client.commands.at(-1), {
    endpoint: 'web/api/devices/partitions/9001-127',
    command: 'armAway',
    body: { noEntryDelay: true },
  });
});

test('arm_system refuses a device that is not a partition', async () => {
  const { gladys, controller } = await startController();
  await assert.rejects(
    SCENE_ACTIONS.arm_system(controller, {
      fields: { device: gladys.externalIds('lock', '9001-50').device, mode: 'armed_away' },
    }),
    /not an Alarm.com partition/,
  );
});

test('disarm_system disarms', async () => {
  const { controller, client } = await startController();
  const outputs = await SCENE_ACTIONS.disarm_system(controller, { fields: {} });
  assertDeclared('disarm_system', outputs);
  assert.equal(client.commands.at(-1).command, 'disarm');
});

test('get_system_status reads fresh values', async () => {
  const { controller } = await startController();
  const outputs = await SCENE_ACTIONS.get_system_status(controller, { fields: {} });
  assertDeclared('get_system_status', outputs);
  assert.deepEqual(outputs, {
    state: 'disarmed',
    armed: false,
    open_sensors: 0,
    open_sensor_names: '',
    low_battery: 0,
  });
});

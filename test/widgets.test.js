import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { AlarmComController } from '../src/controller.js';
import { normalizeConfig } from '../src/config.js';
import {
  ALARM_PANEL_WIDGET,
  SENSORS_OVERVIEW_WIDGET,
  WIDGETS,
  refreshWidgets,
} from '../src/widgets.js';
import { catalogResources, createFakeClient } from './fixtures.js';
import { startController } from './helpers.js';

const panel = WIDGETS[ALARM_PANEL_WIDGET];
const overview = WIDGETS[SENSORS_OVERVIEW_WIDGET];
const request = (controller, settings = {}) => ({
  settings,
  language: 'en',
  units: 'metric',
  config: controller.config,
});

test('the alarm panel content is rendered exactly as sent', async () => {
  const { controller } = await startController();
  const content = await panel.get(controller, request(controller));
  assert.deepEqual(validateWidgetContent(content), []);
  const keys = content.components.filter((c) => c.type === 'button').map((c) => c.action.key);
  assert.deepEqual(keys, ['arm_away', 'arm_stay', 'arm_night'], 'no disarm by default');
});

test('the disarm button needs the configuration switch, and asks for confirmation', async () => {
  const { controller } = await startController({ config: { allow_widget_disarm: true } });
  const content = await panel.get(controller, request(controller));
  assert.deepEqual(validateWidgetContent(content), []);
  const disarm = content.components.find((c) => c.action?.key === 'disarm');
  assert.equal(disarm.action.confirm, true);
});

test('a disarm tap is refused when the switch is off', async () => {
  const { controller, client } = await startController();
  await assert.rejects(
    panel.action(controller, {
      actionKey: 'disarm',
      params: {},
      settings: {},
      config: controller.config,
    }),
    /disabled in the configuration/,
  );
  assert.equal(client.commands.length, 0);
});

test('every button of the panel is handled and answers a short toast', async () => {
  const { controller, client } = await startController({ config: { allow_widget_disarm: true } });
  const content = await panel.get(controller, request(controller));
  for (const { action } of content.components.filter((c) => c.type === 'button')) {
    const toast = await panel.action(controller, {
      actionKey: action.key,
      params: action.params,
      settings: {},
      config: controller.config,
    });
    for (const lang of ['en', 'fr', 'de', 'es']) {
      assert.ok(toast[lang] && toast[lang].length <= 200, `${action.key} toast in ${lang}`);
    }
  }
  assert.deepEqual(
    client.commands.map((c) => c.command),
    ['armAway', 'armStay', 'armStay', 'disarm'],
  );
});

test('an armed partition with open sensors and alerts stays valid', async () => {
  const { controller, client } = await startController();
  client.resources = catalogResources({
    '9001-127': { state: 3, desiredState: 1, needsClearIssuesPrompt: true },
    '9001-1': { state: 2, lowBattery: true },
    '9001-3': { isMalfunctioning: true },
    '9001-50': { state: 2 },
  });
  await controller.refresh();
  const content = await panel.get(controller, request(controller));
  assert.deepEqual(validateWidgetContent(content), []);
  const status = content.components.find((c) => c.type === 'status');
  assert.ok(status.items.some((item) => item.color === 'warning'));
  assert.deepEqual(validateWidgetContent(await overview.get(controller, request(controller))), []);
});

test('the panel follows the partition chosen in the settings', async () => {
  const { gladys, controller } = await startController();
  const content = await panel.get(
    controller,
    request(controller, { partition: gladys.externalIds('partition', '9001-127').device }),
  );
  assert.equal(content.components[0].text, 'House');
});

test('without data the widgets still render a valid content', async () => {
  const gladys = createFakeGladys();
  const controller = new AlarmComController(gladys, { createClient: () => createFakeClient() });
  controller.config = normalizeConfig();
  for (const widget of [panel, overview]) {
    assert.deepEqual(validateWidgetContent(await widget.get(controller, request(controller))), []);
  }
});

test('the sensors overview lists the active sensors first', async () => {
  const { controller, client } = await startController();
  client.resources = catalogResources({ '9001-2': { state: 4 } });
  await controller.refresh();
  const content = await overview.get(controller, request(controller));
  assert.deepEqual(validateWidgetContent(content), []);
  const status = content.components.find((c) => c.type === 'status');
  assert.equal(status.items[0].label, 'Hallway motion');
});

test('an unknown widget action fails', async () => {
  const { controller } = await startController();
  await assert.rejects(
    panel.action(controller, {
      actionKey: 'nope',
      params: {},
      settings: {},
      config: controller.config,
    }),
    /Unknown widget action/,
  );
});

test('refreshWidgets nudges every widget', () => {
  const gladys = createFakeGladys();
  refreshWidgets(gladys);
  assert.deepEqual(gladys.fake.widgetRefreshes, Object.keys(WIDGETS));
});

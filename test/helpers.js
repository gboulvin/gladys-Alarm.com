import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { AlarmComController } from '../src/controller.js';
import { normalizeConfig } from '../src/config.js';
import { createFakeClient } from './fixtures.js';

export const CREDENTIALS = { username: 'john@example.com', password: 's3cret' };

/**
 * A controller started against the fake Gladys and a fake Alarm.com client.
 * The poll and post-command timers are stopped: tests drive refresh() by hand.
 */
export async function startController({ config = {}, client = createFakeClient() } = {}) {
  const gladys = createFakeGladys();
  let contentChanges = 0;
  const controller = new AlarmComController(gladys, {
    createClient: () => client,
    onContentChanged: () => {
      contentChanges += 1;
    },
  });
  await controller.start(normalizeConfig({ ...CREDENTIALS, ...config }));
  controller.stop();
  controller.scheduleRefreshAfterCommand = () => {};
  return { gladys, controller, client, contentChanges: () => contentChanges };
}

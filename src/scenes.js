// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// Rules that matter (see the template documentation):
//   - `fields` arrive RESOLVED: a `"source": "devices"` field is the chosen
//     device external id (empty = every partition here);
//   - resolve an object of the declared `outputs` only (scalars);
//   - throwing fails THIS action only: the scene logs it and continues;
//   - never fire a scene event because an action was received (no loops):
//     the events come from the next Alarm.com read, like any other change.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { ARM_MODES } from './alarmcom/commands.js';

const logger = createLogger({ name: 'scenes' });

const toBoolean = (value, fallback) =>
  value === undefined || value === null || value === ''
    ? fallback
    : value === true || value === 'true';

/** Outputs shared by the status-reading actions. */
function statusOutputs(snapshot) {
  const [first] = snapshot.partitions;
  const activeSensors = snapshot.sensors.filter((sensor) => sensor.active);
  return {
    state: first?.state ?? 'unknown',
    armed: snapshot.partitions.some((partition) => partition.state.startsWith('armed')),
    open_sensors: activeSensors.length,
    open_sensor_names: activeSensors
      .map((sensor) => sensor.name)
      .join(', ')
      .slice(0, 900),
    low_battery: [...snapshot.sensors, ...snapshot.locks].filter((device) => device.lowBattery)
      .length,
  };
}

/**
 * Handlers keyed by the `scene_actions` keys of the manifest. `controller` is
 * the AlarmComController (index.js passes it).
 */
export const SCENE_ACTIONS = {
  async arm_system(controller, { fields }) {
    const mode = fields.mode || 'armed_away';
    if (!ARM_MODES.includes(mode)) {
      throw new Error(`Unknown arming mode "${mode}"`);
    }
    logger.info(`Scene action arm_system <- ${mode} ${fields.device || '(all partitions)'}`);
    const defaults = controller.config.armingOptions;
    const partitions = await controller.arm(fields.device, mode, {
      forceBypass: toBoolean(fields.force_bypass, defaults.forceBypass),
      noEntryDelay: toBoolean(fields.no_entry_delay, defaults.noEntryDelay),
      silentArming: toBoolean(fields.silent_arming, defaults.silentArming),
    });
    return { success: true, state: mode, partitions: partitions.length };
  },

  async disarm_system(controller, { fields }) {
    logger.info(`Scene action disarm_system <- ${fields.device || '(all partitions)'}`);
    const partitions = await controller.disarm(fields.device);
    return { success: true, state: 'disarmed', partitions: partitions.length };
  },

  // Read Alarm.com now, so the following actions can gate on fresh values
  // ("only arm when every door is closed").
  async get_system_status(controller) {
    logger.info('Scene action get_system_status');
    const snapshot = await controller.refresh();
    return statusOutputs(snapshot);
  },
};

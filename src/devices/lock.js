// -----------------------------------------------------------------------------
// Device type: LOCK (smart door locks). 1 = locked, 0 = unlocked.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { setLock } from '../alarmcom/commands.js';

export const LOCK_TYPE = 'lock';
export const LOCK_FEATURES = { LOCK: 'lock', BATTERY_LOW: 'battery-low' };

export const lock = {
  type: LOCK_TYPE,

  entries: (snapshot) => snapshot.locks,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(LOCK_TYPE, entry.id);
    return {
      name: entry.name,
      external_id: ids.device,
      model: 'Alarm.com lock',
      should_poll: false,
      features: [
        {
          name: 'Lock',
          external_id: ids.feature(LOCK_FEATURES.LOCK),
          category: DEVICE_FEATURE_CATEGORIES.LOCK,
          type: DEVICE_FEATURE_TYPES.LOCK.BINARY,
          min: 0,
          max: 1,
          read_only: !entry.canControl,
          has_feedback: true,
          keep_history: true,
        },
        {
          name: 'Low battery',
          external_id: ids.feature(LOCK_FEATURES.BATTERY_LOW),
          category: DEVICE_FEATURE_CATEGORIES.BATTERY_LOW,
          type: DEVICE_FEATURE_TYPES.BATTERY_LOW.BINARY,
          min: 0,
          max: 1,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  states(gladys, entry) {
    const ids = gladys.externalIds(LOCK_TYPE, entry.id);
    const states = [
      {
        device_feature_external_id: ids.feature(LOCK_FEATURES.BATTERY_LOW),
        state: entry.lowBattery ? 1 : 0,
      },
    ];
    if (entry.locked !== null) {
      states.unshift({
        device_feature_external_id: ids.feature(LOCK_FEATURES.LOCK),
        state: entry.locked ? 1 : 0,
      });
    }
    return states;
  },

  async setValue({ client, entry, featureKey, value }) {
    if (featureKey !== LOCK_FEATURES.LOCK) {
      throw new Error(`Feature ${featureKey} of ${entry.name} is read-only`);
    }
    await setLock(client, entry, Number(value) === 1);
  },
};

// -----------------------------------------------------------------------------
// Device type: GARAGE DOOR. A binary switch: 1 = open, 0 = closed. Writing
// it opens or closes the door; the state follows what Alarm.com reports.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { setGarageDoor } from '../alarmcom/commands.js';

export const GARAGE_DOOR_TYPE = 'garage-door';
export const GARAGE_DOOR_FEATURES = { OPEN: 'open' };

export const garageDoor = {
  type: GARAGE_DOOR_TYPE,

  entries: (snapshot) => snapshot.garageDoors,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(GARAGE_DOOR_TYPE, entry.id);
    return {
      name: entry.name,
      external_id: ids.device,
      model: 'Alarm.com garage door',
      should_poll: false,
      features: [
        {
          name: 'Open',
          external_id: ids.feature(GARAGE_DOOR_FEATURES.OPEN),
          category: DEVICE_FEATURE_CATEGORIES.SWITCH,
          type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
          min: 0,
          max: 1,
          read_only: !entry.canControl,
          has_feedback: true,
          keep_history: true,
        },
      ],
    };
  },

  states(gladys, entry) {
    if (entry.open === null) {
      return [];
    }
    const ids = gladys.externalIds(GARAGE_DOOR_TYPE, entry.id);
    return [
      {
        device_feature_external_id: ids.feature(GARAGE_DOOR_FEATURES.OPEN),
        state: entry.open ? 1 : 0,
      },
    ];
  },

  async setValue({ client, entry, featureKey, value }) {
    if (featureKey !== GARAGE_DOOR_FEATURES.OPEN) {
      throw new Error(`Unknown garage door feature ${featureKey}`);
    }
    await setGarageDoor(client, entry, Number(value) === 1);
  },
};

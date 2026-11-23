// -----------------------------------------------------------------------------
// Device type: LIGHT (Z-Wave lights and dimmers paired with the panel).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { setLight } from '../alarmcom/commands.js';

export const LIGHT_TYPE = 'light';
export const LIGHT_FEATURES = { POWER: 'power', BRIGHTNESS: 'brightness' };

export const light = {
  type: LIGHT_TYPE,

  entries: (snapshot) => snapshot.lights,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(LIGHT_TYPE, entry.id);
    const features = [
      {
        name: 'On/Off',
        external_id: ids.feature(LIGHT_FEATURES.POWER),
        category: DEVICE_FEATURE_CATEGORIES.LIGHT,
        type: DEVICE_FEATURE_TYPES.LIGHT.BINARY,
        min: 0,
        max: 1,
        read_only: !entry.canControl,
        has_feedback: true,
        keep_history: true,
      },
    ];
    if (entry.isDimmer) {
      features.push({
        name: 'Brightness',
        external_id: ids.feature(LIGHT_FEATURES.BRIGHTNESS),
        category: DEVICE_FEATURE_CATEGORIES.LIGHT,
        type: DEVICE_FEATURE_TYPES.LIGHT.BRIGHTNESS,
        unit: DEVICE_FEATURE_UNITS.PERCENT,
        min: 0,
        max: 100,
        read_only: !entry.canControl,
        has_feedback: true,
        keep_history: true,
      });
    }
    return {
      name: entry.name,
      external_id: ids.device,
      model: entry.isDimmer ? 'Alarm.com dimmer' : 'Alarm.com light',
      should_poll: false,
      features,
    };
  },

  states(gladys, entry) {
    const ids = gladys.externalIds(LIGHT_TYPE, entry.id);
    const states = [];
    if (entry.on !== null) {
      states.push({
        device_feature_external_id: ids.feature(LIGHT_FEATURES.POWER),
        state: entry.on ? 1 : 0,
      });
    }
    if (entry.isDimmer && entry.brightness !== null) {
      states.push({
        device_feature_external_id: ids.feature(LIGHT_FEATURES.BRIGHTNESS),
        state: entry.brightness,
      });
    }
    return states;
  },

  async setValue({ client, entry, featureKey, value }) {
    const number = Number(value);
    if (featureKey === LIGHT_FEATURES.POWER) {
      await setLight(client, entry, number === 1);
      return;
    }
    if (featureKey === LIGHT_FEATURES.BRIGHTNESS) {
      await setLight(client, entry, number > 0, number);
      return;
    }
    throw new Error(`Unknown light feature ${featureKey}`);
  },
};

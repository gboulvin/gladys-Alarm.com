// -----------------------------------------------------------------------------
// Device type: SENSOR (contacts, motion, water, smoke, CO, glass break).
//
// Read-only. The detection is a binary feature whose category follows what
// the sensor detects; its external id stays `state` whatever the kind, so a
// sensor reclassified by Alarm.com keeps its history. Every sensor also
// carries a low-battery flag.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { SENSOR_KINDS } from '../alarmcom/model.js';

export const SENSOR_TYPE = 'sensor';
export const SENSOR_FEATURES = { STATE: 'state', BATTERY_LOW: 'battery-low' };

const KIND_FEATURES = {
  [SENSOR_KINDS.OPENING]: {
    name: 'Opening',
    category: DEVICE_FEATURE_CATEGORIES.OPENING_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  },
  [SENSOR_KINDS.MOTION]: {
    name: 'Motion',
    category: DEVICE_FEATURE_CATEGORIES.MOTION_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  },
  [SENSOR_KINDS.LEAK]: {
    name: 'Water leak',
    category: DEVICE_FEATURE_CATEGORIES.LEAK_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  },
  [SENSOR_KINDS.SMOKE]: {
    name: 'Smoke',
    category: DEVICE_FEATURE_CATEGORIES.SMOKE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  },
  [SENSOR_KINDS.CO]: {
    name: 'Carbon monoxide',
    category: DEVICE_FEATURE_CATEGORIES.CO_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  },
  [SENSOR_KINDS.GLASS_BREAK]: {
    name: 'Glass break',
    category: DEVICE_FEATURE_CATEGORIES.VIBRATION_SENSOR,
    type: DEVICE_FEATURE_TYPES.VIBRATION_SENSOR.BINARY,
  },
};

/**
 * Value of the detection feature. Gladys' opening sensors read 1 when closed
 * (the contact is made) and 0 when open; every other kind reads 1 when it
 * detects something.
 */
export function sensorValue(entry) {
  if (entry.kind === SENSOR_KINDS.OPENING) {
    return entry.active ? 0 : 1;
  }
  return entry.active ? 1 : 0;
}

export const sensor = {
  type: SENSOR_TYPE,

  entries: (snapshot) => snapshot.sensors,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(SENSOR_TYPE, entry.id);
    return {
      name: entry.name,
      external_id: ids.device,
      model: `Alarm.com ${entry.kind.replace('_', ' ')} sensor`,
      should_poll: false,
      features: [
        {
          ...KIND_FEATURES[entry.kind],
          external_id: ids.feature(SENSOR_FEATURES.STATE),
          min: 0,
          max: 1,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
        {
          name: 'Low battery',
          external_id: ids.feature(SENSOR_FEATURES.BATTERY_LOW),
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
    const ids = gladys.externalIds(SENSOR_TYPE, entry.id);
    const states = [
      {
        device_feature_external_id: ids.feature(SENSOR_FEATURES.BATTERY_LOW),
        state: entry.lowBattery ? 1 : 0,
      },
    ];
    if (entry.known) {
      states.unshift({
        device_feature_external_id: ids.feature(SENSOR_FEATURES.STATE),
        state: sensorValue(entry),
      });
    }
    return states;
  },
};

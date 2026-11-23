// -----------------------------------------------------------------------------
// Scene triggers (manifest `scene_triggers`, Gladys 5.1+).
//
// Alarm.com is polled: each refresh compares the new snapshot with the
// previous one and fires ONE event per transition, never one per poll (the
// core admits 300 events a minute). Nothing fires on the first snapshot: a
// state seen at startup is not something that just happened.
//
// `device` is the device external id, the value a `"source": "devices"`
// filter stores. Only keys declared in the trigger `fields` and `variables`
// are kept by the core (see test/events.test.js).
// -----------------------------------------------------------------------------

import { PARTITION_TYPE } from './devices/partition.js';
import { SENSOR_TYPE } from './devices/sensor.js';
import { LOCK_TYPE } from './devices/lock.js';

// Trigger keys, as declared in the manifest. Scenes store them: forever.
export const SCENE_TRIGGERS = {
  ALARM_STATE_CHANGED: 'alarm_state_changed',
  SENSOR_TRIGGERED: 'sensor_triggered',
  LOCK_STATE_CHANGED: 'lock_state_changed',
  LOW_BATTERY: 'low_battery',
};

export const SCENE_TRIGGER_KEYS = Object.values(SCENE_TRIGGERS);

const byId = (list) => new Map(list.map((entry) => [entry.id, entry]));

/**
 * Scene events between two snapshots.
 * @returns {Array<{ key: string, data: object }>}
 */
export function diffEvents(gladys, previous, next) {
  if (!previous) {
    return [];
  }
  const events = [];
  const deviceId = (type, entry) => gladys.externalIds(type, entry.id).device;

  const previousPartitions = byId(previous.partitions);
  for (const partition of next.partitions) {
    const before = previousPartitions.get(partition.id);
    if (before && before.state !== partition.state && partition.state !== 'unknown') {
      events.push({
        key: SCENE_TRIGGERS.ALARM_STATE_CHANGED,
        data: {
          device: deviceId(PARTITION_TYPE, partition),
          state: partition.state,
          previous_state: before.state,
          partition_name: partition.name,
        },
      });
    }
  }

  const previousSensors = byId(previous.sensors);
  for (const sensor of next.sensors) {
    const before = previousSensors.get(sensor.id);
    if (!before) {
      continue;
    }
    if (sensor.known && before.known && sensor.active && !before.active) {
      events.push({
        key: SCENE_TRIGGERS.SENSOR_TRIGGERED,
        data: {
          device: deviceId(SENSOR_TYPE, sensor),
          kind: sensor.kind,
          sensor_name: sensor.name,
        },
      });
    }
    if (sensor.lowBattery && !before.lowBattery) {
      events.push({
        key: SCENE_TRIGGERS.LOW_BATTERY,
        data: { device: deviceId(SENSOR_TYPE, sensor), device_name: sensor.name },
      });
    }
  }

  const previousLocks = byId(previous.locks);
  for (const lock of next.locks) {
    const before = previousLocks.get(lock.id);
    if (!before) {
      continue;
    }
    if (lock.locked !== null && before.locked !== null && lock.locked !== before.locked) {
      events.push({
        key: SCENE_TRIGGERS.LOCK_STATE_CHANGED,
        data: {
          device: deviceId(LOCK_TYPE, lock),
          state: lock.locked ? 'locked' : 'unlocked',
          lock_name: lock.name,
        },
      });
    }
    if (lock.lowBattery && !before.lowBattery) {
      events.push({
        key: SCENE_TRIGGERS.LOW_BATTERY,
        data: { device: deviceId(LOCK_TYPE, lock), device_name: lock.name },
      });
    }
  }
  return events;
}

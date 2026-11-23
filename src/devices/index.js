// -----------------------------------------------------------------------------
// Device registry.
//
// Unlike a fixed set of devices, Alarm.com devices are discovered from the
// account: each module of this folder maps ONE kind of snapshot entry (see
// src/alarmcom/model.js) to a Gladys device, and exposes the same shape:
//   - type                          : external id namespace ('partition'...)
//   - entries(snapshot)             : the entries of that kind
//   - buildDevice(gladys, entry)    : the discovery payload. Every feature
//     carries `name`, `min`, `max`, `read_only` and `has_feedback`
//   - states(gladys, entry)         : the states to publish
//   - setValue({ client, entry, featureKey, value, config }) (optional)
//
// External ids are `ext:<selector>:<type>:<alarm.com id>`, the Alarm.com id
// being the stable id of the device on the account: never a label.
// -----------------------------------------------------------------------------

import { partition } from './partition.js';
import { sensor } from './sensor.js';
import { lock } from './lock.js';
import { garageDoor } from './garageDoor.js';
import { light } from './light.js';
import { thermostat } from './thermostat.js';

export const DEVICE_TYPES = [partition, sensor, lock, garageDoor, light, thermostat];

/** Discovery payload: every device of the snapshot. */
export function buildDiscoveredDevices(gladys, snapshot) {
  return DEVICE_TYPES.flatMap((deviceType) =>
    deviceType.entries(snapshot).map((entry) => deviceType.buildDevice(gladys, entry)),
  );
}

/** Every state of the snapshot, as `publishStates` entries. */
export function collectStates(gladys, snapshot) {
  return DEVICE_TYPES.flatMap((deviceType) =>
    deviceType.entries(snapshot).flatMap((entry) => deviceType.states(gladys, entry)),
  );
}

/**
 * Find the snapshot entry of a device external id.
 * @returns {{ deviceType: object, entry: object } | undefined}
 */
export function resolveDevice(gladys, snapshot, externalId) {
  for (const deviceType of DEVICE_TYPES) {
    for (const entry of deviceType.entries(snapshot)) {
      if (gladys.externalIds(deviceType.type, entry.id).device === externalId) {
        return { deviceType, entry };
      }
    }
  }
  return undefined;
}

/** Feature key of a feature external id (`<device external id>:<key>`). */
export function featureKeyOf(device, feature) {
  const prefix = `${device.external_id}:`;
  return feature.external_id.startsWith(prefix)
    ? feature.external_id.slice(prefix.length)
    : feature.external_id;
}

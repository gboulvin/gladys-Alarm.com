// -----------------------------------------------------------------------------
// Commands sent to Alarm.com. Each function takes the client and a snapshot
// entry (see model.js) and posts the command the web application would post.
// -----------------------------------------------------------------------------

import { ApiError } from './errors.js';
import { ARMING_OPTIONS, ENDPOINTS } from './constants.js';

// Arming modes the integration exposes. Keys are stored by Gladys (select
// options, scene fields, widget buttons): never rename one.
export const ARM_MODES = ['armed_stay', 'armed_away', 'armed_night'];
export const PARTITION_MODES = ['disarmed', ...ARM_MODES];

/**
 * Arm a partition.
 * @param {import('./client.js').AlarmComClient} client
 * @param {object} partition - Snapshot entry (model.toPartition).
 * @param {string} mode - 'armed_stay' | 'armed_away' | 'armed_night'.
 * @param {object} [options]
 * @param {boolean} [options.forceBypass] - Bypass the open sensors.
 * @param {boolean} [options.noEntryDelay] - Arm without entry delay.
 * @param {boolean} [options.silentArming] - No beeps on the keypad.
 */
export async function armPartition(client, partition, mode, options = {}) {
  if (!ARM_MODES.includes(mode)) {
    throw new ApiError(`Unknown arming mode "${mode}"`);
  }
  if (mode === 'armed_night' && !partition.supportsNight) {
    throw new ApiError(`Partition "${partition.name}" does not support night arming`);
  }
  // Night arming is "arm stay" with the night option, like in the web app.
  const command = mode === 'armed_away' ? 'armAway' : 'armStay';
  const supported = partition.armingOptions?.[mode] ?? [];
  const body = {};
  if (options.forceBypass && supported.includes(ARMING_OPTIONS.BYPASS_SENSORS)) {
    body.forceBypass = true;
  }
  if (options.noEntryDelay && supported.includes(ARMING_OPTIONS.NO_ENTRY_DELAY)) {
    body.noEntryDelay = true;
  }
  if (options.silentArming && supported.includes(ARMING_OPTIONS.SILENT_ARMING)) {
    body.silentArming = true;
  }
  if (mode === 'armed_night') {
    body.nightArming = true;
  }
  try {
    await client.command(ENDPOINTS.PARTITION(partition.id), command, body);
  } catch (err) {
    // Alarm.com answers 422 to a bypass request when nothing is open: retry
    // without it, like its own web application does.
    if (err instanceof ApiError && err.status === 422 && body.forceBypass) {
      delete body.forceBypass;
      await client.command(ENDPOINTS.PARTITION(partition.id), command, body);
      return;
    }
    throw err;
  }
}

export async function disarmPartition(client, partition) {
  await client.command(ENDPOINTS.PARTITION(partition.id), 'disarm');
}

/** Arm or disarm, from a partition mode ('disarmed' included). */
export async function setPartitionMode(client, partition, mode, options) {
  if (mode === 'disarmed') {
    return disarmPartition(client, partition);
  }
  return armPartition(client, partition, mode, options);
}

export async function setLock(client, lock, locked) {
  await client.command(ENDPOINTS.LOCK(lock.id), locked ? 'lock' : 'unlock');
}

export async function setGarageDoor(client, door, open) {
  await client.command(ENDPOINTS.GARAGE_DOOR(door.id), open ? 'open' : 'close');
}

export async function setLight(client, light, on, brightness) {
  const body = {};
  if (on && light.isDimmer && Number.isFinite(brightness) && brightness > 0) {
    body.dimmerLevel = Math.round(brightness);
  }
  await client.command(ENDPOINTS.LIGHT(light.id), on ? 'turnOn' : 'turnOff', body);
}

/**
 * Change the setpoint the thermostat currently works with: the cooling one in
 * cooling mode, the heating one otherwise.
 */
export async function setThermostatSetpoint(client, thermostat, setpoint, isCooling) {
  const body = isCooling ? { desiredCoolSetpoint: setpoint } : { desiredHeatSetpoint: setpoint };
  await client.command(ENDPOINTS.THERMOSTAT(thermostat.id), 'setState', body);
}

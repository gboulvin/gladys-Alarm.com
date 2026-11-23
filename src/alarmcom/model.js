// -----------------------------------------------------------------------------
// From the Alarm.com device catalog (raw JSON:API resources) to a plain
// snapshot the rest of the integration works with. Keeping the raw shapes in
// this single file means a change on the Alarm.com side is fixed here only.
// -----------------------------------------------------------------------------

import {
  ARMING_OPTIONS,
  GARAGE_DOOR_STATES,
  LIGHT_STATES,
  LOCK_STATES,
  PARTITION_STATES,
  RESOURCE_TYPES,
  SENSOR_DEVICE_TYPES,
  SENSOR_STATES,
} from './constants.js';

// What a sensor detects, as presented in Gladys. Keys are stored by the scenes
// (filter of the `sensor_triggered` trigger): never rename one.
export const SENSOR_KINDS = {
  OPENING: 'opening',
  MOTION: 'motion',
  LEAK: 'leak',
  SMOKE: 'smoke',
  CO: 'co',
  GLASS_BREAK: 'glass_break',
};

// Sensor types with no state worth showing (a panic button, the user's phone).
const IGNORED_SENSOR_TYPES = new Set([
  SENSOR_DEVICE_TYPES.PANIC_BUTTON,
  SENSOR_DEVICE_TYPES.FIXED_PANIC,
  SENSOR_DEVICE_TYPES.SIREN,
  SENSOR_DEVICE_TYPES.MOBILE_PHONE,
  SENSOR_DEVICE_TYPES.PANEL_IMAGE_SENSOR,
]);

const toNumber = (value) => (value === null || value === undefined ? NaN : Number(value));
const finiteOrNull = (value) => (Number.isFinite(toNumber(value)) ? toNumber(value) : null);

function common(resource) {
  const attributes = resource.attributes ?? {};
  return {
    id: String(resource.id),
    name: String(attributes.description || attributes.name || resource.id),
    lowBattery: attributes.lowBattery === true || attributes.criticalBattery === true,
    malfunction: attributes.isMalfunctioning === true,
    canControl: attributes.hasPermissionToChangeState !== false,
  };
}

function armingOptions(attributes, mode) {
  const list = attributes.extendedArmingOptions?.[mode];
  return Array.isArray(list) ? list.map(Number) : [];
}

export function toPartition(resource) {
  const attributes = resource.attributes ?? {};
  const options = {
    armed_stay: armingOptions(attributes, 'ArmedStay'),
    armed_away: armingOptions(attributes, 'ArmedAway'),
    armed_night: armingOptions(attributes, 'ArmedNight'),
  };
  return {
    ...common(resource),
    state: PARTITION_STATES[attributes.state] ?? 'unknown',
    desiredState: PARTITION_STATES[attributes.desiredState] ?? null,
    supportsNight: options.armed_night.includes(ARMING_OPTIONS.NIGHT_ARMING),
    armingOptions: options,
    needsClearIssues: attributes.needsClearIssuesPrompt === true,
  };
}

/**
 * What a sensor detects: from its `deviceType` when known, from the shape of
 * its state otherwise (open/closed, idle/active, dry/wet). `null` when the
 * integration has nothing meaningful to show for it.
 */
export function sensorKind(deviceType, state, isWaterSensor = false) {
  if (isWaterSensor || state === SENSOR_STATES.DRY || state === SENSOR_STATES.WET) {
    return SENSOR_KINDS.LEAK;
  }
  if (IGNORED_SENSOR_TYPES.has(deviceType)) {
    return null;
  }
  switch (deviceType) {
    case SENSOR_DEVICE_TYPES.CONTACT:
    case SENSOR_DEVICE_TYPES.CONTACT_SHOCK:
      return SENSOR_KINDS.OPENING;
    case SENSOR_DEVICE_TYPES.MOTION:
    case SENSOR_DEVICE_TYPES.PANEL_MOTION:
      return SENSOR_KINDS.MOTION;
    case SENSOR_DEVICE_TYPES.SMOKE:
      return SENSOR_KINDS.SMOKE;
    case SENSOR_DEVICE_TYPES.CO:
      return SENSOR_KINDS.CO;
    case SENSOR_DEVICE_TYPES.GLASS_BREAK:
    case SENSOR_DEVICE_TYPES.PANEL_GLASS_BREAK:
      return SENSOR_KINDS.GLASS_BREAK;
    default:
      break;
  }
  if (state === SENSOR_STATES.CLOSED || state === SENSOR_STATES.OPEN) {
    return SENSOR_KINDS.OPENING;
  }
  if (state === SENSOR_STATES.IDLE || state === SENSOR_STATES.ACTIVE) {
    return SENSOR_KINDS.MOTION;
  }
  return null;
}

export function toSensor(resource) {
  const attributes = resource.attributes ?? {};
  const state = toNumber(attributes.state);
  const isWater = resource.type === RESOURCE_TYPES.WATER_SENSOR;
  const kind = sensorKind(toNumber(attributes.deviceType), state, isWater);
  if (!kind) {
    return null;
  }
  return {
    ...common(resource),
    kind,
    // "Triggered": open, motion, wet, smoke... The one boolean every kind shares.
    active:
      state === SENSOR_STATES.OPEN || state === SENSOR_STATES.ACTIVE || state === SENSOR_STATES.WET,
    known: Object.values(SENSOR_STATES).includes(state),
  };
}

export function toLock(resource) {
  const state = toNumber(resource.attributes?.state);
  return {
    ...common(resource),
    locked: state === LOCK_STATES.LOCKED ? true : state === LOCK_STATES.UNLOCKED ? false : null,
  };
}

export function toGarageDoor(resource) {
  const state = toNumber(resource.attributes?.state);
  return {
    ...common(resource),
    open:
      state === GARAGE_DOOR_STATES.OPEN ? true : state === GARAGE_DOOR_STATES.CLOSED ? false : null,
  };
}

export function toLight(resource) {
  const attributes = resource.attributes ?? {};
  const state = toNumber(attributes.state);
  const isDimmer = attributes.isDimmer === true;
  return {
    ...common(resource),
    on:
      state === LIGHT_STATES.ON || state === LIGHT_STATES.LEVEL_CHANGE
        ? true
        : state === LIGHT_STATES.OFF
          ? false
          : null,
    isDimmer,
    brightness: isDimmer ? finiteOrNull(attributes.lightLevel) : null,
  };
}

export function toThermostat(resource, usesCelsius) {
  const attributes = resource.attributes ?? {};
  return {
    ...common(resource),
    usesCelsius,
    state: toNumber(attributes.state),
    ambientTemperature: finiteOrNull(attributes.ambientTemp),
    heatSetpoint: finiteOrNull(attributes.heatSetpoint),
    coolSetpoint: finiteOrNull(attributes.coolSetpoint),
    minSetpoint: finiteOrNull(attributes.minHeatSetpoint ?? attributes.minCoolSetpoint),
    maxSetpoint: finiteOrNull(attributes.maxCoolSetpoint ?? attributes.maxHeatSetpoint),
    supportsSetpoints: attributes.supportsSetpoints !== false,
    supportsHumidity: attributes.supportsHumidity === true,
    humidity: finiteOrNull(attributes.humidityLevel),
  };
}

/**
 * Build the snapshot of the whole system from the catalog resources.
 * @param {Array} resources - JSON:API resources of the device catalog.
 * @param {object} [context]
 * @param {boolean} [context.usesCelsius] - Temperature unit of the account.
 * @param {string} [context.systemId]
 */
export function buildSnapshot(resources, { usesCelsius = false, systemId = null } = {}) {
  const ofType = (...types) => resources.filter((resource) => types.includes(resource.type));
  return {
    systemId,
    fetchedAt: new Date().toISOString(),
    partitions: ofType(RESOURCE_TYPES.PARTITION).map(toPartition),
    sensors: ofType(RESOURCE_TYPES.SENSOR, RESOURCE_TYPES.WATER_SENSOR)
      .map(toSensor)
      .filter(Boolean),
    locks: ofType(RESOURCE_TYPES.LOCK).map(toLock),
    garageDoors: ofType(RESOURCE_TYPES.GARAGE_DOOR).map(toGarageDoor),
    lights: ofType(RESOURCE_TYPES.LIGHT).map(toLight),
    thermostats: ofType(RESOURCE_TYPES.THERMOSTAT).map((resource) =>
      toThermostat(resource, usesCelsius),
    ),
  };
}

/** An empty snapshot (before the first successful refresh). */
export function emptySnapshot() {
  return buildSnapshot([]);
}

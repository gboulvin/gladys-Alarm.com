// -----------------------------------------------------------------------------
// Device type: THERMOSTAT. The ambient temperature, the humidity when the
// thermostat measures it, and the setpoint it works with: the cooling one in
// cooling mode, the heating one otherwise. Temperatures are in the unit of
// the Alarm.com account (Celsius or Fahrenheit).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { setThermostatSetpoint } from '../alarmcom/commands.js';
import { THERMOSTAT_STATES } from '../alarmcom/constants.js';

export const THERMOSTAT_TYPE = 'thermostat';
export const THERMOSTAT_FEATURES = {
  TEMPERATURE: 'temperature',
  TARGET_TEMPERATURE: 'target-temperature',
  HUMIDITY: 'humidity',
};

// Setpoint bounds when the thermostat does not report its own.
const DEFAULT_BOUNDS = { celsius: [7, 35], fahrenheit: [45, 95] };

const isCooling = (entry) => entry.state === THERMOSTAT_STATES.COOL;

export function currentSetpoint(entry) {
  return isCooling(entry) ? entry.coolSetpoint : entry.heatSetpoint;
}

function unitOf(entry) {
  return entry.usesCelsius ? DEVICE_FEATURE_UNITS.CELSIUS : DEVICE_FEATURE_UNITS.FAHRENHEIT;
}

export const thermostat = {
  type: THERMOSTAT_TYPE,

  entries: (snapshot) => snapshot.thermostats,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(THERMOSTAT_TYPE, entry.id);
    const unit = unitOf(entry);
    const [defaultMin, defaultMax] = DEFAULT_BOUNDS[unit];
    const features = [
      {
        name: 'Temperature',
        external_id: ids.feature(THERMOSTAT_FEATURES.TEMPERATURE),
        category: DEVICE_FEATURE_CATEGORIES.TEMPERATURE_SENSOR,
        type: DEVICE_FEATURE_TYPES.SENSOR.DECIMAL,
        unit,
        min: entry.usesCelsius ? -20 : -4,
        max: entry.usesCelsius ? 50 : 122,
        read_only: true,
        has_feedback: false,
        keep_history: true,
      },
    ];
    if (entry.supportsSetpoints) {
      features.push({
        name: 'Setpoint',
        external_id: ids.feature(THERMOSTAT_FEATURES.TARGET_TEMPERATURE),
        category: DEVICE_FEATURE_CATEGORIES.THERMOSTAT,
        type: DEVICE_FEATURE_TYPES.THERMOSTAT.TARGET_TEMPERATURE,
        unit,
        min: entry.minSetpoint ?? defaultMin,
        max: entry.maxSetpoint ?? defaultMax,
        read_only: !entry.canControl,
        has_feedback: true,
        keep_history: true,
      });
    }
    if (entry.supportsHumidity) {
      features.push({
        name: 'Humidity',
        external_id: ids.feature(THERMOSTAT_FEATURES.HUMIDITY),
        category: DEVICE_FEATURE_CATEGORIES.HUMIDITY_SENSOR,
        type: DEVICE_FEATURE_TYPES.SENSOR.DECIMAL,
        unit: DEVICE_FEATURE_UNITS.PERCENT,
        min: 0,
        max: 100,
        read_only: true,
        has_feedback: false,
        keep_history: true,
      });
    }
    return {
      name: entry.name,
      external_id: ids.device,
      model: 'Alarm.com thermostat',
      should_poll: false,
      features,
    };
  },

  states(gladys, entry) {
    const ids = gladys.externalIds(THERMOSTAT_TYPE, entry.id);
    const states = [];
    if (entry.ambientTemperature !== null) {
      states.push({
        device_feature_external_id: ids.feature(THERMOSTAT_FEATURES.TEMPERATURE),
        state: entry.ambientTemperature,
      });
    }
    const setpoint = currentSetpoint(entry);
    if (entry.supportsSetpoints && setpoint !== null) {
      states.push({
        device_feature_external_id: ids.feature(THERMOSTAT_FEATURES.TARGET_TEMPERATURE),
        state: setpoint,
      });
    }
    if (entry.supportsHumidity && entry.humidity !== null) {
      states.push({
        device_feature_external_id: ids.feature(THERMOSTAT_FEATURES.HUMIDITY),
        state: entry.humidity,
      });
    }
    return states;
  },

  async setValue({ client, entry, featureKey, value }) {
    if (featureKey !== THERMOSTAT_FEATURES.TARGET_TEMPERATURE) {
      throw new Error(`Feature ${featureKey} of ${entry.name} is read-only`);
    }
    const setpoint = Number(value);
    if (!Number.isFinite(setpoint)) {
      throw new Error(`Invalid setpoint ${value}`);
    }
    await setThermostatSetpoint(client, entry, setpoint, isCooling(entry));
  },
};

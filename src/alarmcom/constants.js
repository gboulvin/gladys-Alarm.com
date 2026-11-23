// -----------------------------------------------------------------------------
// Alarm.com web API constants.
//
// Alarm.com has no public API for end users: the integration talks to the
// JSON:API endpoints its own web application (www.alarm.com) uses, the same
// ones the community libraries (pyalarmdotcomajax, Home Assistant) rely on.
// The numeric enums mirror the web application's own enum files
// (customer-ember/enums/*.js).
// -----------------------------------------------------------------------------

export const BASE_URL = 'https://www.alarm.com/';
export const LOGIN_URL = 'https://www.alarm.com/login';
export const LOGIN_POST_URL = 'https://www.alarm.com/web/Default.aspx';

export const LOGIN_FIELDS = {
  USERNAME: 'ctl00$ContentPlaceHolder1$loginform$txtUserName',
  PASSWORD: 'txtPassword',
};

// Hidden ASP.NET fields of the login form, posted back as-is.
export const LOGIN_HIDDEN_FIELDS = [
  '__VIEWSTATE',
  '__VIEWSTATEGENERATOR',
  '__EVENTVALIDATION',
  '__PREVIOUSPAGE',
];

// The cookie Alarm.com sets once a device is "trusted" after a two-factor
// login: sent back on the next logins, it skips the one-time code.
export const TWO_FACTOR_COOKIE = 'twoFactorAuthenticationId';
// Anti-forgery cookie, echoed in the `ajaxrequestuniquekey` header.
export const ANTI_FORGERY_COOKIE = 'afg';

export const ENDPOINTS = {
  IDENTITIES: 'web/api/identities',
  SYSTEMS: 'web/api/systems/availableSystemItems?searchString=',
  DEVICE_CATALOG: (systemId) => `web/api/settings/manageDevices/deviceCatalogs/${systemId}`,
  TWO_FACTOR: (userId) =>
    `web/api/engines/twoFactorAuthentication/twoFactorAuthentications/${userId}`,
  PARTITION: (id) => `web/api/devices/partitions/${id}`,
  LOCK: (id) => `web/api/devices/locks/${id}`,
  GARAGE_DOOR: (id) => `web/api/devices/garageDoors/${id}`,
  LIGHT: (id) => `web/api/devices/lights/${id}`,
  THERMOSTAT: (id) => `web/api/devices/thermostats/${id}`,
};

// JSON:API `type` of each resource of the device catalog.
export const RESOURCE_TYPES = {
  PARTITION: 'devices/partition',
  SENSOR: 'devices/sensor',
  WATER_SENSOR: 'devices/water-sensor',
  LOCK: 'devices/lock',
  GARAGE_DOOR: 'devices/garage-door',
  LIGHT: 'devices/light',
  THERMOSTAT: 'devices/thermostat',
};

// Two-factor channels: a bitmask in `enabledTwoFactorTypes`, the single value
// in `typeOf2FA` when a code is verified.
export const OTP_TYPES = { app: 1, sms: 2, email: 4 };

// ArmingState.js
export const PARTITION_STATES = {
  0: 'unknown',
  1: 'disarmed',
  2: 'armed_stay',
  3: 'armed_away',
  4: 'armed_night',
};

// ArmingOption.js: the extended options a partition accepts per arming mode.
export const ARMING_OPTIONS = {
  BYPASS_SENSORS: 0,
  NO_ENTRY_DELAY: 1,
  SILENT_ARMING: 2,
  NIGHT_ARMING: 3,
};

// SensorStatus.js
export const SENSOR_STATES = {
  CLOSED: 1,
  OPEN: 2,
  IDLE: 3,
  ACTIVE: 4,
  DRY: 5,
  WET: 6,
};

// Sensor `deviceType` codes the integration knows how to present.
export const SENSOR_DEVICE_TYPES = {
  CONTACT: 1,
  MOTION: 2,
  SMOKE: 5,
  CO: 6,
  FREEZE: 8,
  PANIC_BUTTON: 9,
  FIXED_PANIC: 10,
  SIREN: 14,
  GLASS_BREAK: 19,
  CONTACT_SHOCK: 52,
  PANEL_IMAGE_SENSOR: 68,
  MOBILE_PHONE: 69,
  PANEL_GLASS_BREAK: 83,
  PANEL_MOTION: 89,
};

// LockStatus.js
export const LOCK_STATES = { LOCKED: 1, UNLOCKED: 2 };

// GarageDoorStatus.js
export const GARAGE_DOOR_STATES = { OPEN: 1, CLOSED: 2 };

// LightStatus.js
export const LIGHT_STATES = { OFFLINE: 0, NO_STATE: 1, ON: 2, OFF: 3, LEVEL_CHANGE: 4 };

// ThermostatStatus.js
export const THERMOSTAT_STATES = { OFF: 1, HEAT: 2, COOL: 3, AUTO: 4, AUX_HEAT: 5 };

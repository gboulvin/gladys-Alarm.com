// -----------------------------------------------------------------------------
// The Alarm.com controller: owns the web session, polls the account, keeps
// the latest snapshot, publishes devices, states and scene events to Gladys,
// and runs the commands coming from Gladys (devices, scenes, widgets).
//
// index.js only wires the SDK handlers to this object.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { AlarmComClient } from './alarmcom/client.js';
import { buildSnapshot } from './alarmcom/model.js';
import { armPartition, disarmPartition, ARM_MODES } from './alarmcom/commands.js';
import {
  AuthenticationError,
  OtpRequiredError,
  TwoFactorSetupRequiredError,
} from './alarmcom/errors.js';
import { TWO_FACTOR_COOKIE_KEY } from './config.js';
import {
  buildDiscoveredDevices,
  collectStates,
  featureKeyOf,
  resolveDevice,
} from './devices/index.js';
import { PARTITION_TYPE } from './devices/partition.js';
import { diffEvents } from './events.js';
import { t } from './i18n.js';

const logger = createLogger({ name: 'controller' });

const MAX_STATES_PER_REQUEST = 100;
// Alarm.com applies a command within seconds (an arming with exit delay takes
// longer): read the account again shortly after, then once more.
const REFRESH_AFTER_COMMAND_MS = [3_000, 15_000];

export const CONNECTION = {
  NOT_CONFIGURED: 'not_configured',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  OTP_REQUIRED: 'otp_required',
  ERROR: 'error',
};

const stateKey = (state) => JSON.stringify(state.text ?? state.state);

export class AlarmComController {
  /**
   * @param {object} gladys - The SDK instance (or the fake one in the tests).
   * @param {object} [options]
   * @param {Function} [options.createClient] - Client factory (tests inject a fake).
   * @param {Function} [options.onContentChanged] - Called when what the widgets show changed.
   */
  constructor(gladys, { createClient, onContentChanged } = {}) {
    this.gladys = gladys;
    this.createClient = createClient ?? ((options) => new AlarmComClient(options));
    this.onContentChanged = onContentChanged ?? (() => {});
    this.config = undefined;
    this.client = undefined;
    this.snapshot = undefined;
    this.connection = CONNECTION.NOT_CONFIGURED;
    this.otpMethods = [];
    this.publishedStates = new Map();
    this.devicesSignature = undefined;
    this.pollTimer = undefined;
    this.commandTimers = new Set();
    this.refreshing = undefined;
  }

  // --- Lifecycle -----------------------------------------------------------------

  /** (Re)start with a configuration: new session, first read, polling. */
  async start(config) {
    this.stop();
    this.config = config;
    this.snapshot = undefined;
    this.publishedStates.clear();
    this.devicesSignature = undefined;
    if (!config.username || !config.password) {
      this.client = undefined;
      await this.setConnection(CONNECTION.NOT_CONFIGURED);
      return;
    }
    this.client = this.createClient({
      username: config.username,
      password: config.password,
      twoFactorCookie: config[TWO_FACTOR_COOKIE_KEY] || undefined,
    });
    await this.connect();
    this.schedulePoll();
  }

  /** Apply a configuration change that keeps the same account. */
  updateConfig(config) {
    const pollChanged = config.poll_frequency !== this.config?.poll_frequency;
    this.config = config;
    if (pollChanged && this.client) {
      this.schedulePoll();
    }
    this.onContentChanged();
  }

  stop() {
    clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
    for (const timer of this.commandTimers) {
      clearTimeout(timer);
    }
    this.commandTimers.clear();
  }

  /** Log in and read the account; report the outcome as the connection status. */
  async connect() {
    if (!this.client) {
      return false;
    }
    try {
      await this.setConnection(CONNECTION.CONNECTING);
      await this.client.login();
      await this.refresh({ publishDevices: true });
      await this.setConnection(CONNECTION.CONNECTED);
      return true;
    } catch (err) {
      await this.handleError(err);
      return false;
    }
  }

  schedulePoll() {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      this.poll().finally(() => {
        if (this.client) {
          this.schedulePoll();
        }
      });
    }, this.config.poll_frequency * 1000);
    this.pollTimer.unref?.();
  }

  async poll() {
    // Waiting for the user's one-time code: polling would only fail again.
    if (!this.client || this.connection === CONNECTION.OTP_REQUIRED) {
      return;
    }
    if (this.connection !== CONNECTION.CONNECTED) {
      await this.connect();
      return;
    }
    try {
      await this.refresh();
    } catch (err) {
      await this.handleError(err);
    }
  }

  async handleError(err) {
    if (err instanceof OtpRequiredError) {
      this.otpMethods = err.methods;
      logger.warn(`Alarm.com asks for a two-factor code (${err.methods.join(', ')})`);
      await this.setConnection(CONNECTION.OTP_REQUIRED);
      return;
    }
    logger.error(`Alarm.com error: ${err.message}`);
    await this.setConnection(CONNECTION.ERROR, err);
  }

  async setConnection(connection, err) {
    const changed = connection !== this.connection;
    this.connection = connection;
    this.lastError = err;
    if (changed) {
      this.onContentChanged();
    }
    // `connecting` is transient: the Configuration screen keeps the last outcome.
    if (connection === CONNECTION.CONNECTING) {
      return;
    }
    await this.gladys
      .setConnectionStatus(connection === CONNECTION.CONNECTED, this.statusMessage(connection, err))
      .catch((statusErr) => logger.error('setConnectionStatus failed', statusErr));
  }

  statusMessage(connection, err = this.lastError) {
    switch (connection) {
      case CONNECTION.CONNECTED:
        return undefined;
      case CONNECTION.NOT_CONFIGURED:
        return t('status_not_configured');
      case CONNECTION.OTP_REQUIRED:
        return t('status_otp_required', { methods: this.otpMethods.join(', ') });
      default:
        if (err instanceof AuthenticationError) {
          return t('status_bad_credentials');
        }
        if (err instanceof TwoFactorSetupRequiredError) {
          return t('status_setup_2fa');
        }
        return t('status_unreachable');
    }
  }

  get connected() {
    return this.connection === CONNECTION.CONNECTED;
  }

  // --- Reading -------------------------------------------------------------------

  /** Read the account once. Concurrent callers share the same read. */
  refresh(options) {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh(options).finally(() => {
        this.refreshing = undefined;
      });
    }
    return this.refreshing;
  }

  async doRefresh({ publishDevices = false } = {}) {
    if (!this.client) {
      throw new AuthenticationError('Alarm.com is not configured');
    }
    const { systemId, resources } = await this.client.getDeviceResources();
    const next = buildSnapshot(resources, { usesCelsius: this.client.usesCelsius, systemId });
    const previous = this.snapshot;
    this.snapshot = next;
    let changed = !previous;

    // Devices: published again when the list or their shape changed.
    const devices = buildDiscoveredDevices(this.gladys, next);
    const signature = JSON.stringify(devices);
    if (publishDevices || signature !== this.devicesSignature) {
      await this.gladys.publishDiscoveredDevices(devices);
      this.devicesSignature = signature;
      changed = true;
    }

    // States: only the ones that changed since the last publication.
    const states = collectStates(this.gladys, next).filter(
      (state) => this.publishedStates.get(state.device_feature_external_id) !== stateKey(state),
    );
    for (let i = 0; i < states.length; i += MAX_STATES_PER_REQUEST) {
      await this.gladys.publishStates(states.slice(i, i + MAX_STATES_PER_REQUEST));
    }
    for (const state of states) {
      this.publishedStates.set(state.device_feature_external_id, stateKey(state));
    }
    changed = changed || states.length > 0;

    // Scene events: one per transition.
    for (const { key, data } of diffEvents(this.gladys, previous, next)) {
      await this.gladys
        .publishSceneEvent(key, data)
        .catch((err) => logger.error(`publishSceneEvent ${key} failed`, err));
    }

    if (changed) {
      this.onContentChanged();
    }
    return next;
  }

  /** Read the account again shortly after a command, to confirm its effect. */
  scheduleRefreshAfterCommand() {
    for (const delay of REFRESH_AFTER_COMMAND_MS) {
      const timer = setTimeout(() => {
        this.commandTimers.delete(timer);
        this.refresh().catch((err) => logger.warn(`Refresh after command failed: ${err.message}`));
      }, delay);
      timer.unref?.();
      this.commandTimers.add(timer);
    }
  }

  async ensureSnapshot() {
    if (!this.client) {
      throw new AuthenticationError('Alarm.com is not configured');
    }
    if (!this.snapshot) {
      await this.refresh();
    }
    return this.snapshot;
  }

  // --- Commands ------------------------------------------------------------------

  /** A Gladys device command (onSetValue). */
  async setValue(device, feature, value) {
    const snapshot = await this.ensureSnapshot();
    const resolved = resolveDevice(this.gladys, snapshot, device.external_id);
    if (!resolved || typeof resolved.deviceType.setValue !== 'function') {
      throw new Error(`No Alarm.com device for ${device.external_id}`);
    }
    await resolved.deviceType.setValue({
      client: this.client,
      entry: resolved.entry,
      featureKey: featureKeyOf(device, feature),
      value,
      config: this.config,
    });
    this.scheduleRefreshAfterCommand();
  }

  /**
   * The partitions a command targets: the one of `deviceExternalId`, or every
   * partition when it is empty.
   */
  async targetPartitions(deviceExternalId) {
    const snapshot = await this.ensureSnapshot();
    if (!deviceExternalId) {
      if (snapshot.partitions.length === 0) {
        throw new Error('No Alarm.com partition found');
      }
      return snapshot.partitions;
    }
    const resolved = resolveDevice(this.gladys, snapshot, deviceExternalId);
    if (!resolved || resolved.deviceType.type !== PARTITION_TYPE) {
      throw new Error(`${deviceExternalId} is not an Alarm.com partition`);
    }
    return [resolved.entry];
  }

  /** Arm one partition, or all of them. */
  async arm(deviceExternalId, mode, options = this.config.armingOptions) {
    if (!ARM_MODES.includes(mode)) {
      throw new Error(`Unknown arming mode "${mode}"`);
    }
    const partitions = await this.targetPartitions(deviceExternalId);
    for (const partition of partitions) {
      await armPartition(this.client, partition, mode, options);
    }
    this.scheduleRefreshAfterCommand();
    return partitions;
  }

  /** Disarm one partition, or all of them. */
  async disarm(deviceExternalId) {
    const partitions = await this.targetPartitions(deviceExternalId);
    for (const partition of partitions) {
      await disarmPartition(this.client, partition);
    }
    this.scheduleRefreshAfterCommand();
    return partitions;
  }

  // --- Two-factor authentication ---------------------------------------------------

  /** Ask Alarm.com to send a code by SMS or email. */
  async requestOtp(method) {
    if (!this.client) {
      throw new AuthenticationError('Alarm.com is not configured');
    }
    if (!this.client.userId) {
      // The code belongs to a login attempt: start one if none is pending.
      await this.client.login().catch((err) => {
        if (!(err instanceof OtpRequiredError)) {
          throw err;
        }
      });
    }
    await this.client.requestOtp(method);
  }

  /** Verify the code, remember Gladys as a trusted device, and start reading. */
  async verifyOtp(code, method) {
    if (!this.client) {
      throw new AuthenticationError('Alarm.com is not configured');
    }
    if (!this.client.userId) {
      await this.client.login().catch((err) => {
        if (!(err instanceof OtpRequiredError)) {
          throw err;
        }
      });
    }
    const cookie = await this.client.submitOtp(code, method);
    if (cookie) {
      this.config[TWO_FACTOR_COOKIE_KEY] = cookie;
      await this.gladys.setConfig({ [TWO_FACTOR_COOKIE_KEY]: cookie });
    }
    this.otpMethods = [];
    await this.refresh({ publishDevices: true });
    await this.setConnection(CONNECTION.CONNECTED);
  }

  /** Log in again and read everything (the "Test the connection" action). */
  async testConnection() {
    if (!this.client) {
      throw new AuthenticationError('Enter your Alarm.com username and password first');
    }
    this.client.loggedIn = false;
    const ok = await this.connect();
    if (!ok) {
      return this.statusMessage(this.connection);
    }
    const snapshot = this.snapshot;
    return t('action_connected', {
      provider: this.client.providerName,
      partitions: snapshot.partitions.length,
      sensors: snapshot.sensors.length,
      others:
        snapshot.locks.length +
        snapshot.garageDoors.length +
        snapshot.lights.length +
        snapshot.thermostats.length,
    });
  }
}

// -----------------------------------------------------------------------------
// Entry point of the Alarm.com integration for Gladys Assistant.
//
// Role of this file: wire the SDK to the controller (src/controller.js). It
// holds no Alarm.com logic. It:
//   1. instantiates the SDK (connection, auth, reconnection: handled by it);
//   2. registers the event handlers BEFORE connect();
//   3. connects, then starts the controller with the user's configuration.
//
// Environment variables provided by the Gladys supervisor to the container
// (read by the SDK): GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN,
// GLADYS_INTEGRATION_SELECTOR.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { credentialsChanged, normalizeConfig } from './src/config.js';
import { AlarmComController } from './src/controller.js';
import { MANIFEST_ACTIONS } from './src/actions.js';
import { SCENE_ACTIONS } from './src/scenes.js';
import { WIDGETS, refreshWidgets } from './src/widgets.js';
import { t } from './src/i18n.js';

const gladys = new GladysIntegration();
const controller = new AlarmComController(gladys, {
  // Widgets show the arming state and the sensors: re-pull them on change.
  onContentChanged: () => refreshWidgets(gladys),
});

// --- Discovery: Gladys asks for the list of devices --------------------------
gladys.onScanRequest(async () => {
  logger.info('onScanRequest -> reading Alarm.com');
  await controller.refresh({ publishDevices: true });
});

// --- Command: the user acts on a controllable feature ------------------------
gladys.onSetValue(async (device, feature, value) => {
  logger.info(`onSetValue <- ${feature.external_id} = ${value}`);
  // Throwing acks the command as failed: the UI shows it.
  await controller.setValue(device, feature, value);
});

// --- Manifest actions: buttons of the Configuration screen -------------------
for (const [actionKey, handler] of Object.entries(MANIFEST_ACTIONS)) {
  gladys.onAction(actionKey, (fields) => handler(controller, { fields }));
}

// --- Scene actions ------------------------------------------------------------
// Scene TRIGGERS need no handler: the controller fires them on every change
// it reads (src/events.js).
for (const [actionKey, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(actionKey, (fields) => handler(controller, { fields }));
}

// --- Dashboard widgets --------------------------------------------------------
for (const [widgetKey, widget] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(widgetKey, (request) =>
    widget.get(controller, { ...request, config: controller.config }),
  );
  if (typeof widget.action === 'function') {
    gladys.onWidgetAction(widgetKey, (actionKey, params, { settings }) =>
      widget.action(controller, { actionKey, params, settings, config: controller.config }),
    );
  }
}

// --- Configuration updated by the user ---------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> new configuration received');
  const config = normalizeConfig(newConfig);
  // Saving the two-factor cookie (setConfig) also lands here: only a change of
  // account needs a new session.
  if (!controller.config || credentialsChanged(controller.config, config)) {
    await controller.start(config);
  } else {
    controller.updateConfig(config);
  }
});

// --- Connection lifecycle ----------------------------------------------------
gladys.on('connected', async () => {
  try {
    const config = normalizeConfig(await gladys.getConfig());
    if (!controller.client || credentialsChanged(controller.config, config)) {
      await controller.start(config);
    } else {
      // Reconnection to Gladys: the Alarm.com session is still there, just
      // re-publish everything (states sent while disconnected were lost).
      controller.updateConfig(config);
      await controller
        .refresh({ publishDevices: true })
        .catch((err) => controller.handleError(err));
      await controller.setConnection(controller.connection);
    }
    refreshWidgets(gladys);
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
    await gladys.setConnectionStatus(false, t('status_init_failed')).catch(() => {});
  }
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  controller.stop();
});

// --- Startup -----------------------------------------------------------------
logger.info('Starting the Alarm.com integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});

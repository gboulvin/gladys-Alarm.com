// -----------------------------------------------------------------------------
// Dashboard widgets (manifest `widgets`, Gladys 5.1+).
//
// The integration returns a DECLARATIVE content (`text`, `status`,
// `button`...) that the core renders with its own theme: no HTML, no CSS.
// Each entry of WIDGETS is keyed by the widget `key` and exposes:
//   - get(controller, { settings, config }): the content;
//   - action(controller, { actionKey, params, settings, config }) (optional):
//     a tapped button.
//
// Security: a dashboard can hang on a wall, and anyone in front of it can tap
// its buttons. Arming is always offered; disarming only when the user turned
// on "Allow disarming from the dashboard" in the configuration, and the
// handler checks it again (the content may be older than the setting).
// -----------------------------------------------------------------------------

import { createLogger, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { SENSOR_KINDS } from './alarmcom/model.js';
import { PARTITION_TYPE } from './devices/partition.js';
import { stateText, t } from './i18n.js';

const logger = createLogger({ name: 'widgets' });

// Widget keys, as declared in the manifest `widgets` field.
export const ALARM_PANEL_WIDGET = 'alarm_panel';
export const SENSORS_OVERVIEW_WIDGET = 'sensors_overview';

// Keys of the buttons of the alarm panel: one key per button (the core drops
// a duplicate key), the mode being implied by the key.
const PANEL_ACTIONS = {
  arm_away: 'armed_away',
  arm_stay: 'armed_stay',
  arm_night: 'armed_night',
};
const DISARM_ACTION = 'disarm';

const STATE_COLORS = {
  disarmed: WIDGET_COLORS.SUCCESS,
  armed_stay: WIDGET_COLORS.DANGER,
  armed_away: WIDGET_COLORS.DANGER,
  armed_night: WIDGET_COLORS.DANGER,
};

const SENSOR_ICONS = {
  [SENSOR_KINDS.OPENING]: 'square',
  [SENSOR_KINDS.MOTION]: 'activity',
  [SENSOR_KINDS.LEAK]: 'droplet',
  [SENSOR_KINDS.SMOKE]: 'wind',
  [SENSOR_KINDS.CO]: 'wind',
  [SENSOR_KINDS.GLASS_BREAK]: 'zap',
};

// Kinds whose detection is an emergency rather than an activity.
const HAZARD_KINDS = new Set([SENSOR_KINDS.LEAK, SENSOR_KINDS.SMOKE, SENSOR_KINDS.CO]);

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function partitionExternalId(controller, partition) {
  return controller.gladys.externalIds(PARTITION_TYPE, partition.id).device;
}

/** The partition of a widget instance: the chosen one, else the first. */
function selectPartition(controller, settings) {
  const partitions = controller.snapshot?.partitions ?? [];
  if (settings?.partition) {
    const chosen = partitions.find(
      (partition) => partitionExternalId(controller, partition) === settings.partition,
    );
    if (chosen) {
      return chosen;
    }
  }
  return partitions[0];
}

function stateRow(partition) {
  const pending =
    partition.desiredState &&
    partition.desiredState !== partition.state &&
    partition.desiredState !== 'unknown';
  return {
    label: t('widget_state'),
    icon: partition.state === 'disarmed' ? 'shield-off' : 'shield',
    value: pending
      ? t('state_arming', { state: stateText(partition.desiredState) })
      : stateText(partition.state),
    color: pending
      ? WIDGET_COLORS.WARNING
      : (STATE_COLORS[partition.state] ?? WIDGET_COLORS.NEUTRAL),
  };
}

function countRow(label, icon, count, alertColor) {
  return {
    label: t(label),
    icon,
    value: count,
    color: count > 0 ? alertColor : WIDGET_COLORS.SUCCESS,
  };
}

function sensorValue(sensor) {
  switch (sensor.kind) {
    case SENSOR_KINDS.OPENING:
      return t(sensor.active ? 'sensor_open' : 'sensor_closed');
    case SENSOR_KINDS.MOTION:
      return t(sensor.active ? 'sensor_motion' : 'sensor_idle');
    case SENSOR_KINDS.LEAK:
      return t(sensor.active ? 'sensor_wet' : 'sensor_dry');
    default:
      return t(sensor.active ? 'sensor_alarm' : 'sensor_ok');
  }
}

function sensorColor(sensor) {
  if (sensor.active) {
    return HAZARD_KINDS.has(sensor.kind) || sensor.kind === SENSOR_KINDS.GLASS_BREAK
      ? WIDGET_COLORS.DANGER
      : WIDGET_COLORS.WARNING;
  }
  return sensor.lowBattery || sensor.malfunction ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
}

/** Sensors most worth seeing first: active, then needing care, then by name. */
export function sortSensors(sensors) {
  const rank = (sensor) => (sensor.active ? 0 : sensor.lowBattery || sensor.malfunction ? 1 : 2);
  return [...sensors].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export const WIDGETS = {
  [ALARM_PANEL_WIDGET]: {
    async get(controller, { settings, config }) {
      logger.debug(`onWidgetGet <- ${ALARM_PANEL_WIDGET}`);
      const partition = selectPartition(controller, settings);
      if (!partition) {
        return {
          ttl_seconds: 60,
          components: [
            {
              type: 'text',
              variant: 'body',
              text: t(controller.connected ? 'widget_no_partition' : 'widget_disconnected'),
            },
          ],
        };
      }
      const snapshot = controller.snapshot;
      const items = [stateRow(partition)];
      if (!controller.connected) {
        items.push({
          label: t('widget_disconnected'),
          icon: 'cloud-off',
          value: '—',
          color: WIDGET_COLORS.DANGER,
        });
      }
      items.push(
        countRow(
          'widget_open_sensors',
          'alert-triangle',
          snapshot.sensors.filter((sensor) => sensor.active).length,
          WIDGET_COLORS.WARNING,
        ),
      );
      if (snapshot.locks.length > 0) {
        items.push(
          countRow(
            'widget_unlocked',
            'unlock',
            snapshot.locks.filter((lock) => lock.locked === false).length,
            WIDGET_COLORS.WARNING,
          ),
        );
      }
      items.push(
        countRow(
          'widget_low_battery',
          'battery',
          [...snapshot.sensors, ...snapshot.locks].filter((device) => device.lowBattery).length,
          WIDGET_COLORS.WARNING,
        ),
      );
      const malfunctions = [...snapshot.sensors, ...snapshot.locks, ...snapshot.partitions].filter(
        (device) => device.malfunction,
      ).length;
      if (malfunctions > 0) {
        items.push(countRow('widget_malfunctions', 'tool', malfunctions, WIDGET_COLORS.DANGER));
      }
      if (partition.needsClearIssues) {
        items.push({
          label: t('widget_issues'),
          icon: 'info',
          value: t('widget_yes'),
          color: WIDGET_COLORS.WARNING,
        });
      }

      const device = partitionExternalId(controller, partition);
      const buttons = [];
      if (partition.canControl) {
        buttons.push(
          {
            type: 'button',
            label: t('button_arm_away'),
            icon: 'log-out',
            style: 'primary',
            action: { key: 'arm_away', params: { device } },
          },
          {
            type: 'button',
            label: t('button_arm_stay'),
            icon: 'home',
            style: 'secondary',
            action: { key: 'arm_stay', params: { device } },
          },
        );
        if (partition.supportsNight) {
          buttons.push({
            type: 'button',
            label: t('button_arm_night'),
            icon: 'moon',
            style: 'secondary',
            action: { key: 'arm_night', params: { device } },
          });
        }
        if (config.allow_widget_disarm) {
          buttons.push({
            type: 'button',
            label: t('button_disarm'),
            icon: 'shield-off',
            style: 'danger',
            action: { key: DISARM_ACTION, params: { device }, confirm: true },
          });
        }
      }

      return {
        // The content changes with every Alarm.com read: index.js nudges the
        // widget then. The TTL is only a safety net.
        ttl_seconds: 60,
        components: [
          { type: 'text', variant: 'heading', text: truncate(partition.name, 40) },
          { type: 'status', items: items.slice(0, 10) },
          ...buttons,
        ],
      };
    },

    // `params` come from the content above, never from user input.
    async action(controller, { actionKey, params, config }) {
      logger.info(`onWidgetAction <- ${ALARM_PANEL_WIDGET}.${actionKey}`);
      if (actionKey === DISARM_ACTION) {
        if (!config.allow_widget_disarm) {
          throw new Error(t('toast_disarm_forbidden').en);
        }
        await controller.disarm(params.device);
        return t('toast_arming', { state: stateText('disarmed') });
      }
      const mode = PANEL_ACTIONS[actionKey];
      if (!mode) {
        throw new Error(`Unknown widget action: ${actionKey}`);
      }
      await controller.arm(params.device, mode);
      return t('toast_arming', { state: stateText(mode) });
    },
  },

  [SENSORS_OVERVIEW_WIDGET]: {
    async get(controller) {
      logger.debug(`onWidgetGet <- ${SENSORS_OVERVIEW_WIDGET}`);
      const sensors = controller.snapshot?.sensors ?? [];
      if (sensors.length === 0) {
        return {
          ttl_seconds: 60,
          components: [
            {
              type: 'text',
              variant: 'body',
              text: t(
                controller.connected || !controller.client
                  ? 'widget_no_sensor'
                  : 'widget_disconnected',
              ),
            },
          ],
        };
      }
      const active = sensors.filter((sensor) => sensor.active).length;
      const summary =
        active === 0
          ? t('widget_all_quiet', { count: sensors.length })
          : t('widget_active_count', { active, count: sensors.length });
      return {
        ttl_seconds: 60,
        components: [
          { type: 'text', variant: 'caption', text: summary },
          {
            type: 'status',
            items: sortSensors(sensors)
              .slice(0, 10)
              .map((sensor) => ({
                label: truncate(sensor.name, 40),
                icon: SENSOR_ICONS[sensor.kind] ?? 'circle',
                value:
                  !sensor.active && sensor.lowBattery
                    ? t('widget_low_battery')
                    : sensorValue(sensor),
                color: sensorColor(sensor),
              })),
          },
        ],
      };
    },
  },
};

/**
 * Freshness nudge: ask the core to re-pull every widget now (rate-limited
 * core-side, dropped while disconnected: call it after every change).
 */
export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) {
    gladys.requestWidgetRefresh(key);
  }
}

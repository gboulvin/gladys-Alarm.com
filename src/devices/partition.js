// -----------------------------------------------------------------------------
// Device type: PARTITION (the alarm panel itself, one per partition).
//
// The arming mode is a `text`/`select` feature: Gladys shows a drop-down with
// the modes the partition supports, and sends the chosen value back as a
// string. The state published is the mode Alarm.com reports.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { PARTITION_MODES, setPartitionMode } from '../alarmcom/commands.js';
import { TEXTS } from '../i18n.js';

export const PARTITION_TYPE = 'partition';
export const PARTITION_FEATURES = { ARM_STATE: 'arm-state' };

function supportedModes(partition) {
  return PARTITION_MODES.filter((mode) => mode !== 'armed_night' || partition.supportsNight);
}

export const partition = {
  type: PARTITION_TYPE,

  entries: (snapshot) => snapshot.partitions,

  buildDevice(gladys, entry) {
    const ids = gladys.externalIds(PARTITION_TYPE, entry.id);
    return {
      name: entry.name,
      external_id: ids.device,
      model: 'Alarm.com partition',
      should_poll: false,
      features: [
        {
          name: 'Arming mode',
          external_id: ids.feature(PARTITION_FEATURES.ARM_STATE),
          category: DEVICE_FEATURE_CATEGORIES.TEXT,
          type: DEVICE_FEATURE_TYPES.TEXT.SELECT,
          min: 0,
          max: 0,
          read_only: !entry.canControl,
          has_feedback: true,
          keep_history: false,
          // Option labels are plain strings: the English names Alarm.com uses.
          supported_options: supportedModes(entry).map((mode, index) => ({
            value: mode,
            label: TEXTS[`state_${mode}`].en,
            sort_order: index,
          })),
        },
      ],
    };
  },

  states(gladys, entry) {
    if (entry.state === 'unknown') {
      return [];
    }
    const ids = gladys.externalIds(PARTITION_TYPE, entry.id);
    return [
      { device_feature_external_id: ids.feature(PARTITION_FEATURES.ARM_STATE), text: entry.state },
    ];
  },

  async setValue({ client, entry, featureKey, value, config }) {
    if (featureKey !== PARTITION_FEATURES.ARM_STATE) {
      throw new Error(`Unknown partition feature ${featureKey}`);
    }
    const mode = String(value);
    if (!supportedModes(entry).includes(mode)) {
      throw new Error(`Unsupported arming mode "${mode}" for ${entry.name}`);
    }
    await setPartitionMode(client, entry, mode, config.armingOptions);
  },
};

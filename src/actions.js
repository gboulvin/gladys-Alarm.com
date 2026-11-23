// -----------------------------------------------------------------------------
// Manifest actions: the buttons of the Configuration screen (manifest
// `actions`). The resolved value is shown under the button; throwing shows
// the error instead.
//
// The two-factor flow: when Alarm.com asks for a one-time code, the
// connection status says so. With an authenticator app, the user types the
// code in "Verify the two-factor code" directly; with SMS or email, "Send a
// two-factor code" first. Once verified, Gladys is registered as a trusted
// device: the next logins (restarts included) skip the code.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { t } from './i18n.js';

const logger = createLogger({ name: 'actions' });

const OTP_SEND_METHODS = ['sms', 'email'];
const OTP_VERIFY_METHODS = ['app', 'sms', 'email'];

export const MANIFEST_ACTIONS = {
  async test_connection(controller) {
    logger.info('Action test_connection');
    return controller.testConnection();
  },

  async send_otp(controller, { fields }) {
    const method = fields.method || 'sms';
    if (!OTP_SEND_METHODS.includes(method)) {
      throw new Error(`Unknown method "${method}"`);
    }
    logger.info(`Action send_otp <- ${method}`);
    await controller.requestOtp(method);
    return t('action_otp_sent');
  },

  async verify_otp(controller, { fields }) {
    const method = fields.method || 'app';
    const code = String(fields.code ?? '').replace(/\s+/g, '');
    if (!OTP_VERIFY_METHODS.includes(method)) {
      throw new Error(`Unknown method "${method}"`);
    }
    if (!/^\d{4,10}$/.test(code)) {
      throw new Error('The code must be made of 4 to 10 digits');
    }
    logger.info(`Action verify_otp <- ${method}`);
    await controller.verifyOtp(code, method);
    return t('action_otp_verified');
  },
};

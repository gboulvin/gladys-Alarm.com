// -----------------------------------------------------------------------------
// Errors raised by the Alarm.com client. Each one maps to a distinct user
// situation (wrong credentials, two-factor code needed, missing permission...),
// so the integration can tell the user what to do instead of a raw HTTP code.
// -----------------------------------------------------------------------------

export class AlarmComError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** Username or password refused by Alarm.com, or two-factor cookie rejected. */
export class AuthenticationError extends AlarmComError {}

/**
 * The credentials are right but Alarm.com asks for a one-time code. `methods`
 * lists the enabled channels ('app', 'sms', 'email').
 */
export class OtpRequiredError extends AlarmComError {
  constructor(methods) {
    super(`Two-factor authentication required (${methods.join(', ')})`);
    this.methods = methods;
  }
}

/** Alarm.com wants the user to set up two-factor authentication on its website first. */
export class TwoFactorSetupRequiredError extends AlarmComError {}

/** The account lacks the permission, or the plan does not include the device type. */
export class NotAuthorizedError extends AlarmComError {}

/** Any other unexpected answer (HTTP error, unknown payload...). */
export class ApiError extends AlarmComError {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

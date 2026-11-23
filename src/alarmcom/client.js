// -----------------------------------------------------------------------------
// Alarm.com web session.
//
// The login reproduces what the browser does on www.alarm.com:
//   1. GET the login page and read the hidden ASP.NET form fields;
//   2. POST the form with the username and password (plus the "trusted device"
//      cookie of a previous two-factor login, when there is one);
//   3. read the anti-forgery cookie, echoed in the `ajaxrequestuniquekey`
//      header of every API call;
//   4. read the identity (user id, temperature unit) and ask whether a
//      one-time code is still required.
// Once logged in, the JSON:API endpoints are called with the session cookies.
// A session that expired (403) is renewed once, transparently.
//
// The password and the cookies never reach the logs.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { CookieJar } from './cookieJar.js';
import {
  ANTI_FORGERY_COOKIE,
  BASE_URL,
  ENDPOINTS,
  LOGIN_FIELDS,
  LOGIN_HIDDEN_FIELDS,
  LOGIN_POST_URL,
  LOGIN_URL,
  OTP_TYPES,
  TWO_FACTOR_COOKIE,
} from './constants.js';
import {
  ApiError,
  AuthenticationError,
  NotAuthorizedError,
  OtpRequiredError,
  TwoFactorSetupRequiredError,
} from './errors.js';

const logger = createLogger({ name: 'alarmcom' });

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 10;
// A generic browser-like agent: Alarm.com serves its web application to it.
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Gladys';
// Name shown in the "trusted devices" list of the Alarm.com account.
export const TRUSTED_DEVICE_NAME = 'Gladys Assistant';

const HTML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeHtml(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code =
        entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Read the value of a hidden `<input>` of the login page, by id or name.
 * @param {string} html - The login page.
 * @param {string} field - The field id/name, e.g. `__VIEWSTATE`.
 * @returns {string|undefined} The decoded value.
 */
export function readHiddenField(html, field) {
  const escaped = field.replace(/[$]/g, '\\$');
  const tag = html.match(new RegExp(`<input[^>]*(?:id|name)="${escaped}"[^>]*>`, 'i'));
  if (!tag) {
    return undefined;
  }
  const value = tag[0].match(/value="([^"]*)"/i);
  return value ? decodeHtml(value[1]) : '';
}

/** The enabled two-factor channels, from the `enabledTwoFactorTypes` bitmask. */
export function otpMethodsFromBitmask(bitmask) {
  return Object.entries(OTP_TYPES)
    .filter(([, bit]) => (bitmask & bit) !== 0)
    .map(([method]) => method);
}

export class AlarmComClient {
  /**
   * @param {object} options
   * @param {string} options.username - Alarm.com login.
   * @param {string} options.password - Alarm.com password.
   * @param {string} [options.twoFactorCookie] - "Trusted device" cookie of a previous login.
   * @param {Function} [options.fetch] - fetch implementation (tests inject a fake).
   */
  constructor({ username, password, twoFactorCookie, fetch = globalThis.fetch }) {
    this.username = username;
    this.password = password;
    this.fetch = fetch;
    this.jar = new CookieJar({ [TWO_FACTOR_COOKIE]: twoFactorCookie });
    this.ajaxKey = undefined;
    this.userId = undefined;
    this.usesCelsius = false;
    this.providerName = 'Alarm.com';
    this.loggedIn = false;
    this.otpMethods = [];
    this.loginPromise = undefined;
  }

  /** The "trusted device" cookie to persist, once a two-factor login succeeded. */
  get twoFactorCookie() {
    return this.jar.get(TWO_FACTOR_COOKIE);
  }

  // --- Low-level HTTP ----------------------------------------------------------

  /**
   * One HTTP exchange with Alarm.com, following the redirects by hand so the
   * cookies set on every hop (the login sets them on a 302) are kept.
   * @returns {Promise<{ status: number, url: string, text: string }>}
   */
  async http(method, url, { body, headers = {} } = {}) {
    let currentUrl = new URL(url, BASE_URL).toString();
    let currentMethod = method;
    let currentBody = body;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const requestHeaders = { 'User-Agent': USER_AGENT, ...headers };
      const cookie = this.jar.header();
      if (cookie) {
        requestHeaders.Cookie = cookie;
      }
      const response = await this.fetch(currentUrl, {
        method: currentMethod,
        headers: requestHeaders,
        body: currentBody,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      this.jar.storeFrom(response);
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString();
        // A redirected POST becomes a GET, like in a browser.
        currentMethod = 'GET';
        currentBody = undefined;
        delete headers['Content-Type'];
        continue;
      }
      return { status: response.status, url: currentUrl, text: await response.text() };
    }
    throw new ApiError(`Too many redirects from ${url}`);
  }

  ajaxHeaders(withBody) {
    const headers = {
      Accept: 'application/vnd.api+json',
      Referer: `${BASE_URL}web/system/home`,
    };
    if (this.ajaxKey) {
      headers.ajaxrequestuniquekey = this.ajaxKey;
    }
    if (withBody) {
      headers['Content-Type'] = 'application/json; charset=UTF-8';
    }
    return headers;
  }

  /**
   * Call a JSON endpoint of the web API. A session that expired is renewed
   * once (the login runs again, two-factor cookie included).
   */
  async api(method, path, body, { retry = true, requireLogin = true } = {}) {
    if (requireLogin && !this.loggedIn) {
      await this.login();
    }
    const { status, text } = await this.http(method, path, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: this.ajaxHeaders(body !== undefined),
    });
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = undefined;
    }
    const errorStatus = String(json?.errors?.[0]?.status ?? '');
    const sessionExpired = status === 401 || status === 403 || errorStatus === '403';
    if (sessionExpired && retry && requireLogin) {
      logger.info('Alarm.com session expired, logging in again');
      this.loggedIn = false;
      await this.login();
      return this.api(method, path, body, { retry: false, requireLogin });
    }
    if (errorStatus === '409') {
      throw new AuthenticationError('Alarm.com rejected the two-factor authentication cookie');
    }
    if (errorStatus === '423' || status === 423) {
      throw new NotAuthorizedError(`Alarm.com refused ${path}: missing permission or feature`);
    }
    if (status >= 400 || errorStatus || json === undefined) {
      const error = new ApiError(
        `Alarm.com answered HTTP ${status}${errorStatus ? ` (error ${errorStatus})` : ''} on ${path}`,
        status,
      );
      error.body = json;
      throw error;
    }
    return json;
  }

  // --- Login ---------------------------------------------------------------------

  /**
   * Log in. Concurrent callers share the same attempt. Rejects with
   * OtpRequiredError when a one-time code is needed: the session is then kept
   * so requestOtp / submitOtp can complete it.
   */
  login() {
    if (!this.loginPromise) {
      this.loginPromise = this.doLogin().finally(() => {
        this.loginPromise = undefined;
      });
    }
    return this.loginPromise;
  }

  async doLogin() {
    if (!this.username || !this.password) {
      throw new AuthenticationError('Alarm.com username and password are not configured');
    }
    this.loggedIn = false;
    this.ajaxKey = undefined;
    // Start from a clean session: only the trusted-device cookie survives.
    this.jar.retain([TWO_FACTOR_COOKIE]);

    // 1. Login page: hidden form fields and the first cookies.
    const page = await this.http('GET', LOGIN_URL);
    const form = new URLSearchParams();
    for (const field of LOGIN_HIDDEN_FIELDS) {
      const value = readHiddenField(page.text, field);
      if (value === undefined && field === '__VIEWSTATE') {
        throw new ApiError('Unexpected Alarm.com login page (no login form found)', page.status);
      }
      form.set(field, value ?? '');
    }
    form.set('__EVENTTARGET', '');
    form.set('__EVENTARGUMENT', '');
    form.set('__VIEWSTATEENCRYPTED', '');
    form.set('IsFromNewSite', '1');
    form.set(LOGIN_FIELDS.USERNAME, this.username);
    form.set(LOGIN_FIELDS.PASSWORD, this.password);

    // 2. Post the credentials.
    const result = await this.http('POST', LOGIN_POST_URL, {
      body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (/m=login_fail/i.test(result.url) || result.status >= 400) {
      throw new AuthenticationError('Alarm.com refused the username or the password');
    }
    // 3. Anti-forgery key: not every Alarm.com reseller sets it.
    this.ajaxKey = this.jar.get(ANTI_FORGERY_COOKIE);

    // 4. Identity.
    const identities = await this.api('GET', ENDPOINTS.IDENTITIES, undefined, {
      retry: false,
      requireLogin: false,
    });
    const identity = identities?.data?.[0];
    if (!identity?.id) {
      throw new AuthenticationError('Alarm.com did not return the account identity');
    }
    this.userId = identity.id;
    this.usesCelsius = identity.attributes?.localizeTempUnitsToCelsius === true;
    this.providerName = identity.attributes?.logoName || 'Alarm.com';

    // 5. Two-factor authentication.
    const twoFactor = await this.api('GET', ENDPOINTS.TWO_FACTOR(this.userId), undefined, {
      retry: false,
      requireLogin: false,
    });
    const attributes = twoFactor?.data?.attributes ?? {};
    if (attributes.showSuggestedSetup === true) {
      throw new TwoFactorSetupRequiredError(
        'Alarm.com asks to set up two-factor authentication on its website first',
      );
    }
    const methods = otpMethodsFromBitmask(Number(attributes.enabledTwoFactorTypes ?? 0));
    if (methods.length > 0 && attributes.isCurrentDeviceTrusted !== true) {
      this.otpMethods = methods;
      throw new OtpRequiredError(methods);
    }
    this.otpMethods = [];
    this.loggedIn = true;
    logger.info('Logged in to Alarm.com');
  }

  /** Ask Alarm.com to send a one-time code by SMS or email. */
  async requestOtp(method) {
    if (!this.userId) {
      throw new AuthenticationError('Log in with the username and password first');
    }
    const action = {
      sms: 'sendTwoFactorAuthenticationCodeViaSms',
      email: 'sendTwoFactorAuthenticationCodeViaEmail',
    }[method];
    if (!action) {
      throw new ApiError(`No code to send for the "${method}" method`);
    }
    await this.api('POST', `${ENDPOINTS.TWO_FACTOR(this.userId)}/${action}`, undefined, {
      retry: false,
      requireLogin: false,
    });
  }

  /**
   * Verify a one-time code, then register Gladys as a trusted device so the
   * next logins skip the code. Resolves the trusted-device cookie to persist.
   */
  async submitOtp(code, method) {
    if (!this.userId) {
      throw new AuthenticationError('Log in with the username and password first');
    }
    const typeOf2FA = OTP_TYPES[method];
    if (!typeOf2FA) {
      throw new ApiError(`Unknown two-factor method "${method}"`);
    }
    try {
      await this.api(
        'POST',
        `${ENDPOINTS.TWO_FACTOR(this.userId)}/verifyTwoFactorCode`,
        { code: String(code).trim(), typeOf2FA },
        { retry: false, requireLogin: false },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        throw new AuthenticationError('Wrong or expired two-factor code', { cause: err });
      }
      throw err;
    }
    await this.api(
      'POST',
      `${ENDPOINTS.TWO_FACTOR(this.userId)}/trustTwoFactorDevice`,
      { deviceName: TRUSTED_DEVICE_NAME },
      { retry: false, requireLogin: false },
    );
    this.loggedIn = true;
    this.otpMethods = [];
    logger.info('Two-factor authentication completed, Gladys is now a trusted device');
    return this.twoFactorCookie;
  }

  // --- Data ----------------------------------------------------------------------

  /** Id of the system selected on the account (the first one otherwise). */
  async getSystemId() {
    const systems = await this.api('GET', ENDPOINTS.SYSTEMS);
    const list = systems?.data ?? [];
    const selected = list.find((system) => system.attributes?.isSelected) ?? list[0];
    if (!selected) {
      throw new ApiError('No Alarm.com system found on this account');
    }
    return String(selected.id);
  }

  /**
   * Every device of the system, as JSON:API resources ({ id, type, attributes,
   * relationships }), from the device catalog.
   */
  async getDeviceResources() {
    const systemId = await this.getSystemId();
    const catalog = await this.api('GET', ENDPOINTS.DEVICE_CATALOG(systemId));
    return { systemId, resources: catalog?.included ?? [] };
  }

  /** Post a command (`armStay`, `lock`, `turnOn`...) on a device endpoint. */
  async command(endpoint, command, body = {}) {
    return this.api('POST', `${endpoint}/${command}`, { statePollOnly: false, ...body });
  }
}

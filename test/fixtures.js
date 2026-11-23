// -----------------------------------------------------------------------------
// Test fixtures: an Alarm.com device catalog, and fakes of the Alarm.com web
// server and client. Tests never touch the network.
// -----------------------------------------------------------------------------

export const SYSTEM_ID = '9001';

/** A catalog with one of every supported device, plus ignored ones. */
export function catalogResources(overrides = {}) {
  const resources = [
    {
      id: '9001-127',
      type: 'devices/partition',
      attributes: {
        description: 'House',
        state: 1,
        desiredState: 1,
        hasPermissionToChangeState: true,
        extendedArmingOptions: {
          ArmedStay: [0, 1, 2],
          ArmedAway: [0, 1, 2],
          ArmedNight: [0, 1, 2, 3],
        },
      },
    },
    {
      id: '9001-1',
      type: 'devices/sensor',
      attributes: { description: 'Front door', state: 1, deviceType: 1, lowBattery: false },
    },
    {
      id: '9001-2',
      type: 'devices/sensor',
      attributes: { description: 'Hallway motion', state: 3, deviceType: 2 },
    },
    {
      id: '9001-3',
      type: 'devices/sensor',
      attributes: { description: 'Kitchen smoke', state: 1, deviceType: 5 },
    },
    {
      id: '9001-4',
      type: 'devices/water-sensor',
      attributes: { description: 'Basement water', state: 5, deviceType: 0 },
    },
    {
      id: '9001-5',
      type: 'devices/sensor',
      attributes: { description: 'Panic button', state: 0, deviceType: 9 },
    },
    {
      id: '9001-6',
      type: 'devices/sensor',
      attributes: { description: 'Living room glass', state: 3, deviceType: 19 },
    },
    {
      id: '9001-50',
      type: 'devices/lock',
      attributes: { description: 'Front lock', state: 1, hasPermissionToChangeState: true },
    },
    {
      id: '9001-60',
      type: 'devices/garage-door',
      attributes: { description: 'Garage', state: 2 },
    },
    {
      id: '9001-70',
      type: 'devices/light',
      attributes: { description: 'Porch light', state: 2, isDimmer: true, lightLevel: 80 },
    },
    {
      id: '9001-71',
      type: 'devices/light',
      attributes: { description: 'Hall light', state: 3, isDimmer: false },
    },
    {
      id: '9001-80',
      type: 'devices/thermostat',
      attributes: {
        description: 'Thermostat',
        state: 2,
        ambientTemp: 20.5,
        heatSetpoint: 21,
        coolSetpoint: 25,
        minHeatSetpoint: 7,
        maxCoolSetpoint: 32,
        supportsSetpoints: true,
        supportsHumidity: true,
        humidityLevel: 45,
      },
    },
    { id: '42', type: 'systems/system', attributes: {} },
  ];
  return resources.map((resource) =>
    overrides[resource.id]
      ? { ...resource, attributes: { ...resource.attributes, ...overrides[resource.id] } }
      : resource,
  );
}

/**
 * A fake AlarmComClient: serves the catalog, records the commands.
 */
export function createFakeClient({ resources = catalogResources(), usesCelsius = true } = {}) {
  const client = {
    resources,
    usesCelsius,
    providerName: 'Alarm.com',
    userId: 'user-1',
    loggedIn: false,
    commands: [],
    otpRequests: [],
    loginError: undefined,
    async login() {
      if (client.loginError) {
        throw client.loginError;
      }
      client.loggedIn = true;
    },
    async getDeviceResources() {
      return { systemId: SYSTEM_ID, resources: client.resources };
    },
    async command(endpoint, command, body = {}) {
      client.commands.push({ endpoint, command, body });
      return {};
    },
    async requestOtp(method) {
      client.otpRequests.push(method);
    },
    async submitOtp(code, method) {
      client.submitted = { code, method };
      client.loggedIn = true;
      return 'trusted-cookie';
    },
  };
  return client;
}

/** Build a fetch Response-like object. */
export function fakeResponse({ status = 200, body = '', headers = {}, cookies = [] }) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    headers: {
      get: (name) => lower[name.toLowerCase()] ?? null,
      getSetCookie: () => cookies,
    },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

export const LOGIN_PAGE = `<html><form>
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="vs&#43;1==" />
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="GEN" />
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV" />
<input type="hidden" name="__PREVIOUSPAGE" id="__PREVIOUSPAGE" value="PP" />
</form></html>`;

/**
 * A fake www.alarm.com: a route table `METHOD path` -> handler(request).
 * Records every request (url, method, headers, body).
 */
export function createFakeServer(routes) {
  const requests = [];
  async function fetch(url, init = {}) {
    const parsed = new URL(url);
    const request = {
      url,
      path: parsed.pathname + parsed.search,
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body,
    };
    requests.push(request);
    const key = `${request.method} ${parsed.pathname}`;
    const handler = routes[key];
    if (!handler) {
      return fakeResponse({ status: 404, body: { errors: [{ status: '404' }] } });
    }
    return fakeResponse(await handler(request));
  }
  return { fetch, requests };
}

/** Routes of a successful login (no two-factor needed unless told). */
export function loginRoutes({ twoFactor = { enabledTwoFactorTypes: 0 }, loginFails = false } = {}) {
  return {
    'GET /login': () => ({
      body: LOGIN_PAGE,
      cookies: ['ASP.NET_SessionId=abc; path=/; HttpOnly'],
    }),
    'POST /web/Default.aspx': () =>
      loginFails
        ? { status: 302, headers: { location: '/login?m=login_fail' } }
        : {
            status: 302,
            headers: { location: '/web/system/home' },
            cookies: ['afg=ANTIFORGERY; path=/', 'auth_CustomerDotNet=token; path=/'],
          },
    'GET /web/system/home': () => ({ body: '<html>home</html>' }),
    'GET /web/api/identities': () => ({
      body: {
        data: [
          {
            id: 'user-1',
            attributes: { localizeTempUnitsToCelsius: true, logoName: 'Acme Security' },
          },
        ],
      },
    }),
    'GET /web/api/engines/twoFactorAuthentication/twoFactorAuthentications/user-1': () => ({
      body: { data: { attributes: twoFactor } },
    }),
  };
}

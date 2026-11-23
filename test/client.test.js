import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlarmComClient, otpMethodsFromBitmask, readHiddenField } from '../src/alarmcom/client.js';
import { AuthenticationError, OtpRequiredError } from '../src/alarmcom/errors.js';
import { LOGIN_PAGE, createFakeServer, loginRoutes } from './fixtures.js';

const credentials = { username: 'john@example.com', password: 's3cret' };

test('readHiddenField reads and decodes the ASP.NET hidden fields', () => {
  assert.equal(readHiddenField(LOGIN_PAGE, '__VIEWSTATE'), 'vs+1==');
  assert.equal(readHiddenField(LOGIN_PAGE, '__EVENTVALIDATION'), 'EV');
  assert.equal(readHiddenField(LOGIN_PAGE, '__MISSING'), undefined);
});

test('otpMethodsFromBitmask lists the enabled channels', () => {
  assert.deepEqual(otpMethodsFromBitmask(0), []);
  assert.deepEqual(otpMethodsFromBitmask(1 | 4), ['app', 'email']);
});

test('login posts the form, keeps the redirect cookies and sends the anti-forgery key', async () => {
  const server = createFakeServer(loginRoutes());
  const client = new AlarmComClient({ ...credentials, fetch: server.fetch });
  await client.login();
  assert.equal(client.loggedIn, true);
  assert.equal(client.userId, 'user-1');
  assert.equal(client.usesCelsius, true);
  assert.equal(client.providerName, 'Acme Security');

  const post = server.requests.find((r) => r.method === 'POST');
  const form = new URLSearchParams(post.body);
  assert.equal(form.get('ctl00$ContentPlaceHolder1$loginform$txtUserName'), 'john@example.com');
  assert.equal(form.get('txtPassword'), 's3cret');
  assert.equal(form.get('__VIEWSTATE'), 'vs+1==');
  assert.match(post.headers.Cookie, /ASP\.NET_SessionId=abc/);

  const identity = server.requests.find((r) => r.path === '/web/api/identities');
  assert.equal(identity.headers.ajaxrequestuniquekey, 'ANTIFORGERY');
  assert.match(identity.headers.Cookie, /auth_CustomerDotNet=token/);
});

test('a refused password is an AuthenticationError', async () => {
  const server = createFakeServer(loginRoutes({ loginFails: true }));
  const client = new AlarmComClient({ ...credentials, fetch: server.fetch });
  await assert.rejects(client.login(), AuthenticationError);
  assert.equal(client.loggedIn, false);
});

test('missing credentials fail without any request', async () => {
  const server = createFakeServer(loginRoutes());
  const client = new AlarmComClient({ username: '', password: '', fetch: server.fetch });
  await assert.rejects(client.login(), AuthenticationError);
  assert.equal(server.requests.length, 0);
});

test('two-factor: OtpRequiredError, then the verified code yields the trusted cookie', async () => {
  const base = '/web/api/engines/twoFactorAuthentication/twoFactorAuthentications/user-1';
  const server = createFakeServer({
    ...loginRoutes({ twoFactor: { enabledTwoFactorTypes: 2 | 4, isCurrentDeviceTrusted: false } }),
    [`POST ${base}/sendTwoFactorAuthenticationCodeViaSms`]: () => ({ body: {} }),
    [`POST ${base}/verifyTwoFactorCode`]: (request) =>
      JSON.parse(request.body).code === '123456'
        ? { body: { value: { deviceName: 'Browser' } } }
        : { status: 422, body: { errors: [{ status: '422' }] } },
    [`POST ${base}/trustTwoFactorDevice`]: () => ({
      body: {},
      cookies: ['twoFactorAuthenticationId=TRUSTED; path=/; expires=Fri, 01 Jan 2100 00:00:00 GMT'],
    }),
  });
  const client = new AlarmComClient({ ...credentials, fetch: server.fetch });
  await assert.rejects(client.login(), (err) => {
    assert.ok(err instanceof OtpRequiredError);
    assert.deepEqual(err.methods, ['sms', 'email']);
    return true;
  });
  await client.requestOtp('sms');
  await assert.rejects(client.submitOtp('000000', 'sms'), AuthenticationError);
  const cookie = await client.submitOtp('123 456'.replace(' ', ''), 'sms');
  assert.equal(cookie, 'TRUSTED');
  assert.equal(client.loggedIn, true);
  const verify = server.requests.find(
    (r) => r.path.endsWith('/verifyTwoFactorCode') && r.body.includes('123456'),
  );
  assert.deepEqual(JSON.parse(verify.body), { code: '123456', typeOf2FA: 2 });
  const trust = server.requests.find((r) => r.path.endsWith('/trustTwoFactorDevice'));
  assert.deepEqual(JSON.parse(trust.body), { deviceName: 'Gladys Assistant' });
});

test('the trusted-device cookie is sent with the login form', async () => {
  const server = createFakeServer(
    loginRoutes({ twoFactor: { enabledTwoFactorTypes: 1, isCurrentDeviceTrusted: true } }),
  );
  const client = new AlarmComClient({
    ...credentials,
    twoFactorCookie: 'TRUSTED',
    fetch: server.fetch,
  });
  await client.login();
  assert.equal(client.loggedIn, true);
  const post = server.requests.find((r) => r.method === 'POST');
  assert.match(post.headers.Cookie, /twoFactorAuthenticationId=TRUSTED/);
});

test('an expired session is renewed once, transparently', async () => {
  let catalogCalls = 0;
  const server = createFakeServer({
    ...loginRoutes(),
    'GET /web/api/systems/availableSystemItems': () => ({
      body: { data: [{ id: '9001', attributes: { isSelected: true } }] },
    }),
    'GET /web/api/settings/manageDevices/deviceCatalogs/9001': () => {
      catalogCalls += 1;
      return catalogCalls === 1
        ? { status: 403, body: { errors: [{ status: '403' }] } }
        : { body: { included: [{ id: '1', type: 'devices/partition', attributes: {} }] } };
    },
  });
  const client = new AlarmComClient({ ...credentials, fetch: server.fetch });
  const { systemId, resources } = await client.getDeviceResources();
  assert.equal(systemId, '9001');
  assert.equal(resources.length, 1);
  assert.equal(catalogCalls, 2);
  assert.equal(server.requests.filter((r) => r.path === '/login').length, 2, 'logged in twice');
});

test('commands post statePollOnly and the body as JSON', async () => {
  const server = createFakeServer({
    ...loginRoutes(),
    'POST /web/api/devices/locks/9001-50/lock': () => ({ body: { data: {} } }),
  });
  const client = new AlarmComClient({ ...credentials, fetch: server.fetch });
  await client.command('web/api/devices/locks/9001-50', 'lock');
  const command = server.requests.find((r) => r.path.endsWith('/lock'));
  assert.deepEqual(JSON.parse(command.body), { statePollOnly: false });
  assert.equal(command.headers.ajaxrequestuniquekey, 'ANTIFORGERY');
});

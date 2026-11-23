// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code,
// and the rules of the store validator that tests can catch before a release.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { MANIFEST_ACTIONS } from '../src/actions.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { SCENE_TRIGGER_KEYS } from '../src/events.js';
import { WIDGETS } from '../src/widgets.js';
import { DEFAULT_CONFIG, POLL_FREQUENCY_BOUNDS, TWO_FACTOR_COOKIE_KEY } from '../src/config.js';
import { LANGUAGES } from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

/** Every multi-language object of the manifest, with its path. */
function multiLanguageTexts(node, path = 'manifest', found = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => multiLanguageTexts(item, `${path}[${index}]`, found));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (['label', 'description', 'placeholder'].includes(key) && typeof value === 'object') {
        found.push({ path: `${path}.${key}`, value });
      } else {
        multiLanguageTexts(value, `${path}.${key}`, found);
      }
    }
  }
  return found;
}

test('the integration is a cloud integration', () => {
  assert.deepEqual(manifest.transports, ['cloud']);
});

test('every text of the manifest is translated in the four UI languages', () => {
  const texts = multiLanguageTexts(manifest);
  assert.ok(texts.length > 50);
  for (const { path, value } of texts) {
    for (const lang of LANGUAGES) {
      assert.equal(typeof value[lang], 'string', `${path}.${lang} is missing`);
      assert.ok(value[lang].length > 0, `${path}.${lang} is empty`);
    }
  }
});

test('labels and descriptions are multi-language objects, never plain strings', () => {
  const plain = [];
  (function walk(node, path) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (['label', 'description', 'placeholder'].includes(key) && typeof value === 'string') {
          plain.push(`${path}.${key}`);
        }
        walk(value, `${path}.${key}`);
      }
    }
  })(manifest, 'manifest');
  assert.deepEqual(plain, []);
});

test('every manifest action has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions).sort(), Object.keys(MANIFEST_ACTIONS).sort());
});

test('every scene_actions key has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.scene_actions).sort(), Object.keys(SCENE_ACTIONS).sort());
});

test('every widgets key has a content handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.widgets).sort(), Object.keys(WIDGETS).sort());
});

test('every scene trigger fired by the code is declared, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.scene_triggers).sort(), [...SCENE_TRIGGER_KEYS].sort());
});

test('scene triggers, scene actions and widgets require Gladys >= 5.1.0', () => {
  assert.ok(isAtLeast(minGladysVersion(), [5, 1, 0]), manifest.gladys_version);
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of manifest.config_schema) {
    if (field.type === 'section') {
      assert.ok(!(field.key in DEFAULT_CONFIG), `section ${field.key} stores no value`);
      assert.equal(field.default, undefined);
      assert.equal(field.required, undefined);
      continue;
    }
    assert.ok(field.key in DEFAULT_CONFIG, `${field.key} has a default in DEFAULT_CONFIG`);
    if (field.default !== undefined) {
      assert.equal(DEFAULT_CONFIG[field.key], field.default, `DEFAULT_CONFIG.${field.key}`);
    }
  }
  const poll = manifest.config_schema.find((field) => field.key === 'poll_frequency');
  assert.equal(poll.min, POLL_FREQUENCY_BOUNDS.min);
  assert.equal(poll.max, POLL_FREQUENCY_BOUNDS.max);
});

test('the password is a secret field, and the internal storage key is not in the schema', () => {
  const password = manifest.config_schema.find((field) => field.key === 'password');
  assert.equal(password.type, 'secret');
  assert.equal(password.default, undefined);
  assert.ok(!keysOf(manifest.config_schema).includes(TWO_FACTOR_COOKIE_KEY));
});

test('dynamic selects declare a source and no static options nor default', () => {
  for (const field of allFields.filter((f) => f.source !== undefined)) {
    assert.equal(field.source, 'devices');
    assert.equal(field.options, undefined, field.key);
    assert.equal(field.default, undefined, field.key);
  }
});

test('trigger filters are never booleans, select defaults are among the options', () => {
  for (const trigger of manifest.scene_triggers) {
    for (const field of trigger.fields ?? []) {
      assert.notEqual(field.type, 'boolean', `${trigger.key}.${field.key}`);
    }
  }
  for (const field of allFields.filter((f) => f.options && f.default !== undefined)) {
    assert.ok(
      field.options.some((option) => option.value === field.default),
      field.key,
    );
  }
});

test('keys follow the store patterns and are unique in their list', () => {
  const lists = [
    manifest.config_schema,
    manifest.actions,
    manifest.scene_triggers,
    manifest.scene_actions,
    manifest.widgets,
    ...manifest.actions.map((a) => a.fields ?? []),
    ...manifest.scene_triggers.map((a) => [...(a.fields ?? [])]),
    ...manifest.scene_triggers.map((a) => a.variables ?? []),
    ...manifest.scene_actions.map((a) => a.fields ?? []),
    ...manifest.scene_actions.map((a) => a.outputs ?? []),
  ];
  for (const list of lists) {
    const keys = keysOf(list);
    assert.equal(new Set(keys).size, keys.length, `duplicate key in ${keys}`);
    for (const key of keys) {
      assert.match(key, /^[a-z0-9_]+$/);
    }
  }
  for (const widget of manifest.widgets) {
    assert.match(widget.key, /^[a-z0-9_]{2,32}$/);
    for (const value of Object.values(widget.label)) {
      assert.ok(value.length >= 3 && value.length <= 30, `widget label "${value}"`);
    }
    for (const value of Object.values(widget.description ?? {})) {
      assert.ok(value.length <= 100, `widget description "${value}"`);
    }
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`), manifest.docker_image);
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});

test('section links are https', () => {
  for (const section of manifest.config_schema.filter((f) => f.type === 'section')) {
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('the user documentation exists in the four languages (300 characters minimum)', async () => {
  for (const lang of LANGUAGES) {
    const doc = await readFile(new URL(`../docs/${lang}.md`, import.meta.url), 'utf8');
    assert.ok(doc.length >= 300, `docs/${lang}.md is too short`);
  }
});

test('the cover is a PNG of 800x534 under 150 KB', async () => {
  const url = new URL('../cover.png', import.meta.url);
  const buffer = await readFile(url);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  assert.equal(buffer.readUInt32BE(16), 800);
  assert.equal(buffer.readUInt32BE(20), 534);
  assert.ok((await stat(url)).size <= 150 * 1024);
});

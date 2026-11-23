import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, TEXTS, stateText, t } from '../src/i18n.js';

test('every text exists in English, French, German and Spanish', () => {
  for (const [key, entry] of Object.entries(TEXTS)) {
    assert.deepEqual(Object.keys(entry).sort(), [...LANGUAGES].sort(), key);
    const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const lang of LANGUAGES) {
      assert.ok(entry[lang].length > 0, `${key}.${lang}`);
      assert.deepEqual(
        placeholders(entry[lang]),
        placeholders(entry.en),
        `${key}.${lang} placeholders`,
      );
    }
  }
});

test('t fills the placeholders, with nested translations', () => {
  const text = t('toast_arming', { state: stateText('armed_away') });
  assert.equal(text.en, 'Command sent to Alarm.com: Armed away.');
  assert.equal(text.fr, 'Commande envoyée à Alarm.com : Armée (absence).');
  assert.equal(text.de, 'Befehl an Alarm.com gesendet: Extern scharf.');
  assert.equal(text.es, 'Orden enviada a Alarm.com: Armada ausente.');
});

test('an unknown state reads Unknown', () => {
  assert.equal(stateText('weird').en, 'Unknown');
});

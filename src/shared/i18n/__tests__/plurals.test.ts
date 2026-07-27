import { describe, it, expect, beforeAll } from 'vitest';
import i18next, { type i18n as I18n } from 'i18next';

// Locale JSON is the source of truth; import it directly rather than going
// through the app's lazy Vite backend so this test has no async/env deps.
import enAdmission from '../locales/en/admission.json';
import koAdmission from '../locales/ko/admission.json';
import enInspect from '../locales/en/inspect.json';
import koInspect from '../locales/ko/inspect.json';
import enApp from '../locales/en/app.json';
import enReview from '../locales/en/review.json';
import koReview from '../locales/ko/review.json';

let en: I18n;
let ko: I18n;

beforeAll(async () => {
  en = i18next.createInstance();
  await en.init({
    lng: 'en',
    ns: ['admission', 'inspect', 'app', 'review'],
    resources: {
      en: { admission: enAdmission, inspect: enInspect, app: enApp, review: enReview },
    },
    interpolation: { escapeValue: false },
  });
  ko = i18next.createInstance();
  await ko.init({
    lng: 'ko',
    ns: ['admission', 'inspect', 'review'],
    resources: {
      ko: { admission: koAdmission, inspect: koInspect, review: koReview },
    },
    interpolation: { escapeValue: false },
  });
});

describe('i18n pluralization (en)', () => {
  it('admission gate.card counts pick singular vs plural', () => {
    expect(en.t('admission:gate.card.rulesFired', { count: 1 })).toBe('1 rule fired');
    expect(en.t('admission:gate.card.rulesFired', { count: 3 })).toBe('3 rules fired');
    expect(en.t('admission:gate.card.rulesPassed', { count: 1 })).toBe('1 rule passed');
    expect(en.t('admission:gate.card.rulesPassed', { count: 2 })).toBe('2 rules passed');
    expect(en.t('admission:gate.card.prOverrides', { count: 1 })).toBe('1 override on this PR');
    expect(en.t('admission:gate.card.prOverrides', { count: 4 })).toBe('4 overrides on this PR');
    expect(en.t('admission:gate.card.revisions', { count: 1 })).toBe('1 revision');
    expect(en.t('admission:gate.card.revisions', { count: 5 })).toBe('5 revisions');
  });

  it('inspect semanticConflict summary pluralizes', () => {
    expect(en.t('inspect:semanticConflict.summary', { count: 1 })).toBe('1 candidate');
    expect(en.t('inspect:semanticConflict.summary', { count: 2 })).toBe('2 candidates');
  });

  it('review scene plurals interpolate correctly', () => {
    expect(en.t('review:engine.applyFixBatch', { count: 1 })).toBe('Apply 1 fix in batch');
    expect(en.t('review:engine.applyFixBatch', { count: 3 })).toBe('Apply 3 fixes in batch');
    expect(en.t('review:files.overlapsIncidents', { count: 1, list: 'INC-1' }))
      .toBe('Overlaps 1 prior incident: INC-1');
    expect(en.t('review:files.overlapsIncidents', { count: 2, list: 'INC-1, INC-2' }))
      .toBe('Overlaps 2 prior incidents: INC-1, INC-2');
  });
});

describe('i18n pluralization (ko — no plural suffix)', () => {
  // CJK has no morphological plural, so _one and _other share the same
  // wording — only the interpolated digit changes between count 1 and N.
  const stripDigits = (s: string) => s.replace(/\d+/g, '#');
  it('_one and _other share wording for CJK', () => {
    for (const key of [
      'admission:gate.card.rulesFired',
      'inspect:semanticConflict.summary',
      'review:engine.applyFixBatch',
    ]) {
      expect(stripDigits(ko.t(key, { count: 1 })))
        .toBe(stripDigits(ko.t(key, { count: 9 })));
    }
    // No stray English "s" leaked into the CJK plural forms.
    expect(ko.t('admission:gate.card.rulesFired', { count: 9 })).toBe('규칙 9건 발동');
    expect(ko.t('inspect:semanticConflict.summary', { count: 9 })).toBe('후보 9건');
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  summarizeAccess, canAccessPracticeCard, canAccessTestContent,
  canManageTalkTagSchedule, ACCESS_AREAS
} from '../src/entitlement.js';

const now = Date.parse('2026-10-28T00:00:00Z');

test('an account without a verified active period stays on free access', () => {
  assert.equal(summarizeAccess(null, [], now), 'free');
  assert.equal(summarizeAccess({ status: 'past_due' }, [], now), 'free');
  assert.equal(summarizeAccess({ status: 'active', active_from: '2026-10-29T00:00:00Z' }, [], now), 'free');
  assert.equal(summarizeAccess({ status: 'active', active_until: '2026-10-28T00:00:00Z' }, [], now), 'free');
});

test('active membership grants the member summary only during its period', () => {
  assert.equal(summarizeAccess({ status: 'active', active_from: '2026-10-27T00:00:00Z', active_until: '2026-10-29T00:00:00Z' }, [], now), 'member');
});

test('a trial grants full access only within its dated period', () => {
  assert.equal(summarizeAccess({ status: 'trial', trial_months: 1, active_from: '2026-10-27T00:00:00Z', active_until: '2026-11-28T00:00:00Z' }, [], now), 'trial');
  assert.equal(summarizeAccess({ status: 'trial', trial_months: 1, active_from: '2026-10-27T00:00:00Z', active_until: '2026-10-28T00:00:00Z' }, [], now), 'free');
  assert.equal(summarizeAccess({ status: 'trial', trial_months: 1, active_from: null, active_until: null }, [], now), 'free');
  assert.equal(summarizeAccess({ status: 'trial', active_from: '2026-10-27T00:00:00Z', active_until: '2026-11-28T00:00:00Z' }, [], now), 'free');
});

test('verified staff roles take precedence over membership', () => {
  assert.equal(summarizeAccess(null, [{ role: 'snowman' }], now), 'snowpal');
  assert.equal(summarizeAccess(null, [{ role: 'snowman' }, { role: 'admin' }], now), 'admin');
});

test('six virtual member tiers enforce the same boundary in every learning area', () => {
  const tiers = [
    { name: 'visitor', level: 'visitor', first: false, tenth: false, eleventh: false, tests: false, schedule: false },
    { name: 'free', level: 'free', first: true, tenth: true, eleventh: false, tests: false, schedule: false },
    { name: 'trial', level: 'trial', first: true, tenth: true, eleventh: true, tests: true, schedule: false },
    { name: 'paid', level: 'member', first: true, tenth: true, eleventh: true, tests: true, schedule: false },
    { name: 'snowpal', level: 'snowpal', first: true, tenth: true, eleventh: true, tests: true, schedule: true },
    { name: 'admin', level: 'admin', first: true, tenth: true, eleventh: true, tests: true, schedule: true }
  ];
  for (const tier of tiers) {
    for (const area of ACCESS_AREAS) {
      assert.equal(canAccessPracticeCard(tier.level, area, 1), tier.first, `${tier.name}/${area}/001`);
      assert.equal(canAccessPracticeCard(tier.level, area, 10), tier.tenth, `${tier.name}/${area}/010`);
      assert.equal(canAccessPracticeCard(tier.level, area, 11), tier.eleventh, `${tier.name}/${area}/011`);
    }
    assert.equal(canAccessTestContent(tier.level), tier.tests, `${tier.name}/test`);
    assert.equal(canManageTalkTagSchedule(tier.level), tier.schedule, `${tier.name}/schedule`);
  }
});

test('the free boundary is per level and category, with no invalid ordinal', () => {
  for (const area of ACCESS_AREAS) {
    assert.equal(canAccessPracticeCard('free', area, 0), false);
    assert.equal(canAccessPracticeCard('free', area, -1), false);
    assert.equal(canAccessPracticeCard('free', area, 1.5), false);
    assert.equal(canAccessPracticeCard('free', area, 100), false);
  }
  assert.equal(canAccessPracticeCard('free', 'test-content', 1), false);
});

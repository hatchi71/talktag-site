// Learner-facing access summary only. Protected content must be authorized by
// the server on every request; this module never grants access by itself.
export const ACCESS_AREAS = Object.freeze([
  'guided-listen-repeat',
  'mini-talks',
  'vocal-camp',
  'story-camp',
  'readable'
]);

export const FREE_CARDS_PER_AREA = 10;
// The count applies independently to each level section within each area;
// card numbers 001–010 remain free in every language.

const FULL_ACCESS_LEVELS = new Set(['trial', 'member', 'snowpal', 'admin']);

export function summarizeAccess(membership, roles = [], now = Date.now()) {
  const names = new Set(roles.map(item => item.role));
  if (names.has('admin')) return 'admin';
  if (names.has('snowpal') || names.has('snowman')) return 'snowpal';
  const starts = !membership?.active_from || Date.parse(membership.active_from) <= now;
  const ends = !membership?.active_until || Date.parse(membership.active_until) > now;
  if (membership?.status === 'trial' && Number.isInteger(membership.trial_months)
    && membership.trial_months > 0 && membership.active_from && membership.active_until
    && starts && ends) return 'trial';
  return ['active', 'canceled'].includes(membership?.status)
    && membership?.active_from && membership?.active_until && starts && ends ? 'member' : 'free';
}

// These checks define the staged product rules for the UI. They are not a
// security boundary: lesson text and media must be served through an
// authenticated backend before paid access is commercially launched.
export function canAccessPracticeCard(accessLevel, area, cardNumber) {
  if (FULL_ACCESS_LEVELS.has(accessLevel)) return true;
  return accessLevel === 'free'
    && ACCESS_AREAS.includes(area)
    && Number.isInteger(cardNumber)
    && cardNumber >= 1
    && cardNumber <= FREE_CARDS_PER_AREA;
}

export function canViewTestLanding() {
  return true;
}

export function canAccessTestContent(accessLevel) {
  return FULL_ACCESS_LEVELS.has(accessLevel);
}

export function canManageTalkTagSchedule(accessLevel) {
  return accessLevel === 'snowpal' || accessLevel === 'admin';
}

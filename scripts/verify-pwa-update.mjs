import fs from 'node:fs';

const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const pwa = fs.readFileSync(new URL('../pwa.js', import.meta.url), 'utf8');

const cacheVersion = sw.match(/const CACHE_VERSION\s*=\s*'([^']+)'/u)?.[1];
if (!cacheVersion || !/^talktag-pwa-\d{8}-[a-z0-9-]+-v\d+$/u.test(cacheVersion)) {
  throw new Error('PWA cache version is missing or does not identify this release.');
}

for (const required of ['registration.update()', 'registration.waiting', 'SKIP_WAITING', 'location.reload()']) {
  if (!pwa.includes(required)) throw new Error(`PWA update flow is missing: ${required}`);
}

console.log(`PWA update flow ready: ${cacheVersion}`);

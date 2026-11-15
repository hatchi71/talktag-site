# TalkTag production

This is the production source corresponding to the verified live website. URL paths and learning navigation remain unchanged. Cloudflare serves `dist`; it must never serve the repository root.

## Structure

- `public/`: reviewed learner-facing pages, public catalog metadata, styles, illustrations, and browser bundles.
- `src/`: maintainable browser application source for authentication, players, MySpace and authorized management.
- `workers/`: protected audio delivery, deployed separately with its existing R2 binding and secret.
- `supabase/migrations/`: protected database rules and functions. No database export or member records.
- `tests/`: automated behavior checks.
- `release-manifest.json`: exact public file hashes from the published release.

## Reproduce the published site

```
npm ci
npm test
npm run build
```

The build verifies every public file against the release manifest before creating `dist`. It needs no temporary folders, private lesson exports, developer home paths, or credentials.

## Make an application change

Edit `src/`, run the matching `build:*` command to update `public/assets/`, review the browser result and tests, then run `npm run release:record` and `npm run build`. Commit reviewed changes and their updated manifest together. Do not publish prototypes or drafts.

Lesson scripts, translations, source audio and third-party reference Markdown belong in the private production workspace and protected services, not `public/` or this repository. Content publication must export only the approved catalog metadata and artwork to `public/`. Preserve publication ordering and generate the Home feed in the authoring workflow before importing the reviewed public release.

## Deploy

Website: `npx wrangler@4.45.0 pages deploy dist --project-name talktag-app-preview --branch main`

Audio service: `npx wrangler@4.45.0 deploy --config workers/wrangler.toml`

The website and Worker have separate deployment permissions. Secrets must be stored in Cloudflare, never in Git. The Worker session-recheck change was deployed on 2026-11-06 as version `426c565e-4418-4ee9-ad0f-f3e37943ec04`. Live signed-in Boot Camp playback and unauthenticated rejection (HTTP 401) were verified; 38 automated checks passed. The temporary deployment token was revoked after verification. Real two-device account testing remains separate from these checks.

This checkout replaces the legacy public site tree. Git history preserves its chronology; the original local authoring checkout was not altered or deleted.

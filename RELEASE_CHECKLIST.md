# TalkTag release checklist

The final release check for every learner-facing update is:

```sh
node scripts/verify-pwa-update.mjs
```

Each release must bump `CACHE_VERSION` in `sw.js`. This ensures the normal in-app `업데이트` prompt detects and applies the new build.

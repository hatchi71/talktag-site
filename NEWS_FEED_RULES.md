# Landing news language rule

Approved 2026-10-17: each landing displays published content updates only for its own learning language. English uses `en`, Korean uses `ko`, and Japanese uses `ja`. Interface language does not determine the feed language.

Every generated content group in `home-news-feed.json` must have an explicit `language`. Filter by that field before selecting the newest groups. Never fill a landing's content slots with another language's updates. The pinned gathering notice is separate from content updates.

Run `node scripts/update-home-news.mjs` for publication. Preserve original publication timestamps for replacements and copy/layout changes. Exclude drafts and unavailable media. Verify all three landing feeds after changes.

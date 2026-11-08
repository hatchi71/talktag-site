# Private member memos

Adds a separate administrator-only memo to each selected member's Overview in MySpace management. Notes save in Supabase, never in browser storage. Each save records the administrator and timestamp without putting the note's text in the activity log.

Optimistic revisions prevent silently overwriting another administrator's edits. Unsaved changes prompt before switching members, closing details, refreshing the board or leaving the page. Failed saves retain the draft.

Validation: 68 existing tests passed; all nine bundles matched sources; site build verified 604 public files. Supabase rollback-only integration check passed save/load, per-member isolation, stale revision rejection and non-administrator read/write denial. Direct table access and anonymous RPC access are denied. No test notes were retained. Local mobile layout checked at 360, 375, 390 and 430 CSS px without horizontal overflow; Bright/Dark styles present.

Database migration applied successfully. Published to Cloudflare Pages (80aeb5d1) and verified live at talktag.co.kr. The selected member Overview loads the enabled memo field and “No memo yet” from Supabase. No real member memo was modified during browser verification.

# Member dashboard upgrade — 7 November 2026

Published and verified on talktag.co.kr after the user approved the prepared member-data access update. Cloudflare deployment: https://71540b21.talktag-app-preview.pages.dev.

- Keeps the existing MySpace administrator layout and access-management actions.
- Member list shows registration time, completed/in-progress published cards and visits over 30 days; existing name/date sorting and access search remain.
- Selected member shows registration, latest sign-in, verified email state, linked sign-in provider and provider account ID, latest learning/visit, current access and device policy.
- Learning detail groups published cards by English/Korean/Japanese and category, plus ten recent lessons. It does not retrieve writing drafts or script content.
- New visit rows use server time in fixed 30-minute windows; no IP, fingerprint, user agent or URL. Counts begin after deployment; historical visits cannot be reconstructed. Active days use Asia/Seoul.
- Authenticated users can only record their own visit through a device-checked function. No direct visit-table permissions are granted. Both admin insight functions enforce trusted administrator role and active session.
- Database migration: supabase/migrations/202611070001_admin_member_insights.sql (transactional; no existing rows modified/deleted).
- Technical checks: 68 tests passed; all nine browser bundles match source. Local design fixture (sample data only) checked at 360/375/390/430 CSS px, Bright/Dark; no page overflow.
- Database migration succeeded. Live administrator details and all three Overview/Learning/Access panels verified, including the existing administrator’s 31 completions and all three language groups. No roles were changed during QA.
- Server execution tests: both report functions rejected anonymous and existing non-admin sessions with insufficient-privilege errors; test transaction rolled back.
- Real production dashboard checked at 360/375/390/430 CSS px with no horizontal page overflow; Bright/Dark and normal scrolling verified. Expanded admin workspace to 1440px maximum; learner MySpace retains its narrower layout.
- Shared theme loader and explicit script versions now agree, preventing older cached MySpace code from winning the loading race.
- Existing name and registration sorting preserved; visit writes deduplicate into a single server-side window during repeated page opens. No historical visit estimates were created.

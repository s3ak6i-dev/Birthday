-- Avatar Setup's scrub color choice (apps/web/src/lib/avatar-options.ts)
-- lives in each device's own localStorage, never synced anywhere - so a
-- partner's remote-rendered character (lounge_presence, 0003) always fell
-- back to the plain gray default, since this device has no way of knowing
-- what color the *other* device's Avatar Setup actually picked. Caught
-- live: "the pink of lakshmi is not rendering on Surya's screen." Synced
-- through the same row every position update already writes to, rather
-- than building a second sync path - this is static for a session, so it
-- just rides along for free on writes that were already happening.
alter table lounge_presence add column if not exists scrub_color text;

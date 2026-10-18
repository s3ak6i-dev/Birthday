-- Cross-device Lounge character position sync - plain REST polling, not
-- Supabase Realtime (see apps/web/src/lib/use-lounge-presence.ts for the
-- full reasoning: the WebSocket connection Realtime needs proved
-- unreliable on the actual phone/network this was tested from, caught via
-- "subscribe-status CHANNEL_ERROR" and repeated WebSocket connection
-- failures in the browser console - broadcasts could still send
-- (Supabase's client silently falls back to REST for sends when the
-- socket's down) but nothing could ever be *received* without a live
-- subscription, which never actually established). One row per player,
-- continuously overwritten rather than appended - this is "where is each
-- player right now," not a history anyone needs to keep. Same ownership
-- convention as chat_messages (0002_chat.sql): both players trusted
-- equally, read every row, write only your own.

create table if not exists lounge_presence (
  user_id uuid primary key references auth.users (id),
  pos_left numeric not null,
  pos_top numeric not null,
  facing text not null,
  state text not null,
  updated_at timestamptz not null default now()
);

alter table lounge_presence enable row level security;

create policy "read all lounge presence" on lounge_presence for select using (auth.role() = 'authenticated');
create policy "upsert own lounge presence" on lounge_presence for insert with check (auth.uid() = user_id);
create policy "update own lounge presence" on lounge_presence for update using (auth.uid() = user_id);
-- Lets a client clear its own row immediately on a clean leave (tab close,
-- navigating out of the Lounge) rather than only ever going stale - the
-- client-side staleness timeout (see use-lounge-presence.ts) is still the
-- real backstop for anything that isn't a clean exit (crash, lost network).
create policy "delete own lounge presence" on lounge_presence for delete using (auth.uid() = user_id);

-- No `alter publication supabase_realtime add table ...` here on purpose -
-- this table is read via plain REST polling, never subscribed to over
-- Realtime, so there's nothing for that publication to push.

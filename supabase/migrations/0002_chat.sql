-- Lounge chat: a small realtime message bubble between the two players.
-- Not in masterdoc.md's screen/FR list (no spec existed for this - built on
-- request, see TODO.md). Follows 0001_init.sql's existing conventions:
-- both players are trusted equally and can read every row, but a player can
-- only ever insert a message as themselves.

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "read all chat messages" on chat_messages for select using (auth.role() = 'authenticated');
create policy "write own chat messages" on chat_messages for insert with check (auth.uid() = sender_id);

-- Supabase Realtime only pushes postgres_changes for tables explicitly
-- added to this publication - without this, inserts would still save fine
-- but never reach a subscribed client live.
alter publication supabase_realtime add table chat_messages;

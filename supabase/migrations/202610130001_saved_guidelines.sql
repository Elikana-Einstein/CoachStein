-- Store multiple roadmap guidelines per user, each with independent progress.
-- The existing roadmaps/stages/items/progress tables continue to represent
-- the currently selected dashboard route for backward compatibility.

create table public.saved_guidelines (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  title      text not null,
  stages     jsonb not null default '[]'::jsonb check (jsonb_typeof(stages) = 'array'),
  progress   jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index saved_guidelines_updated_idx
  on public.saved_guidelines (user_id, updated_at desc);

alter table public.saved_guidelines enable row level security;

create policy "own rows" on public.saved_guidelines for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.saved_guidelines to authenticated;

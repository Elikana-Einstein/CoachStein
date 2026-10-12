-- MySpace schema. Managed through Supabase CLI migrations.

create table public.roadmaps (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default '',
  updated_at timestamptz not null default now()
);

create table public.stages (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id       text not null,
  position int  not null,
  num      int  not null,
  title    text not null,
  duration text not null default '',
  summary  text not null default '',
  primary key (user_id, id)
);

create table public.items (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id       text not null,
  stage_id text not null,
  position int  not null,
  label    text not null,
  kind     text not null check (kind in ('task', 'project', 'milestone')),
  primary key (user_id, id),
  foreign key (user_id, stage_id) references public.stages (user_id, id) on delete cascade
);

create index items_stage_idx on public.items (user_id, stage_id);

-- Progress deliberately has no FK to items so ticks survive a roadmap re-import.
create table public.progress (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id    text not null,
  done       boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.roadmaps enable row level security;
alter table public.stages   enable row level security;
alter table public.items    enable row level security;
alter table public.progress enable row level security;

create policy "own rows" on public.roadmaps for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.stages for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_roadmap(p_title text, p_stages jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s  jsonb;
  i  jsonb;
  sp int := 0;
  ip int;
begin
  insert into public.roadmaps (user_id, title)
  values (auth.uid(), coalesce(p_title, ''))
  on conflict (user_id) do update set title = excluded.title, updated_at = now();

  delete from public.stages where user_id = auth.uid();

  for s in select * from jsonb_array_elements(coalesce(p_stages, '[]'::jsonb)) loop
    sp := sp + 1;
    insert into public.stages (user_id, id, position, num, title, duration, summary)
    values (
      auth.uid(), s->>'id', sp, (s->>'num')::int, s->>'title',
      coalesce(s->>'duration', ''), coalesce(s->>'summary', '')
    );

    ip := 0;
    for i in select * from jsonb_array_elements(coalesce(s->'items', '[]'::jsonb)) loop
      ip := ip + 1;
      insert into public.items (user_id, id, stage_id, position, label, kind)
      values (auth.uid(), i->>'id', s->>'id', ip, i->>'label', i->>'kind');
    end loop;
  end loop;
end;
$$;

revoke execute on function public.save_roadmap(text, jsonb) from public, anon;
grant execute on function public.save_roadmap(text, jsonb) to authenticated;

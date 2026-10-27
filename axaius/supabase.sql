create table if not exists public.axaius_deliverables (
    id text primary key,
    completed boolean not null default false,
    updated_at timestamptz not null default now()
);

alter table public.axaius_deliverables enable row level security;

drop policy if exists "Anyone can read AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Anyone can add AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Anyone can update AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Public can read AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Public can add AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Public can update AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Signed-in users can read AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Signed-in users can add AXAIUS deliverables"
    on public.axaius_deliverables;

drop policy if exists "Signed-in users can update AXAIUS deliverables"
    on public.axaius_deliverables;

revoke all on public.axaius_deliverables from public;
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.axaius_deliverables to anon, authenticated;

create policy "Public can read AXAIUS deliverables"
    on public.axaius_deliverables
    for select
    to anon, authenticated
    using (true);

create policy "Public can add AXAIUS deliverables"
    on public.axaius_deliverables
    for insert
    to anon, authenticated
    with check (true);

create policy "Public can update AXAIUS deliverables"
    on public.axaius_deliverables
    for update
    to anon, authenticated
    using (true)
    with check (true);

select
    has_table_privilege('anon', 'public.axaius_deliverables', 'select') as anon_can_read,
    has_table_privilege('anon', 'public.axaius_deliverables', 'insert') as anon_can_add,
    has_table_privilege('anon', 'public.axaius_deliverables', 'update') as anon_can_update;

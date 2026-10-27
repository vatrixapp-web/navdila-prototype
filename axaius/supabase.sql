create table public.axaius_deliverables (
    id text primary key,
    completed boolean not null default false,
    updated_at timestamptz not null default now()
);

alter table public.axaius_deliverables enable row level security;

create policy "Anyone can read AXAIUS deliverables"
    on public.axaius_deliverables
    for select
    to anon
    using (true);

create policy "Anyone can add AXAIUS deliverables"
    on public.axaius_deliverables
    for insert
    to anon
    with check (true);

create policy "Anyone can update AXAIUS deliverables"
    on public.axaius_deliverables
    for update
    to anon
    using (true)
    with check (true);

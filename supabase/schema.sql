-- Rode no SQL Editor do Supabase.
create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'dots',
  limit_cents integer not null default 0 check (limit_cents >= 0),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('expense','income')),
  amount_cents integer not null check (amount_cents > 0),
  category_id uuid references public.categories(id) on delete set null,
  note text not null default '',
  date date not null,
  source text not null default 'manual' check (source in ('manual','print')),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date on public.transactions (user_id, date desc);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- CamAIvo — Migration initiale : tables métier + RLS + trigger profil
-- ═══════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────
-- Profil applicatif, lié 1:1 à auth.users. Créé automatiquement à
-- l'inscription via le trigger handle_new_user (plan starter, 500 pts).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'starter'
    check (plan in ('starter', 'pro', 'business')),
  points_balance integer not null default 500 check (points_balance >= 0),
  points_quota integer not null default 500,
  created_at timestamptz not null default now()
);

-- ── avatars ──────────────────────────────────────────────────────
-- user_id nullable : les avatars "système" ont user_id null + is_public.
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  image_url text not null,
  is_default boolean not null default false,
  is_public boolean not null default false,
  status text not null default 'processing'
    check (status in ('ready', 'processing', 'failed')),
  created_at timestamptz not null default now(),
  constraint avatars_owner_or_public check (user_id is not null or is_public)
);

create index avatars_user_id_idx on public.avatars (user_id);

-- ── swap_sessions ────────────────────────────────────────────────
create table public.swap_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  avatar_id uuid references public.avatars (id) on delete set null,
  mode text not null check (mode in ('local', 'cloud', 'mock')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  points_used numeric(10, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'ended')),
  -- Dernier heartbeat reçu par l'Edge Function consume-points (Phase 3)
  last_heartbeat_at timestamptz not null default now()
);

create index swap_sessions_user_id_idx on public.swap_sessions (user_id, started_at desc);

-- ── point_transactions ───────────────────────────────────────────
-- Journal immuable : achats, consommation, bonus, remboursements.
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('purchase', 'consumption', 'bonus', 'refund')),
  amount numeric(10, 2) not null, -- signé : négatif = débit
  balance_after numeric(10, 2) not null,
  reference text, -- id paiement ou id session
  created_at timestamptz not null default now()
);

create index point_transactions_user_id_idx
  on public.point_transactions (user_id, created_at desc);

-- ── payments ─────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mobile_money')),
  provider_ref text,
  amount numeric(10, 2) not null,
  currency text not null default 'EUR',
  points_granted integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index payments_user_id_idx on public.payments (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — chaque utilisateur ne voit que ses données
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.swap_sessions enable row level security;
alter table public.point_transactions enable row level security;
alter table public.payments enable row level security;

-- profiles : lecture + mise à jour du sien uniquement.
-- points_balance n'est modifié que côté serveur (Edge Function, service role).
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- avatars : les siens + les publics en lecture ; CRUD sur les siens.
create policy "avatars_select_own_or_public"
  on public.avatars for select
  using (auth.uid() = user_id or is_public);

create policy "avatars_insert_own"
  on public.avatars for insert
  with check (auth.uid() = user_id and not is_public);

create policy "avatars_update_own"
  on public.avatars for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not is_public);

create policy "avatars_delete_own"
  on public.avatars for delete
  using (auth.uid() = user_id);

-- swap_sessions : lecture des siennes ; création par le client ;
-- le décompte/la clôture serveur passent par le service role (bypass RLS).
create policy "swap_sessions_select_own"
  on public.swap_sessions for select
  using (auth.uid() = user_id);

create policy "swap_sessions_insert_own"
  on public.swap_sessions for insert
  with check (auth.uid() = user_id);

create policy "swap_sessions_update_own"
  on public.swap_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- point_transactions : lecture seule (insertion côté serveur uniquement).
create policy "point_transactions_select_own"
  on public.point_transactions for select
  using (auth.uid() = user_id);

-- payments : lecture seule (création/màj via Edge Functions).
create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER — création automatique du profil à l'inscription
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, plan, points_balance, points_quota)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'starter',
    500, -- quota de bienvenue offert
    500
  );

  -- Trace du bonus de bienvenue dans le journal
  insert into public.point_transactions (user_id, type, amount, balance_after, reference)
  values (new.id, 'bonus', 500, 500, 'signup_bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

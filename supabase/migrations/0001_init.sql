-- Edición Simple: usuarios, créditos, compras y trabajos.
--
-- Regla de oro: el saldo de créditos NO es una columna que se pisa. Es la suma de los movimientos
-- de credit_ledger. Cada compra, cobro y devolución es una fila, y la restricción única
-- (reason, ref) hace que el mismo pago o la misma devolución nunca se acrediten dos veces.

create extension if not exists pgcrypto;

-- ---------- Perfiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- Movimientos de créditos ----------

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('signup_bonus', 'purchase', 'job_charge', 'job_refund', 'admin')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (reason, ref)
);

create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create view public.credit_balances with (security_invoker = true) as
  select user_id, coalesce(sum(delta), 0)::integer as balance
  from public.credit_ledger
  group by user_id;

-- ---------- Compras (Mercado Pago) ----------

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_id text not null,
  credits integer not null check (credits > 0),
  amount_ars numeric(12, 2) not null check (amount_ars > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  mp_preference_id text,
  mp_payment_id text unique,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index purchases_user_idx on public.purchases (user_id, created_at desc);

-- ---------- Trabajos (ediciones, imágenes, videos) ----------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('edit', 'image', 'video')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  title text,
  params jsonb not null default '{}'::jsonb,
  cost integer not null check (cost >= 0),
  -- Para iteraciones: la edición sobre la que se piden cambios.
  parent_job_id uuid references public.jobs (id) on delete set null,
  result jsonb,
  error text,
  attempts integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_user_idx on public.jobs (user_id, created_at desc);
create index jobs_queue_idx on public.jobs (created_at) where status = 'queued';

-- ---------- Seguridad (RLS) ----------
-- Los usuarios solo leen lo suyo. Todas las escrituras pasan por el servidor (service role)
-- o por las funciones de abajo, así nadie puede regalarse créditos desde el navegador.

alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.purchases enable row level security;
alter table public.jobs enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own ledger" on public.credit_ledger for select using (auth.uid() = user_id);
create policy "own purchases" on public.purchases for select using (auth.uid() = user_id);
create policy "own jobs" on public.jobs for select using (auth.uid() = user_id);

-- ---------- Alta de usuario: perfil + créditos de regalo ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.credit_ledger (user_id, delta, reason, ref)
    values (new.id, 30, 'signup_bonus', new.id::text); -- mismo valor que SIGNUP_BONUS_CREDITS en lib/pricing.ts
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Crear un trabajo cobrando los créditos (todo o nada) ----------

create or replace function public.create_job(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_params jsonb,
  p_cost integer,
  p_parent_job_id uuid default null
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_job public.jobs;
begin
  -- Serializa los cobros de un mismo usuario para que dos pedidos simultáneos no gasten el mismo saldo.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user_id;
  if v_balance < p_cost then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  insert into public.jobs (user_id, kind, title, params, cost, parent_job_id)
    values (p_user_id, p_kind, p_title, p_params, p_cost, p_parent_job_id)
    returning * into v_job;

  if p_cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, ref)
      values (p_user_id, -p_cost, 'job_charge', v_job.id::text);
  end if;

  return v_job;
end;
$$;

-- ---------- Marcar un trabajo como fallido y devolver los créditos ----------

create or replace function public.fail_job(p_job_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set status = 'failed', error = p_error, updated_at = now(), locked_at = null
    where id = p_job_id and status <> 'done'
    returning * into v_job;

  if found and v_job.cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, ref)
      values (v_job.user_id, v_job.cost, 'job_refund', v_job.id::text)
      on conflict (reason, ref) do nothing;
  end if;
end;
$$;

-- ---------- Acreditar una compra aprobada (idempotente) ----------

create or replace function public.approve_purchase(p_purchase_id uuid, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases;
begin
  update public.purchases
    set status = 'approved', mp_payment_id = p_payment_id, approved_at = now()
    where id = p_purchase_id and status <> 'approved'
    returning * into v_purchase;

  if not found then
    return false; -- ya estaba acreditada
  end if;

  insert into public.credit_ledger (user_id, delta, reason, ref)
    values (v_purchase.user_id, v_purchase.credits, 'purchase', p_payment_id)
    on conflict (reason, ref) do nothing;

  return true;
end;
$$;

-- ---------- Cola de trabajos para el worker ----------

create or replace function public.claim_job()
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set status = 'processing', locked_at = now(), attempts = attempts + 1, updated_at = now()
    where id = (
      select id from public.jobs
      where status = 'queued'
         -- Retoma trabajos que quedaron colgados si el worker se cayó a mitad de camino.
         or (status = 'processing' and locked_at < now() - interval '30 minutes' and attempts < 3)
      order by created_at
      for update skip locked
      limit 1
    )
    returning * into v_job;
  return v_job;
end;
$$;

-- Estas funciones solo las llama el servidor con la service role key.
revoke all on function public.create_job(uuid, text, text, jsonb, integer, uuid) from public, anon, authenticated;
revoke all on function public.fail_job(uuid, text) from public, anon, authenticated;
revoke all on function public.approve_purchase(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_job() from public, anon, authenticated;

-- ---------- Archivos ----------
-- uploads: crudos y recursos que suben los usuarios, en la carpeta <user_id>/...
-- outputs: reels editados, imágenes y videos generados. Se leen con URLs firmadas.

insert into storage.buckets (id, name, public, file_size_limit)
  values ('uploads', 'uploads', false, 1073741824), ('outputs', 'outputs', false, null)
  on conflict (id) do nothing;

create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "read own uploads" on storage.objects for select to authenticated
  using (bucket_id in ('uploads', 'outputs') and (storage.foldername(name))[1] = auth.uid()::text);

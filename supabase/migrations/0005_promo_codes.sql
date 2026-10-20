-- Códigos de regalo para la prueba con alumnos (o promociones).
-- Crear uno desde el SQL Editor de Supabase:
--   insert into public.promo_codes (code, credits, max_uses) values ('MDM-PRUEBA', 30, 20);
-- 30 créditos = 3 videos normales o 2 premium. max_uses = cuántas personas lo pueden canjear.

alter table public.credit_ledger drop constraint credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in ('signup_bonus', 'purchase', 'job_charge', 'job_refund', 'admin', 'promo'));

create table public.promo_codes (
  code text primary key check (code = upper(code)),
  credits integer not null check (credits > 0),
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- Sin políticas: nadie lo lee desde el navegador, solo la función de abajo.

create or replace function public.redeem_promo(p_user_id uuid, p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes;
begin
  select * into v_promo from public.promo_codes where code = upper(trim(p_code)) for update;
  if not found or (v_promo.expires_at is not null and v_promo.expires_at < now()) then
    raise exception 'PROMO_INVALID' using errcode = 'P0001';
  end if;
  if v_promo.uses >= v_promo.max_uses then
    raise exception 'PROMO_EXHAUSTED' using errcode = 'P0001';
  end if;

  -- Un mismo usuario no puede canjear dos veces el mismo código (restricción única reason+ref).
  begin
    insert into public.credit_ledger (user_id, delta, reason, ref)
      values (p_user_id, v_promo.credits, 'promo', v_promo.code || ':' || p_user_id::text);
  exception when unique_violation then
    raise exception 'PROMO_USED' using errcode = 'P0001';
  end;

  update public.promo_codes set uses = uses + 1 where code = v_promo.code;
  return v_promo.credits;
end;
$$;

revoke all on function public.redeem_promo(uuid, text) from public, anon, authenticated;

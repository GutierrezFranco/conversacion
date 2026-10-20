-- Carpeta de recursos reutilizables (capturas, logos, b-roll) y limpieza de archivos viejos.
--
-- Rutas en Storage:
--   uploads/<user_id>/raw/...     crudos: se borran a los 30 días
--   uploads/<user_id>/assets/...  recursos de la carpeta: quedan hasta que el usuario los borre
--   outputs/<user_id>/...         reels editados: se borran a los 90 días

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null unique,
  name text not null,
  kind text not null check (kind in ('image', 'video')),
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index assets_user_idx on public.assets (user_id, created_at desc);

alter table public.assets enable row level security;
create policy "own assets" on public.assets for select using (auth.uid() = user_id);

-- Archivos de un bucket, bajo cierta carpeta, más viejos que N días. El worker los borra
-- a través de la API de Storage (borrar la fila en SQL dejaría el archivo huérfano).
create or replace function public.expired_objects(p_bucket text, p_folder text, p_days integer)
returns setof text
language sql
security definer
set search_path = storage, public
as $$
  select name from storage.objects
  where bucket_id = p_bucket
    and (storage.foldername(name))[2] is not distinct from nullif(p_folder, '')
    and created_at < now() - make_interval(days => p_days)
  limit 500;
$$;

revoke all on function public.expired_objects(text, text, integer) from public, anon, authenticated;

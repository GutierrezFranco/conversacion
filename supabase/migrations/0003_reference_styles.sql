-- Estilos propios sacados de una referencia (un reel o una captura que le gusta al usuario).
-- El worker analiza la referencia y guarda acá el estilo para reusarlo en todos sus videos.

alter table public.jobs drop constraint jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check check (kind in ('edit', 'image', 'video', 'reference'));

create table public.custom_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  -- Mismo formato que EditStyle en lib/styles.ts
  style jsonb not null,
  -- Qué se copió de la referencia y qué detectó la IA, para mostrárselo al usuario
  copied text[] not null default '{}',
  analysis text,
  source_job_id uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index custom_styles_user_idx on public.custom_styles (user_id, created_at desc);

alter table public.custom_styles enable row level security;
create policy "own styles" on public.custom_styles for select using (auth.uid() = user_id);

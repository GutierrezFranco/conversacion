-- La carpeta de recursos también guarda música (para el fondo de los reels).
alter table public.assets drop constraint assets_kind_check;
alter table public.assets add constraint assets_kind_check check (kind in ('image', 'video', 'audio'));

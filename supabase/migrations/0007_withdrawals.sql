-- Pedidos del «botón de arrepentimiento» (Resolución 424/2020): se guardan con un número de trámite.
create table public.withdrawal_requests (
  id bigint generated always as identity primary key,
  email text not null,
  purchase_info text,
  details text,
  status text not null default 'pendiente' check (status in ('pendiente', 'resuelto')),
  created_at timestamptz not null default now()
);

alter table public.withdrawal_requests enable row level security;
-- Sin políticas: solo se escribe y se lee desde el servidor.

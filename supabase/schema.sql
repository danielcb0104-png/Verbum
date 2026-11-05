-- =====================================================================
--  Biblia Nácar-Colunga · esquema de Supabase
--  Pégalo entero en Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) Marcas y comentarios del usuario --------------------------------
create table if not exists public.marcas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  libro       text not null,          -- id del libro (gen, exo, ... apo)
  cap         int  not null,
  v_ini       int  not null,
  off_ini     int  not null default 0, -- carácter inicial dentro del versículo
  v_fin       int  not null,
  off_fin     int  not null,
  texto       text,                    -- fragmento citado
  color       text not null default 'amarillo',
  nota        text,                    -- comentario personal
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists marcas_user_libro on public.marcas (user_id, libro, cap);
alter table public.marcas enable row level security;
drop policy if exists "marcas propias" on public.marcas;
create policy "marcas propias" on public.marcas
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Correcciones personales del texto (errores de OCR) --------------
create table if not exists public.correcciones (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  libro    text not null,
  cap      int  not null,
  vers     int  not null,
  texto    text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, libro, cap, vers)
);
alter table public.correcciones enable row level security;
drop policy if exists "correcciones propias" on public.correcciones;
create policy "correcciones propias" on public.correcciones
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Almacenamiento privado (texto Nácar-Colunga y Catena Aurea) ---------------
insert into storage.buckets (id, name, public)
values ('biblia', 'biblia', false)
on conflict (id) do nothing;

drop policy if exists "leer biblia (usuarios con sesión)" on storage.objects;
create policy "leer biblia (usuarios con sesión)" on storage.objects
  for select to authenticated
  using (bucket_id = 'biblia');

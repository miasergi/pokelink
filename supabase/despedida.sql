-- Marcador compartido de la despedida de Óscar.
create table if not exists public.despedida (
  id text primary key,
  estado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.despedida enable row level security;

-- Lectura para cualquiera: el marcador es público, esa es la gracia.
drop policy if exists "despedida lectura" on public.despedida;
create policy "despedida lectura" on public.despedida
  for select using (true);

-- Escritura abierta pero SOLO sobre la fila del evento: no se pueden crear
-- filas nuevas ni borrar nada. El cerrojo de verdad es el PIN del juez, que
-- vive en el cliente; esto solo evita que la tabla acabe de vertedero.
drop policy if exists "despedida alta" on public.despedida;
create policy "despedida alta" on public.despedida
  for insert with check (id = 'oscar26');

drop policy if exists "despedida cambio" on public.despedida;
create policy "despedida cambio" on public.despedida
  for update using (id = 'oscar26') with check (id = 'oscar26');

-- La marca de tiempo la pone el SERVIDOR: siete móviles con siete relojes
-- distintos no son base para decidir qué escritura es la última.
create or replace function public.despedida_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists despedida_touch on public.despedida;
create trigger despedida_touch before update on public.despedida
  for each row execute function public.despedida_touch();

-- La fila del evento, para que la primera lectura no venga vacía.
insert into public.despedida (id, estado) values ('oscar26', '{}'::jsonb)
  on conflict (id) do nothing;

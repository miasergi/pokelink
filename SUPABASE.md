# Cuentas en la nube con Supabase (opcional)

El juego funciona en **local** por defecto (cada dispositivo guarda su progreso).
Si quieres **cuentas reales** (mismo progreso en varios dispositivos, sincronización
del historial), sigue estos pasos. Es **gratis**.

## 1. Crear el proyecto
1. Entra en https://supabase.com → **New project** (plan Free).
2. Apunta de **Project Settings → API**:
   - **Project URL** (algo como `https://xxxx.supabase.co`).
   - **anon public key** (la clave `anon`, es pública: segura para el front).

## 2. Crear la tabla y la seguridad (RLS)
En **SQL Editor**, pega y ejecuta esto:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  meta jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario solo puede ver/editar su propia fila
create policy "own row - select" on public.profiles
  for select using (auth.uid() = id);
create policy "own row - upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own row - update" on public.profiles
  for update using (auth.uid() = id);
```

## 3. (Recomendado) Quitar la confirmación por email
Para que registrarse entre directo sin tener que confirmar el correo:
**Authentication → Providers → Email → desactiva "Confirm email"**.

## 4. Conectar la app
- **En local**: crea un archivo `.env` (copia de `.env.example`) con:
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ... (anon key)
  ```
- **En el deploy (GitHub Pages)**: en el repo, **Settings → Secrets and variables →
  Actions → Variables**, crea:
  - `SUPABASE_URL` = la Project URL
  - `SUPABASE_ANON_KEY` = la anon key
  (El workflow ya las usa al construir.)

## Listo
Al volver a desplegar, aparecerá **Ajustes → ☁️ Cuenta** para registrarse/iniciar
sesión. El historial (récords, Pokédex, Glory Runs) se sincroniza al terminar cada
partida. Si las claves están vacías, todo sigue funcionando en local.

-- migration_019_validar_checks_y_cascada.sql
-- Objetivo:
--   1. Corrige el check de teléfono de la 018 (no aceptaba texto vacío).
--   2. Valida los tres checks de formato añadidos en la 018 (ya verificado que los datos cumplen).
--   3. Hace que borrar un empleado de la oficina no rompa derivaciones ni postulaciones
--      (on delete set null en revisado_por y municipalidad_usuario_id).
--   4. Vincula public.usuarios con auth.users con borrado en cascada.
--
-- Idempotente: drop ... if exists antes de cada add/constraint.
-- Puede correrse dos veces sin error.

-- ============================================================
-- BLOQUE 0 — Corrección del check de teléfono
-- Corrige un error de la 018: el check anterior rechazaba '' (cadena vacía),
-- pero el teléfono es opcional y el trigger de registro (migration_006) guarda ''
-- cuando el usuario no lo ingresa. Esto causaba fallo en registros sin teléfono
-- y en ediciones de perfil de quienes no lo tienen.
-- ============================================================

alter table public.usuarios drop constraint if exists usuarios_telefono_formato;

alter table public.usuarios
  add constraint usuarios_telefono_formato
    check (telefono is null or telefono = '' or telefono ~ '^[+0-9 \-]{8,15}$') not valid;

-- ============================================================
-- BLOQUE 1 — Validar los checks de formato
-- Los datos existentes ya fueron verificados: ninguna fila incumple.
-- Esto convierte los NOT VALID en fully enforced para filas nuevas y existentes.
-- ============================================================

alter table public.postulantes validate constraint postulantes_dni_formato;
alter table public.empresas    validate constraint empresas_cuit_formato;
alter table public.usuarios    validate constraint usuarios_telefono_formato;

-- ============================================================
-- BLOQUE 2 — Usuarios de la oficina: on delete set null
-- Sin esta acción, borrar una cuenta de empleado municipal falla por las FK
-- not-null que apuntan a usuarios desde derivaciones y postulaciones.
-- Se pasa municipalidad_usuario_id a nullable para que el set null sea válido.
-- ============================================================

-- derivaciones.municipalidad_usuario_id
-- Nombre convencional del constraint creado en migration_001_schema.sql:
--   derivaciones_municipalidad_usuario_id_fkey
-- Consulta para verificar: select conname from pg_constraint
--   where conrelid = 'public.derivaciones'::regclass and contype = 'f';

alter table public.derivaciones
  drop constraint if exists derivaciones_municipalidad_usuario_id_fkey;

-- Quitar not null para que on delete set null pueda poner null
alter table public.derivaciones
  alter column municipalidad_usuario_id drop not null;

alter table public.derivaciones
  add constraint derivaciones_municipalidad_usuario_id_fkey
    foreign key (municipalidad_usuario_id)
    references public.usuarios(id)
    on delete set null;

-- postulaciones.revisado_por
-- Nombre convencional del constraint creado en migration_017:
--   postulaciones_revisado_por_fkey
-- Consulta para verificar: select conname from pg_constraint
--   where conrelid = 'public.postulaciones'::regclass and contype = 'f'
--   and conname like '%revisado%';

alter table public.postulaciones
  drop constraint if exists postulaciones_revisado_por_fkey;

-- revisado_por ya es nullable (se añadió sin not null en migration_017)
alter table public.postulaciones
  add constraint postulaciones_revisado_por_fkey
    foreign key (revisado_por)
    references public.usuarios(id)
    on delete set null;

-- ============================================================
-- BLOQUE 3 — Vincular public.usuarios con auth.users (borrado en cascada)
-- Sin esta FK, borrar una cuenta en Supabase Auth dejaba la fila en usuarios
-- suelta (y en cascada: perfil de postulante/empresa, archivos, postulaciones,
-- derivaciones). Con on delete cascade, al borrar el registro en auth.users
-- se elimina toda la cadena automáticamente.
-- ============================================================

alter table public.usuarios
  drop constraint if exists usuarios_id_auth_fkey;

alter table public.usuarios
  add constraint usuarios_id_auth_fkey
    foreign key (id)
    references auth.users(id)
    on delete cascade;

-- ============================================================
-- VERIFICACIÓN (ejecutar manualmente tras aplicar la migración)
-- ============================================================

-- Usuarios en public.usuarios sin cuenta en auth.users (deben ser 0):
-- select id from public.usuarios where id not in (select id from auth.users);

-- Nota: los archivos en Storage (cvs/, avatares/) NO se borran con esta cascada;
-- queda pendiente para cuando se implemente la baja de cuenta desde la app.

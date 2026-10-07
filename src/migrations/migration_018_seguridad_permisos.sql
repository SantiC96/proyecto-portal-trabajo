-- migration_018_seguridad_permisos.sql
-- Cierra cuatro clases de riesgo:
--   A) Permisos por columna: evita que usuarios toquen campos sensibles aunque RLS les permita editar su fila.
--   B) Políticas de postulaciones: el INSERT no puede fijar el estado; el DELETE solo en estado 'recibida'.
--   C) Derivaciones: elimina acceso de empresas (se restaura cuando exista ofertas.empresa_id).
--   D) Lectura de municipalidad: archivos_usuario y storage para URLs firmadas sin service role.
--   E) emails_de_usuarios: reemplaza listUsers/getUserById sin el límite de 1000 registros.
--   F) Checks de formato como tercera barrera (NOT VALID para no romper datos existentes).

-- ============================================================
-- BLOQUE A — Permisos por columna
-- ============================================================

-- usuarios: riesgo — la política "editar propio perfil" permite UPDATE sin restricción de columnas,
-- lo que habilita cambiar usuarios.rol desde el cliente.
revoke update on public.usuarios from authenticated;
grant update (nombre, apellido, telefono) on public.usuarios to authenticated;

-- postulantes: misma situación; limitamos a los campos que el postulante puede editar.
revoke update on public.postulantes from authenticated;
grant update (dni, domicilio) on public.postulantes to authenticated;

-- empresas: municipalidad también es 'authenticated', necesita actualizar las columnas de
-- aprobación. El trigger prevent_empresa_estado_change (migration_011) bloquea a los
-- no-municipalidad en ejecución; aquí solo limitamos las columnas de negocio.
revoke update on public.empresas from authenticated;
grant update (razon_social, descripcion, rubro,
              estado_aprobacion, fecha_decision, motivo_rechazo)
  on public.empresas to authenticated;

-- postulaciones INSERT: riesgo — el cliente podía fijar estado = 'en_revision' o cualquier otro
-- valor al postularse. Con este grant solo (oferta_id, postulante_id), el estado siempre
-- toma el DEFAULT 'recibida' definido en la tabla.
revoke insert on public.postulaciones from authenticated;
grant insert (oferta_id, postulante_id) on public.postulaciones to authenticated;

-- postulaciones UPDATE: solo la oficina municipal escribe las columnas de gestión; un postulante
-- o empresa autenticado no puede alterar estado, notas ni revisor aunque supere RLS.
revoke update on public.postulaciones from authenticated;
grant update (estado, nota_oficina, revisado_por, updated_at)
  on public.postulaciones to authenticated;

-- ============================================================
-- BLOQUE B — Políticas de postulaciones
-- ============================================================

-- INSERT: riesgo — la política anterior no verificaba que la oferta existiera ni que estuviera activa,
-- lo que permitía postularse a ofertas cerradas o inexistentes.
drop policy if exists "postulaciones: postular" on public.postulaciones;
create policy "postulaciones: postular" on public.postulaciones
  for insert with check (
    exists (
      select 1 from public.postulantes
      where id = postulante_id and usuario_id = auth.uid()
    )
    and exists (
      select 1 from public.ofertas
      where id = oferta_id and estado = 'activa'
    )
  );

-- DELETE: riesgo — la política anterior permitía retirar una postulación en cualquier estado,
-- incluidas las que ya estaban siendo revisadas o derivadas.
drop policy if exists "postulaciones: retirar" on public.postulaciones;
drop policy if exists "postulaciones: retirar (postulante)" on public.postulaciones;
create policy "postulaciones: retirar (postulante)" on public.postulaciones
  for delete using (
    exists (
      select 1 from public.postulantes
      where id = postulante_id and usuario_id = auth.uid()
    )
    and estado = 'recibida'
  );

-- ============================================================
-- BLOQUE C — Derivaciones: acceso restringido a municipalidad
-- ============================================================

-- Riesgo: la política anterior daba SELECT a cualquier empresa sobre todas las derivaciones.
-- El acceso por empresa se reincorporará cuando exista ofertas.empresa_id.
drop policy if exists "derivaciones: ver (empresa o municipalidad)" on public.derivaciones;
drop policy if exists "derivaciones: ver (municipalidad)" on public.derivaciones;
create policy "derivaciones: ver (municipalidad)" on public.derivaciones
  for select using (public.rol_actual() = 'municipalidad');

-- ============================================================
-- BLOQUE D — Lectura de municipalidad para archivos y storage
-- ============================================================

-- archivos_usuario: la política existente solo permite al dueño leer sus propios archivos.
-- La oficina necesita leer archivos para generar URLs firmadas sin usar service role.
drop policy if exists "archivos_usuario: municipalidad lee todos" on public.archivos_usuario;
create policy "archivos_usuario: municipalidad lee todos"
  on public.archivos_usuario for select
  using (public.rol_actual() = 'municipalidad');

-- storage cvs: ídem para el bucket de CVs.
-- (La política existente solo permite acceso por carpeta de usuario.)
drop policy if exists "cvs: municipalidad lee todos" on storage.objects;
create policy "cvs: municipalidad lee todos"
  on storage.objects for select
  using (bucket_id = 'cvs' and public.rol_actual() = 'municipalidad');

-- storage avatares: ídem para el bucket de avatares.
drop policy if exists "avatares: municipalidad lee todos" on storage.objects;
create policy "avatares: municipalidad lee todos"
  on storage.objects for select
  using (bucket_id = 'avatares' and public.rol_actual() = 'municipalidad');

-- Nota: postulante_categorias ya incluye la cláusula `rol_actual() = 'municipalidad'`
-- en la política "ver propias" de migration_004. No se duplica.

-- ============================================================
-- BLOQUE E — emails_de_usuarios (reemplaza listUsers / getUserById)
-- ============================================================

-- Riesgo: listUsers({ perPage: 1000 }) falla silenciosamente cuando hay más de 1000 registros.
-- getUserById requiere service role. Esta función leen solo los ids pedidos, sin límite
-- implícito, y solo responde a municipalidad.
create or replace function public.emails_de_usuarios(ids uuid[])
returns table (id uuid, email text)
language sql security definer set search_path = '' as $$
  select au.id, au.email::text
  from auth.users au
  where au.id = any(ids)
    and public.rol_actual() = 'municipalidad'
$$;

revoke execute on function public.emails_de_usuarios(uuid[]) from public, anon;
grant execute on function public.emails_de_usuarios(uuid[]) to authenticated;

-- ============================================================
-- BLOQUE F — Checks de formato (NOT VALID)
-- ============================================================

-- Se agregan NOT VALID para no validar filas existentes que puedan no cumplir el formato.
-- Ejecutar los VALIDATE cuando los datos estén limpios (ver consultas al pie).

-- dni: solo números, 7 u 8 dígitos.
alter table public.postulantes drop constraint if exists postulantes_dni_formato;
alter table public.postulantes
  add constraint postulantes_dni_formato
    check (dni ~ '^[0-9]{7,8}$') not valid;

-- cuit: formato XX-XXXXXXXX-X o XXXXXXXXXXX (con o sin guiones).
alter table public.empresas drop constraint if exists empresas_cuit_formato;
alter table public.empresas
  add constraint empresas_cuit_formato
    check (cuit ~ '^[0-9]{2}-?[0-9]{8}-?[0-9]$') not valid;

-- telefono: solo dígitos, espacios, guiones y +, entre 8 y 15 caracteres.
alter table public.usuarios drop constraint if exists usuarios_telefono_formato;
alter table public.usuarios
  add constraint usuarios_telefono_formato
    check (telefono is null or telefono ~ '^[+0-9 \-]{8,15}$') not valid;

-- ── Ejecutar cuando los datos estén limpios ──────────────────────────────────
-- alter table public.postulantes validate constraint postulantes_dni_formato;
-- alter table public.empresas validate constraint empresas_cuit_formato;
-- alter table public.usuarios validate constraint usuarios_telefono_formato;

-- ── Detectar filas que no cumplen actualmente ────────────────────────────────
-- select id, dni from public.postulantes where dni !~ '^[0-9]{7,8}$';
-- select id, cuit from public.empresas where cuit !~ '^[0-9]{2}-?[0-9]{8}-?[0-9]$';
-- select id, telefono from public.usuarios
--   where telefono is not null and telefono !~ '^[+0-9 \-]{8,15}$';

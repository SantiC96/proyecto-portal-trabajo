-- ============================================================
-- Migración 010 — Restringe la función activar_archivo_usuario
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- La función es SECURITY DEFINER y recibe el usuario_id por
-- parámetro: solo debe poder llamarla el servidor (service_role),
-- nunca un usuario desde el navegador.
-- ============================================================

revoke execute on function public.activar_archivo_usuario(uuid, text, text, text, bigint)
  from public, anon, authenticated;

grant execute on function public.activar_archivo_usuario(uuid, text, text, text, bigint)
  to service_role;
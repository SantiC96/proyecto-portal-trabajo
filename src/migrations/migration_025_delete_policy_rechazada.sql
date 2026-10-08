-- ============================================================
-- Portal Municipal de Empleo — Migración 025
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_024_bloquear_edicion_pendiente_y_eliminar_envio.sql aplicada.
-- ============================================================
-- Extiende la policy DELETE de empresa en ofertas para incluir
-- el estado 'rechazada' además de 'pendiente_aprobacion'.
--
-- Una oferta rechazada nunca se publicó, por lo tanto no puede
-- tener postulaciones. La condición oferta_sin_postulaciones(id)
-- se mantiene como defensa en profundidad.
--
-- Reutiliza la función SECURITY DEFINER oferta_sin_postulaciones
-- definida en migration_024 para evitar ciclos de policies entre
-- ofertas y postulaciones.
-- ============================================================

drop policy if exists "ofertas: eliminar (empresa propia, pendiente, sin postulaciones)" on public.ofertas;

create policy "ofertas: eliminar (empresa propia, pendiente o rechazada, sin postulaciones)"
  on public.ofertas for delete
  using (
    public.rol_actual() = 'empresa'
    and empresa_id = (select id from public.empresas where usuario_id = auth.uid())
    and estado in ('pendiente_aprobacion', 'rechazada')
    and public.oferta_sin_postulaciones(id)
  );

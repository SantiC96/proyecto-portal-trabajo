-- ============================================================
-- Portal Municipal de Empleo — Migración 067
-- Limpieza: funciones de la base que quedaron sin uso
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Requiere migration_066_indicadores_comparados.sql ya aplicada.
-- Re-ejecutable sin errores. No borra tablas, columnas ni datos.
-- Después de aplicarla: npm run db:tipos
-- ============================================================
--
-- Borra tres funciones que ya no llama nada: ni el código (src/, .rpc) ni
-- otras funciones, triggers, vistas o políticas de las migraciones.
--
--   postulaciones_por_mes()                         (047)
--     Gráfico de los últimos 12 meses. La reemplazó postulaciones_por_periodo
--     (061) y después series_indicadores (066).
--
--   postulaciones_por_periodo(timestamptz, text)    (061)
--     Gráfico de postulaciones por día, semana o mes. La reemplazó
--     series_indicadores (066), que trae la misma serie y otras más.
--
--   actualizar_mi_perfil_postulante(text × 5)       (040)
--     Versión vieja de 5 parámetros (nombre, apellido, teléfono, domicilio,
--     DNI). La 046 creó la de 9 parámetros (con la información laboral) con
--     CREATE FUNCTION, así que las dos conviven como sobrecargas. La acción
--     del perfil llama a la de 9, que no se toca.
--
-- Sin CASCADE: si algo dependiera de alguna, el DROP falla y la transacción
-- no borra nada.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.postulaciones_por_mes();

DROP FUNCTION IF EXISTS public.postulaciones_por_periodo(timestamptz, text);

DROP FUNCTION IF EXISTS public.actualizar_mi_perfil_postulante(text, text, text, text, text);

COMMIT;

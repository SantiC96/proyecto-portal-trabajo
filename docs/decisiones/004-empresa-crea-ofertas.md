# 004 — Las empresas crean ofertas; la municipalidad las aprueba

## Contexto

El esquema inicial de `ofertas` fue diseñado asumiendo que la municipalidad carga todas las ofertas. La columna `empresa_nombre` era texto libre y no tenía FK a `empresas`, lo que impedía asociar una oferta a un usuario de empresa real.

## Decisión

Las empresas aprobadas pueden crear sus propias ofertas. La Oficina de Empleo las revisa y decide si publicarlas o rechazarlas.

## Flujo

```
Empresa crea oferta → estado: 'pendiente_aprobacion'
  → Municipalidad aprueba → estado: 'activa'  (se publica)
  → Municipalidad rechaza → estado: 'rechazada' (con nota opcional)

Empresa edita oferta (activa o pendiente) → vuelve a 'pendiente_aprobacion'
Empresa cierra oferta (activa o pendiente) → estado: 'cerrada'

Municipalidad también puede crear ofertas directamente en cualquier estado.
```

## Decisiones de implementación

- **Editar una oferta publicada la vuelve a revisión**: al editar una oferta `activa`, el estado pasa a `pendiente_aprobacion` y se limpia `motivo_rechazo`. El formulario muestra un aviso cuando la oferta ya estaba publicada.
- **Solo publican empresas aprobadas**: el insert RLS verifica `estado_aprobacion = 'aprobada'` en la tabla `empresas`. Una empresa pendiente o rechazada no puede crear ofertas.
- **empresa_id**: asocia cada oferta a la empresa dueña. Nullable para no romper ofertas de ejemplo ya existentes sin empresa.
- **empresa_nombre**: se guarda como texto en el momento de creación (razón social en ese instante), por consistencia con el modelo de `ofertas` existente.
- **Permisos por columna**: `empresa_id` no es actualizable por `authenticated`; `motivo_rechazo` es actualizable solo por la municipalidad (protegido por trigger `prevent_empresa_oferta_campos`).

## Estado

**Etapa 1 implementada** (migración 021): carga y gestión de ofertas por las empresas.

**Etapa 2 pendiente**: revisión de la oficina (aprobar / rechazar ofertas pendientes desde el panel admin).

---

## Eliminación del campo `destacada` (migración 016)

El campo `destacada` (agregado en `migration_007`) fue eliminado del código en la rama `feat/postulaciones`:
- Removido del tipo `OfertaLaboral` (`src/types/oferta.ts`).
- Removido del select, `DbOfertaRow` y `mapRow` en `src/lib/ofertas.ts`.
- Removido del badge visual en `job-card.tsx` y `src/app/ofertas/[id]/page.tsx`.
- Removido de los inserts en `seed_ofertas.sql`.

La columna física se elimina con `migration_016_quitar_destacada.sql`, que debe ejecutarse **después** de que el código sin `destacada` esté publicado en producción (Vercel). Ejecutarla antes rompe el listado de ofertas.

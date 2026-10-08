# 004 — Las empresas crean ofertas; la municipalidad las aprueba

## Contexto

El esquema inicial de `ofertas` fue diseñado asumiendo que la municipalidad carga todas las ofertas. La columna `empresa_nombre` era texto libre y no tenía FK a `empresas`, lo que impedía asociar una oferta a un usuario de empresa real.

## Decisión

Las empresas aprobadas pueden crear sus propias ofertas. La Oficina de Empleo las revisa y decide si publicarlas o rechazarlas.

## Flujo completo

```
Empresa crea oferta → estado: 'pendiente_aprobacion'
  → Municipalidad aprueba → estado: 'activa'  (se publica; se fija publicado_en)
  → Municipalidad rechaza → estado: 'rechazada' (con motivo obligatorio)

Empresa ve motivo, edita oferta rechazada → vuelve a 'pendiente_aprobacion'
  (motivo_rechazo se limpia al editar)

Empresa edita oferta activa → vuelve a 'pendiente_aprobacion'
  (postulaciones existentes quedan bloqueadas hasta re-aprobación)
Empresa cierra oferta (activa o pendiente con postulaciones) → estado: 'cerrada'

Municipalidad re-aprueba → estado: 'activa'
  (publicado_en no se sobreescribe; se conserva la fecha original)
  (postulaciones vuelven a poderse derivar y rechazar normalmente)

Municipalidad también puede crear ofertas directamente en cualquier estado.
```

## Decisiones de implementación

- **Editar una oferta publicada la vuelve a revisión**: al editar una oferta `activa`, el estado pasa a `pendiente_aprobacion` y se limpia `motivo_rechazo`. El formulario muestra un aviso cuando la oferta ya estaba publicada.
- **Solo publican empresas aprobadas**: el insert RLS verifica `estado_aprobacion = 'aprobada'` en la tabla `empresas`. Una empresa pendiente o rechazada no puede crear ofertas.
- **empresa_id**: asocia cada oferta a la empresa dueña. Nullable para no romper ofertas de ejemplo ya existentes sin empresa.
- **empresa_nombre**: se guarda como texto en el momento de creación (razón social en ese instante), por consistencia con el modelo de `ofertas` existente.
- **Permisos por columna**: `empresa_id` no es actualizable por `authenticated`; `motivo_rechazo`, `publicado_en`, `revisado_por` y `revisado_en` están protegidos por el trigger `prevent_empresa_oferta_campos` para que el rol `empresa` no pueda modificarlos aunque tenga permiso de columna.
- **publicado_en**: se fija la primera vez que se aprueba la oferta y no se sobreescribe en re-aprobaciones. La vista pública (`/ofertas/[id]`) usa este campo como fecha de publicación, con fallback a `created_at` para ofertas sin datos de migración.
- **revisado_por / revisado_en**: registran quién tomó la decisión y cuándo.
- **Motivo de rechazo obligatorio**: la server action `rechazarOferta` valida que el motivo no esté vacío antes de actualizar. La empresa ve el motivo en su panel de ofertas.
- **Postulaciones bloqueadas mientras pendiente**: `FichaAcciones` en el panel de postulaciones muestra un aviso y deshabilita derivar/rechazar cuando `oferta.estado === 'pendiente_aprobacion'`. Al re-aprobar, las postulaciones vuelven a poderse gestionar normalmente.

## Seguridad: quién puede poner una oferta en 'activa'

Solo la municipalidad puede hacerlo. Tres capas de protección:

1. **RLS WITH CHECK** en `"ofertas: actualizar (empresa propia)"` solo permite
   `estado in ('pendiente_aprobacion', 'cerrada')`. La empresa no puede escribir `activa` por esta vía.
2. **Trigger `prevent_empresa_oferta_campos_fn`** bloquea que empresa escriba
   `publicado_en`, `revisado_por`, `revisado_en` y `motivo_rechazo`, incluso con grant de columna.
3. **Server action `aprobarOferta`** verifica `rol_actual() = 'municipalidad'` en el servidor
   antes de ejecutar el UPDATE.

## Estado

**Etapa 1** (migraciones 020–025): carga y gestión de ofertas por las empresas; RLS y permisos por columna.

**Etapa 2** (migración 026): revisión de la oficina implementada. Panel `/admin/ofertas` con listado, filtros y ficha de decisión.

---

## Eliminación del campo `destacada` (migración 016)

El campo `destacada` (agregado en `migration_007`) fue eliminado del código en la rama `feat/postulaciones`:
- Removido del tipo `OfertaLaboral` (`src/types/oferta.ts`).
- Removido del select, `DbOfertaRow` y `mapRow` en `src/lib/ofertas.ts`.
- Removido del badge visual en `job-card.tsx` y `src/app/ofertas/[id]/page.tsx`.
- Removido de los inserts en `seed_ofertas.sql`.

La columna física se elimina con `migration_016_quitar_destacada.sql`, que debe ejecutarse **después** de que el código sin `destacada` esté publicado en producción (Vercel). Ejecutarla antes rompe el listado de ofertas.

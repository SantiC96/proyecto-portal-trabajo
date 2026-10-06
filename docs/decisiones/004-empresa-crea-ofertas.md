# 004 — Las empresas crean ofertas; la municipalidad las aprueba

## Contexto

El esquema inicial de `ofertas` fue diseñado asumiendo que la municipalidad carga todas las ofertas. La columna `empresa_nombre` es texto libre y no hay FK a `empresas`, lo que impide asociar una oferta a un usuario de empresa real.

## Decisión

Las empresas pueden crear sus propias ofertas. La municipalidad las revisa y decide si publicarlas o rechazarlas.

## Flujo

```
Empresa crea oferta → estado: 'pendiente_aprobacion'
  → Municipalidad aprueba → estado: 'activa'  (se publica)
  → Municipalidad rechaza → estado: 'rechazada' (con nota opcional)

Municipalidad también puede crear ofertas directamente en cualquier estado.
```

## Cambios de esquema necesarios (pendiente de implementación)

```sql
-- Vincular cada oferta a la empresa que la creó
alter table ofertas add column empresa_id uuid references empresas(id);

-- Nuevos estados
-- borrador | pendiente_aprobacion | activa | rechazada | cerrada
```

La columna `empresa_nombre` puede eliminarse una vez que exista la FK — el nombre se obtiene del join con `empresas`.

## Impacto en RLS

Con `empresa_id` disponible, las políticas de RLS pueden restringir a cada empresa para que solo vea y edite sus propias ofertas. Hoy eso no es posible (limitación documentada en `migration_004_rls.sql`).

## Estado

Pendiente de implementación. Requiere una nueva migración y actualización de Server Actions y vistas.

---

## Eliminación del campo `destacada` (migración 016)

El campo `destacada` (agregado en `migration_007`) fue eliminado del código en la rama `feat/postulaciones`:
- Removido del tipo `OfertaLaboral` (`src/types/oferta.ts`).
- Removido del select, `DbOfertaRow` y `mapRow` en `src/lib/ofertas.ts`.
- Removido del badge visual en `job-card.tsx` y `src/app/ofertas/[id]/page.tsx`.
- Removido de los inserts en `seed_ofertas.sql`.

La columna física se elimina con `migration_016_quitar_destacada.sql`, que debe ejecutarse **después** de que el código sin `destacada` esté publicado en producción (Vercel). Ejecutarla antes rompe el listado de ofertas.

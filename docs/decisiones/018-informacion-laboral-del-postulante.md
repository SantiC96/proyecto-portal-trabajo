# 018 — Información laboral del postulante

**Fecha:** 2026-10-17
**Estado:** Vigente
**Migración:** `migration_046_varios_cursos_e_informacion_laboral.sql` (bloques 6 a 9)

---

## Contexto

El perfil del postulante tenía datos de contacto, DNI, domicilio, rubros y CV, pero nada sobre su formación, su situación actual, su disponibilidad ni su experiencia. La oficina lo preguntaba en la pre-entrevista y la empresa no lo veía.

---

## Decisiones tomadas

### 1. Columnas en `postulantes`, todas opcionales

| Columna | Tipo | Valores |
|---|---|---|
| `nivel_educativo` | `text` + `CHECK` | `primario_incompleto`, `primario_completo`, `secundario_incompleto`, `secundario_completo`, `terciario_incompleto`, `terciario_completo`, `universitario_incompleto`, `universitario_completo` |
| `situacion_laboral` | `text` + `CHECK` | `desempleado`, `empleado`, `independiente`, `estudiante`, `otro` |
| `disponibilidad` | `text` + `CHECK` | `manana`, `tarde`, `noche`, `completa`, `flexible` |
| `experiencia_laboral` | `text` + `CHECK` | hasta 2000 caracteres |

- `NULL` = sin completar. Las filas existentes quedaron en `NULL`.
- `text` con `CHECK` (no enums), igual que `asignaciones_curso.estado` (decisión 012): agregar un valor es reemplazar el `CHECK`.
- Los valores y sus etiquetas ("Secundario completo", "Jornada completa", …) se repiten en `src/lib/informacion-laboral.ts`. Si cambian en la base hay que cambiarlos ahí.
- **No se piden en el registro**: el registro sigue siendo corto y el postulante los completa después en Mi perfil.

### 2. Permisos

- `GRANT UPDATE (nivel_educativo, situacion_laboral, disponibilidad, experiencia_laboral)` a `authenticated`, sumado a `(dni, domicilio)` de la 018. La fila la sigue limitando la política "postulantes: editar propio perfil" (004).
- La aplicación no escribe la tabla directo: `actualizar_mi_perfil_postulante` guarda los datos personales y la información laboral **en la misma transacción** (si el DNI está repetido no se guarda nada). Cambió la firma (4 parámetros más): se borró la versión de 5 parámetros y se creó la nueva. Un texto vacío se guarda como `NULL`.
- Validación en tres capas: el formulario (selects con valores cerrados, `maxLength` y contador), la server action `actualizarPerfil` (`validarInformacionLaboral`) y los `CHECK`.

### 3. Quién la ve

| Rol | Dónde | Cómo |
|---|---|---|
| Postulante | Mi perfil, dentro de la tarjeta "Datos personales", sección "Información laboral" | Se edita con "Editar datos" y se guarda con "Guardar datos" |
| Oficina | Ficha `admin/postulantes/[id]` | Lee la tabla (RLS de 004) con `obtenerCandidato` |
| Empresa | Ficha del candidato derivado (`empresa/ofertas/[id]/candidatos/[derivacionId]`) y perfil completo (`empresa/candidatos/[postulanteId]`) | `candidato_para_empresa` y `candidato_para_empresa_completo`, con el mismo control de acceso de siempre (derivado alguna vez a la empresa o guardado por ella). Cambió el retorno: se borraron y se volvieron a crear |

- Los campos vacíos se muestran **siempre** como "Sin completar" (componente común `InformacionLaboralResumen`), para que la oficina y la empresa sepan que el dato falta y no que se perdió.
- La empresa sigue sin ver DNI, domicilio ni notas internas.

---

## Seguimiento del postulante (misma entrega)

En `admin/postulantes/[id]` (decisión 012, historiales paginados):

- **Rechazos de empresas:** cada rechazo muestra el motivo que informó la empresa (`derivaciones.nota_empresa`), o "Sin motivo informado" en los rechazos viejos que no lo tienen.
- **Pre-entrevistas:** en el historial de postulaciones, cada postulación muestra su pre-entrevista (estado, fecha y hora, lugar y la nota interna) o "Sin pre-entrevista". Se eligió esto en lugar de una sección propia porque hay una pre-entrevista por postulación (decisión 017): verla junto a la postulación evita repetir oferta y empresa en otra lista paginada. La nota interna se muestra porque esta pantalla es solo de la oficina.

---

## Archivos clave

```
src/migrations/migration_046_varios_cursos_e_informacion_laboral.sql
src/lib/informacion-laboral.ts                          — valores, etiquetas y validación
src/components/postulantes/informacion-laboral-resumen.tsx
src/app/(dashboard)/perfil/actions.ts                   — actualizarPerfil
src/app/(dashboard)/perfil/perfil-form.tsx
src/lib/admin/candidato.ts                              — obtenerCandidato
src/app/admin/postulantes/[id]/page.tsx
src/app/empresa/(panel)/ofertas/[id]/candidatos/[derivacionId]/page.tsx
src/app/empresa/(panel)/candidatos/[postulanteId]/page.tsx
```

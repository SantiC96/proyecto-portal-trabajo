# 007 — Acceso de la empresa a los datos del candidato

**Fecha:** 2026-10-12  
**Estado:** Vigente

---

## Contexto

Cuando la Oficina de Empleo deriva una postulación a una empresa, la empresa
necesita ver los datos de contacto del candidato y coordinar entrevistas. Sin
embargo:

- La empresa **no tiene** `SELECT` directo sobre `postulantes`, `usuarios` ni
  `postulaciones` (removido en migration_015 para proteger el padrón).
- Las políticas RLS de `derivaciones` requieren atravesar
  `derivaciones → postulaciones → ofertas → empresas`, pero `empresa` no puede
  hacer ese join porque no ve `postulaciones`.
- Los datos personales del candidato (DNI, domicilio) nunca deben llegar a la
  empresa.

## Decisión

Toda la interacción empresa–candidato se canaliza a través de **funciones
PostgreSQL `SECURITY DEFINER`** con `SET search_path = ''`:

| Función | Propósito |
|---------|-----------|
| `empresa_propietaria_de_derivacion(derivacion_id)` | Verifica que la derivación pertenece a una oferta de la empresa autenticada. Usada en la política RLS de UPDATE en `derivaciones`. |
| `derivaciones_de_oferta_empresa(oferta_id)` | Devuelve el listado de derivaciones de una oferta con `postulante_id` y todos los campos propios, **sin** `nota_oficina`. |
| `candidato_para_empresa(postulante_id)` | Devuelve nombre, apellido, email, teléfono y ruta CV. Solo si el postulante fue derivado (actualmente) **o** guardado por esa empresa. Nunca DNI ni domicilio. |
| `empresa_puede_ver_cv(ruta)` | Utilizada en la política Storage del bucket `cvs` para que `createSupabaseServerClient()` pueda generar URLs firmadas sin `supabaseAdmin`. |
| `ofertas_con_candidatos_pendientes()` | Devuelve los IDs de ofertas de la empresa autenticada que tienen candidatos en estado `pendiente`. No devuelve conteos (criterio PR #38). |
| `derivaciones_sin_resultado_empresa(dias)` | (migration_037) Derivaciones de las ofertas de la empresa con la entrevista vencida hace más de `dias` días y sin respuesta (`pendiente` o `en_proceso`), con nombre y apellido del candidato. Alimenta el recordatorio "¿los contrataste?" del panel. |
| `avatares_de_candidatos_para_empresa(postulante_ids)` | (migration_060) Ruta y ajuste (x, y, zoom) de la foto activa de los postulantes de la lista que la empresa puede ver (derivados alguna vez a una oferta suya o guardados, el mismo criterio que `candidato_para_empresa`); los demás ids se ignoran. Hasta 100 ids, una llamada por pantalla (`fotosDeCandidatosEmpresa`, `src/lib/fotos-perfil.ts`). La URL firmada la genera la sesión de la empresa: la política "avatares: empresa lee candidatos derivados o guardados" (`empresa_puede_ver_avatar`, migration_029) ya lo permite para esas fotos, así que no hace falta `supabaseAdmin`. |
| `estado_derivacion_postulante(postulacion_id)` | Solo para el **postulante**: devuelve `estado_empresa`, `fecha_entrevista`, `lugar_entrevista`, `modalidad_entrevista` y `link_entrevista` (las dos últimas desde la 064) de sus propias postulaciones. Nunca `nota_empresa` ni `nota_municipalidad`. |

## Por qué no `supabaseAdmin`

La decisión 005 limita `supabaseAdmin` a Server Actions/Route Handlers donde
**es imprescindible bypassear RLS** (ej.: crear perfil en signup). Las
funciones SECURITY DEFINER son la alternativa correcta cuando el acceso
cruzado es necesario pero la acción debe quedar auditable dentro de la
sesión del usuario.

## Estado de la empresa: máquina de estados

El campo `estado_empresa` en `derivaciones` sigue la siguiente transición, 
aplicada por un BEFORE UPDATE trigger:

```
pendiente → en_proceso (coordinar) | contratado | rechazado
en_proceso → en_proceso (reprogramar) | contratado | rechazado
contratado → (estado final, irreversible por la empresa)
rechazado  → (estado final, irreversible por la empresa)
```

`oferta_retirada` (051) y `retirada_postulante` (053) también son finales y
solo los ponen `retirar_oferta` y `retirar_postulacion`.

**Seleccionar sin entrevista (migration_064).** Entre la 029 y la 063 la
empresa no podía pasar de `pendiente` a `contratado` y solo seleccionaba
desde `en_proceso` después de la fecha de la entrevista. Desde la 064 puede
seleccionar en cualquier momento: sin haber coordinado una entrevista o antes
de la fecha. El límite de vacantes (`derivaciones_limite_vacantes`, 040), el
cierre automático de la oferta (`derivaciones_auto_cerrar_oferta`, 029) y los
avisos de "seleccionado" (al postulante, 051) y de contratación (a la
oficina, 038) miran solo el estado nuevo, así que funcionan igual desde
`pendiente`. Rechazar no cambió: desde `pendiente` o `en_proceso`, con motivo.

**Modalidad de la entrevista (migration_064).** `derivaciones` tiene
`modalidad_entrevista` (`presencial` / `online`, default `presencial`) y
`link_entrevista`. Al coordinar o reprogramar (`en_proceso`) el trigger exige
la fecha, el lugar si es presencial y un link `https://` sin espacios si es
online; un `CHECK` exige el link en las online y lo prohíbe en las
presenciales. La fecha, la modalidad, el lugar y el link solo cambian en
`en_proceso` y con una fecha futura: reprogramar puede cambiar cualquiera de
ellos. Cada cambio avisa al postulante ("Entrevista coordinada" o
"Entrevista reprogramada", con correo) con la fecha, la modalidad y el lugar
o el link. `derivaciones_de_oferta_empresa` devuelve las dos columnas nuevas.

**Pantalla (ficha del candidato, tarjeta "Gestión").** Sin entrevista, el
formulario "Coordinar entrevista" (opcional). Con una coordinada, el cartel
"Entrevista coordinada" con la fecha larga, la modalidad y el lugar o el link
(en otra pestaña), y el botón "Reprogramar" que abre el mismo formulario
precargado, con "Cancelar". Debajo, "Seleccionar" y "No seleccionado", con la
aclaración de que se puede seleccionar en cualquier momento.

La **Oficina de Empleo** puede corregir el estado vía
`corregirEstadoDerivacion` (acción con verificación de rol `municipalidad`).
El trigger no aplica restricciones de rol al rol `service_role` (Supabase
admin), pero la acción de corrección usa `createSupabaseServerClient()` con
el usuario municipal y actualiza el campo directamente — el trigger valida
que el nuevo estado sea uno de los cuatro valores del enum.

## Candidatos guardados

`candidatos_guardados` es una tabla auxiliar que permite a la empresa marcar
perfiles derivados para futuras búsquedas. El `empresa_id` **nunca lo envía
el cliente**: lo fija automáticamente un BEFORE INSERT trigger.
`candidato_para_empresa` incluye también los postulantes guardados en su
condición de acceso, de modo que el perfil sigue visible aunque la derivación
original haya sido archivada.

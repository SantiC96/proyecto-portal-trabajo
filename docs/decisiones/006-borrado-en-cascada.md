# 006 — Borrado en cascada y check de teléfono

## Qué se borra al eliminar una cuenta

Cuando se elimina un registro en `auth.users`, la cascada en `migration_019` borra automáticamente:

- `public.usuarios` (FK `usuarios_id_auth_fkey → auth.users`, on delete cascade)
  - → `postulantes` (on delete cascade desde usuarios)
    - → `postulaciones` (on delete cascade desde postulantes)
      - → `derivaciones` de esas postulaciones (on delete cascade desde postulaciones)
  - → `empresas` (on delete cascade desde usuarios)
    - → rubros de esa empresa
  - → `archivos_usuario` (on delete cascade desde usuarios)

## Qué queda con el campo vacío

Al borrar la cuenta de un **empleado de la oficina municipal**, las filas que ese empleado creó no se borran, pero los campos que lo referencian quedan en null:

- `postulaciones.revisado_por` → `null` (FK con `on delete set null`, migration_019)
- `derivaciones.municipalidad_usuario_id` → `null` (FK con `on delete set null`, migration_019)

La ficha de postulación muestra "Usuario eliminado" cuando `revisado_por` no es null en base de datos pero no se encuentra el usuario correspondiente.

## Qué NO se borra

Los archivos físicos subidos a **Supabase Storage** (`cvs/`, `avatares/`) no se eliminan con esta cascada. La fila en `archivos_usuario` sí desaparece, pero el objeto en el bucket permanece. La limpieza de Storage queda pendiente para cuando se implemente la baja de cuenta desde la app.

## Corrección del check de teléfono (migration_019, Bloque 0)

La migration_018 añadió `usuarios_telefono_formato` como `NOT VALID` con la expresión:

```sql
check (telefono is null or telefono ~ '^[+0-9 \-]{8,15}$')
```

Esto rechaza la cadena vacía `''`. El teléfono es opcional en la app (`validarTelefono` en `src/lib/validaciones.ts` acepta vacío), y el trigger de registro (migration_006) guarda `''` cuando el usuario no ingresa teléfono. El resultado era que los registros sin teléfono y las ediciones de perfil de quienes no lo tienen fallaban con un error de check.

La migration_019 corrige la expresión a:

```sql
check (telefono is null or telefono = '' or telefono ~ '^[+0-9 \-]{8,15}$')
```

El check original ya estaba en `NOT VALID`, así que el fix no requiere validar filas existentes antes de aplicarlo.

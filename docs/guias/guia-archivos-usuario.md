# Guía: Sistema de archivos de usuario

## Cómo funciona

Los archivos subidos por usuarios (CV y foto de perfil) nunca se eliminan del storage de Supabase. En cambio, se registran en la tabla `archivos_usuario` con un campo `activo`. Cuando el usuario "elimina" un archivo, este se marca como inactivo (`activo = false`, `desactivado_en = now()`).

### Tabla `archivos_usuario`

| Columna          | Tipo        | Descripción                              |
|------------------|-------------|------------------------------------------|
| `id`             | uuid        | PK                                       |
| `usuario_id`     | uuid        | FK a `usuarios.id`                       |
| `tipo`           | text        | `'cv'` o `'avatar'`                     |
| `ruta`           | text        | Ruta dentro del bucket de Storage        |
| `nombre_original`| text        | Nombre del archivo tal como lo subió el usuario |
| `tamano`         | bigint      | Tamaño en bytes                          |
| `activo`         | boolean     | `true` = archivo vigente                 |
| `creado_en`      | timestamptz | Fecha de subida                          |
| `desactivado_en` | timestamptz | Fecha de eliminación lógica (nullable)   |

Un índice único parcial sobre `(usuario_id, tipo) WHERE activo = true` garantiza que nunca haya más de un archivo activo del mismo tipo por usuario.

### Flujo de subida

1. El archivo se sube al bucket de Storage con nombre único: `<usuario_id>/cv-<timestamp>.pdf` o `<usuario_id>/avatar-<timestamp>.<ext>`.
2. Se llama a la función RPC `activar_archivo_usuario` que en una sola transacción:
   - Marca como inactivo el archivo activo anterior (si existe).
   - Inserta el nuevo archivo como activo.
3. Si el upload al storage falla, no se llama al RPC y la base de datos no cambia.
4. Si el RPC falla, el archivo queda huérfano en storage pero nunca es referenciado. El archivo anterior permanece activo.

### Flujo de eliminación

Se ejecuta un `UPDATE` sobre `archivos_usuario`:

```sql
UPDATE archivos_usuario
SET activo = false, desactivado_en = now()
WHERE usuario_id = '<id>'
  AND tipo = 'cv'   -- o 'avatar'
  AND activo = true;
```

No se toca el bucket de Storage.

---

## Consultas SQL de administración

### Ver el historial de archivos de un usuario

```sql
SELECT
  id,
  tipo,
  nombre_original,
  tamano,
  activo,
  creado_en,
  desactivado_en
FROM archivos_usuario
WHERE usuario_id = '<uuid-del-usuario>'
ORDER BY creado_en DESC;
```

### Reactivar un archivo inactivo (desactivando el activo actual)

Para restaurar un archivo previamente eliminado:

```sql
BEGIN;

-- Desactivar el activo actual del mismo tipo
UPDATE archivos_usuario
SET activo = false, desactivado_en = now()
WHERE usuario_id = '<uuid-del-usuario>'
  AND tipo = 'cv'   -- o 'avatar'
  AND activo = true;

-- Reactivar el archivo deseado
UPDATE archivos_usuario
SET activo = true, desactivado_en = null
WHERE id = '<uuid-del-archivo-a-reactivar>';

COMMIT;
```

> Nota: el índice único parcial impide tener dos activos simultáneos del mismo tipo.
> Si se intenta activar sin desactivar primero, la transacción falla.

### Listar archivos inactivos con más de 90 días (candidatos a borrado definitivo)

```sql
SELECT
  a.id,
  a.usuario_id,
  u.nombre || ' ' || u.apellido AS usuario,
  a.tipo,
  a.ruta,
  a.nombre_original,
  a.tamano,
  a.desactivado_en
FROM archivos_usuario a
JOIN usuarios u ON u.id = a.usuario_id
WHERE a.activo = false
  AND a.desactivado_en < now() - INTERVAL '90 days'
ORDER BY a.desactivado_en;
```

Para borrar definitivamente esos archivos del bucket habría que:
1. Obtener sus `ruta` con la consulta anterior.
2. Llamar a `supabaseAdmin.storage.from('cvs').remove([...rutas])` o `from('avatares').remove([...rutas])` según el tipo.
3. Eliminar las filas de `archivos_usuario`.

Esto no está implementado en la app y se hace en forma manual o mediante un job programado.

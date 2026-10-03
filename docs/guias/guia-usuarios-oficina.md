# Cómo crear un usuario de la Oficina de Empleo

Los usuarios con rol `municipalidad` no pueden registrarse por el portal público. Se crean manualmente desde el panel de Supabase y se les asigna el rol con una consulta SQL.

---

## Paso 1 — Crear el usuario en Supabase Auth

1. Ir a **Supabase Dashboard → Authentication → Users**
2. Hacer clic en **Add user → Create new user**
3. Ingresar el email y la contraseña del funcionario
4. Marcar **"Auto Confirm User"** (o "Email confirmed") para que la cuenta quede activa sin necesidad de confirmar por email

---

## Paso 2 — Asignar el rol `municipalidad`

El trigger `on_auth_user_created` crea automáticamente una fila en `public.usuarios` con `rol = 'postulante'` (cualquier valor distinto de `'empresa'` en los metadatos del registro queda como postulante). Hay que actualizar esa fila.

Abrir el **SQL Editor** de Supabase y ejecutar:

```sql
-- Asignar rol y completar datos personales.
-- Reemplazar el email, Nombre y Apellido con los valores reales.
UPDATE public.usuarios
SET
  rol      = 'municipalidad',
  nombre   = 'Nombre',
  apellido = 'Apellido'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'nombre@municipio.gob.ar'
);
```

Verificar que se actualizó exactamente 1 fila.

---

## Paso 3 — Verificar acceso

1. Iniciar sesión con las credenciales del funcionario en `/auth/login`
2. Al ingresar, `/inicio` redirige automáticamente a `/admin`
3. El panel muestra el dashboard de la Oficina de Empleo con los conteos de empresas

---

## Notas

- El rol `municipalidad` no puede auto-asignarse por ningún formulario público del portal
- Los cuatro empleados de la oficina comparten el mismo nivel de acceso; repetir este proceso para cada uno
- Si se olvidó el Paso 2, el usuario verá el portal de postulante en lugar de `/admin`. Ejecutar el `UPDATE` corrige el problema sin recrear la cuenta
- Un mismo email no puede tener dos cuentas en Supabase Auth. Si la cuenta ya existe, solo ejecutar el `UPDATE` del Paso 2

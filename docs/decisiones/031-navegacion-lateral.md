# 031 — Navegación lateral por rol

**Fecha:** 2026-10-22
**Estado:** Vigente
**Migración:** ninguna

---

## Contexto

Hasta ahora todas las páginas, incluido el login, tenían una barra superior (`SiteHeader` → `navbar.tsx`) con cuatro links públicos y, a la derecha, la campanita y un menú del usuario que reunía todas las secciones del rol. Abajo de cada página iba el mismo pie (`public-footer.tsx`). Con la cantidad de secciones que fue sumando cada rol (la oficina tiene diez), el menú del usuario se volvió el índice real del portal, escondido detrás de la foto.

Este es el PR 2 de 3 del rediseño (decisión 030): navegación y login. Las páginas internas se ajustan en el PR 3.

---

## Decisiones tomadas

### 1. Una sidebar por rol

`AppShell` (`src/components/layout/app-shell.tsx`) pone a la izquierda una sidebar con las secciones del rol de la sesión, y el contenido ocupa todo el ancho restante. Las secciones salen de una sola lista por rol (`secciones-rol.ts`: label, href, ícono, grupo, variante y contador) que usan la sidebar de escritorio y el panel del celular:

- **Visitante:** Inicio, Ofertas.
- **Postulante:** Inicio, Panel, Ofertas, Mis postulaciones, Invitaciones, Mis cursos, Notificaciones.
- **Empresa:** Inicio, Panel, Mis ofertas, Publicar oferta (destacada en amarillo), Candidatos guardados, Indicadores, Ofertas del portal, Notificaciones.
- **Oficina:** Inicio, Panel; Gestión (Ofertas, Empresas, Postulaciones, Postulantes, Comprobantes), Formación (Cursos), Reportes (Indicadores), Administración (Cuentas de la oficina); separador; Notificaciones.

"Mi perfil" y "Cerrar sesión" quedan en el menú del usuario, al pie. La sección actual es la de prefijo más largo que coincide con la ruta, así `/admin/ofertas/123` marca "Ofertas" y no "Panel".

Motivos: las secciones quedan a la vista en lugar de escondidas en un menú; el ancho de una barra superior no alcanzaba para las diez secciones de la oficina; y en el celular la misma sidebar se abre como panel, así no hay dos navegaciones que mantener. Se borraron `site-header.tsx`, `navbar.tsx` y `public-footer.tsx`.

### 2. Rutas sin navegación

Todo `/auth/*` (login, registro, recuperar y nueva contraseña, reset enviado, verificar email y verificar email de empresa, aceptar invitación, y la redirección de cuenta desactivada) muestra solo su contenido: son pantallas de un solo paso donde la navegación distrae. Usan `AuthShell` (fondo claro, "Volver al inicio" y la tarjeta del login); el login tiene su propio diseño de dos columnas. `not-found` y `error` siguen lo que decide `AppShell` para la ruta: con sidebar fuera de `/auth`.

### 3. La decisión se toma en el cliente con `usePathname`

El layout raíz no se vuelve a renderizar al navegar del lado del cliente. Si el servidor decidiera mostrar o no la navegación leyendo la ruta de un encabezado (`x-ruta-actual`), el resultado quedaría fijo en el de la primera carga: al pasar del login al panel con un `<Link>` la sidebar no aparecería. Por eso `AppShell` es un componente de cliente que llama a `usePathname()` en cada render (`esRutaSinNavegacion`). El layout raíz solo le pasa la sesión.

`AppShell` también se queda con lo que hacía la barra: comprobar en cada navegación que la sesión del servidor coincida con la del navegador (y refrescar si no) y abrir el diálogo de registro con el evento `portal:open-register-modal`.

### 4. Contadores solo para el trabajo pendiente de la oficina

La sidebar de la oficina muestra cuántas ofertas esperan aprobación, cuántas empresas esperan revisión (sin contar las que no confirmaron el email, como el listado de empresas) y cuántos comprobantes de domicilio esperan verificación. Son tareas que la oficina tiene que hacer; el número le dice dónde ir.

- Las consultas son las del panel `/admin` y del listado de empresas, reunidas en `contarPendientesOficina` (`src/lib/admin/pendientes.ts`).
- Como la campanita, los pide una server action liviana (`obtenerPendientesNavegacion` en `src/app/admin/actions.ts`) al montar la sidebar y en cada cambio de ruta, con `useAccion` para no superponer pedidos.
- Si falla, se registra con `logError` y no se muestran contadores; la navegación funciona igual.
- Ninguna otra sección lleva contador (ni Invitaciones ni Notificaciones): las novedades de cada usuario se ven solo en la campanita (decisión 014).

### 5. Sidebar contraída guardada en `localStorage`

En escritorio la sidebar se puede contraer a 72 px (solo íconos, con tooltip). La preferencia es de cada navegador y no hace falta en el servidor, así que va en `localStorage` (`ftl-sidebar-colapsada`) y no en una cookie o en la base. Para que al recargar no se vea la sidebar ancha y después angosta, un script en el `<head>` del layout raíz pone `data-sidebar="colapsada"` en `<html>` antes de pintar (ver la guía de Next "Preventing flash before hydration"), y el CSS resuelve el ancho y lo que se ve con ese atributo. Los componentes leen el mismo atributo con `useSyncExternalStore` (`use-sidebar-colapsada.ts`), que en el servidor y durante la hidratación vale "expandida". El acceso a `localStorage` va en `try/catch`: si no está disponible, la preferencia dura hasta recargar. En el celular el panel siempre se abre completo.


### 6. "Volver" lleva a la pantalla anterior (actualizado 2026-10-23)

`BotonVolver` (`src/components/ui/boton-volver.tsx`) navegaba siempre a un destino fijo (`href`), para que funcionara igual al entrar desde un email. Pero en varias pantallas eso llevaba a una distinta de la que venía el usuario (por ejemplo, de la ficha de un candidato abierta desde el panel volvía al detalle de la oferta). Ahora:

- **Registro de navegación interna.** `RegistroNavegacion` (`src/components/layout/registro-navegacion.tsx`), montado en `AppShell` dentro de un `Suspense` (usa `useSearchParams`), guarda en `sessionStorage` (`ftl_pila_navegacion`, con `try/catch`) la pila de rutas del sitio visitadas en esta pestaña, hasta 50. Cada cambio de ruta se clasifica: si vino de "atrás"/"adelante" (`popstate`) se recorta la pila hasta esa ruta; si `history.length` creció (push) se apila; si no (un `router.replace`, como el que quita `?aviso=`) se reemplaza la última. Cada entrada recuerda si se llegó con un clic en un link o sin él (un redirect de una acción o un `router.push` del código). Al cargar la página de cero, la pila solo continúa si es una recarga, un "atrás"/"adelante" o una navegación que viene del mismo sitio; una pestaña nueva, un link de un email o un sitio externo empiezan de cero.
- **El botón.** Es un componente de cliente que sigue siendo un `<a href>` real (se puede abrir en otra pestaña, y sin JavaScript va al `href`). Solo en un clic simple, y si `puedeVolverConHistorial()` (`src/lib/navegacion-interna.ts`) lo permite, cancela el link y hace `router.back()`.
- **Cuándo usa el `href` de respaldo:** no hay una ruta anterior en la pila de esta pestaña; la pantalla actual se alcanzó por un redirect de una acción (por ejemplo, crear una oferta y caer en Mis ofertas: "Volver" no lleva de nuevo al formulario enviado); la ruta anterior es un formulario (`/nueva`, `/nuevo`, `/editar`, `/empresa/solicitud`) o es de `/auth`.
- **Texto único.** Dice "Volver" en todas las pantallas, con `aria-label` "Volver a la pantalla anterior": el destino ya no es siempre el mismo, así que un texto como "Volver a mis ofertas" podía ser falso. Cada pantalla sigue pasando su `href` de respaldo (la página padre). La búsqueda de postulantes de una oferta y la ficha del postulante mantienen `?volver=` (decisión 028) para calcular ese respaldo.

Motivo: el comportamiento esperado de "Volver" es el del navegador, pero `router.back()` a ciegas puede sacar al usuario del sitio o devolverlo a un formulario ya enviado. La pila decide cuándo es seguro; en cualquier duda gana el destino fijo, que es el comportamiento anterior.

---

## Consecuencias

- Una sección nueva se agrega en `seccionesDeRol`; la sidebar, el panel del celular y la sección actual salen de ahí.
- El contenido no tiene `max-width` global: cada página decide su ancho (`.contenido-lectura`, 720 px, para textos y formularios). El PR 3 ajusta las páginas internas.
- Se fue el pie de página con los datos de contacto y atención presencial de la oficina; si hacen falta, se suman al contenido del inicio en el PR 3.
- La campanita queda montada una sola vez (en la sidebar en escritorio, en la barra en el celular), para no pedir sus datos dos veces.

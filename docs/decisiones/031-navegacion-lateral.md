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

Todo `/auth/*` (login, registro, recuperar y nueva contraseña, reset enviado, verificar email y verificar email de empresa, aceptar invitación, y la redirección de cuenta desactivada) muestra solo su contenido: son pantallas de un solo paso donde la navegación distrae. Usan `AuthShell` (fondo claro, "Volver al inicio" y la tarjeta del login); el login tiene su propio diseño de dos columnas. *(Actualizado en la decisión 034: el login, el registro y las tres pantallas de recuperar la contraseña usan el panel verde `PanelMarca`, que en el celular va arriba y más corto; `AuthShell` quedaba para verificar email, verificar email de empresa y aceptar invitación. Después esas tres pasaron también al panel verde con `PantallaAuth` y `AuthShell` se borró.)* `not-found` y `error` siguen lo que decide `AppShell` para la ruta: con sidebar fuera de `/auth`.

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


### 6. "Volver" lleva a la pantalla anterior (actualizado 2026-10-23, revisado el mismo día)

`BotonVolver` (`src/components/ui/boton-volver.tsx`) navegaba siempre a un destino fijo (`href`), para que funcionara igual al entrar desde un email. Pero en varias pantallas eso llevaba a una distinta de la que venía el usuario. La primera versión de la pila (más abajo) usaba `router.back()` solo en el caso más simple y caía en el `href` fijo en muchos recorridos comunes:

- las navegaciones hechas con `router.push` desde el código (el buscador del inicio, "Cancelar" del formulario de oferta, los links de `/auth` con sesión abierta) quedaban marcadas como "tras una acción", igual que un redirect después de enviar un formulario;
- si la pantalla anterior era un formulario ya enviado o una de `/auth`, iba al `href` en lugar de saltearla;
- si la pantalla actual tenía cambios de pestaña, filtro o página hechos con un link, "Volver" volvía al filtro anterior y no a la pantalla anterior;
- "push o replace" se decidía con `history.length`, que el navegador topea (50 en Chrome): en una pestaña con mucha navegación, cada pantalla nueva reemplazaba a la anterior en la pila;
- el router de Next renderiza la ruta de un "atrás" dentro de su propio listener de `popstate`, antes que el de la pila, así que un "atrás" se registraba como un reemplazo (la pantalla de la que se volvía quedaba en la pila con la ruta nueva);
- el link de volver de `/auth` iba siempre al inicio (o al login).

Criterio actual:

- **Registro de navegación interna.** `RegistroNavegacion` (`src/components/layout/registro-navegacion.tsx`), montado en `AppShell` dentro de un `Suspense` (usa `useSearchParams`), guarda en `sessionStorage` (`ftl_pila_navegacion`, con `try/catch`) la pila de rutas del sitio visitadas en esta pestaña, con su query, hasta 50. Cada cambio de ruta se clasifica en la tarea siguiente al render (`setTimeout` 0, para que ya hayan corrido los listeners de `popstate`): un "Volver" a una pantalla más atrás recorta la pila hasta ella; un "atrás"/"adelante" recorta la pila hasta esa ruta; un `pushState` (contado envolviendo `history.pushState`, o `history.length` que creció) apila; si no (un `router.replace`, como el que quita `?aviso=` o el del buscador) reemplaza la última. Al cargar la página de cero, la pila solo continúa si es una recarga, un "atrás"/"adelante" o una navegación que viene del mismo sitio.
- **Tras una acción.** Una entrada nueva se marca así solo si no hubo un clic en un link ni una navegación del usuario marcada con `marcarNavegacionDelUsuario()` (`src/lib/navegacion-interna.ts`), que llaman los `router.push` que responden a un gesto del usuario. Quedan como "tras una acción" los redirects reales después de enviar un formulario, crear o eliminar. Un cambio de query en la misma pantalla hereda la marca de la entrada anterior.
- **A dónde va** (`destinoVolver`): la pantalla actual son todas las entradas seguidas con su pathname (pestañas, filtros y páginas no cuentan como pantallas distintas). Si se llegó a ella tras una acción, se saltea la pantalla donde se hizo (el formulario enviado, lo que se eliminó). Después se saltean los formularios (`/nueva`, `/nuevo`, `/editar`, `/empresa/solicitud`), las pantallas de `/auth` (salvo desde el registro, ver "El botón") y la propia pantalla. Si el destino es la entrada inmediata anterior del historial, `router.back()`; si no, se navega a su ruta con la query que tenía, y la pila se recorta hasta ella (desde ahí, como el historial del navegador conserva las pantallas salteadas, "Volver" ya no usa `router.back()` para la anterior).
- **El `href` de respaldo** se usa solo si no hay ninguna pantalla anterior del sitio en esta pestaña: pestaña nueva, link de un email, link directo, o `sessionStorage` no disponible.
- **El botón.** Es un `<a href>` real (se puede abrir en otra pestaña, y sin JavaScript va al `href`); solo se intercepta el clic simple. En `/auth`, `LinkVolverAuth` (`src/components/auth/link-volver-auth.tsx`) hace lo mismo y su `href` es el inicio (o el login, en recuperar contraseña). La excepción es el login: su link dice "Volver al inicio" y es un link común a `/`, sin la pila (`texto` y `usarHistorial={false}`), en escritorio y en celular. *(Actualizado 2026-10-29: el registro de postulante y el de empresa usan `saltearAuth={false}`: su "Volver" no saltea las pantallas de `/auth` y lleva a la pantalla inmediatamente anterior aunque sea el login (login → "Registrate" → registro → "Volver" vuelve al login). Sigue salteando la propia pantalla, así que pasar de postulante a empresa con `?tipo=` no cuenta como otra pantalla, y los formularios ya enviados. Sin pantalla anterior va al inicio. Las demás pantallas de `/auth` no cambian.)*
- **Texto único.** Dice "Volver" en todas las pantallas, también en `/auth` (salvo el login, ver arriba), con `aria-label` "Volver a la pantalla anterior". Cada pantalla sigue pasando su `href` de respaldo (la página padre). La búsqueda de postulantes de una oferta y la ficha del postulante mantienen `?volver=` (decisión 028) para calcular ese respaldo.

Motivo: el comportamiento esperado de "Volver" es el del navegador, pero `router.back()` a ciegas puede sacar al usuario del sitio o devolverlo a un formulario ya enviado. La pila decide a dónde es seguro volver; solo sin pila gana el destino fijo.

---

## Consecuencias

- Una sección nueva se agrega en `seccionesDeRol`; la sidebar, el panel del celular y la sección actual salen de ahí.
- El contenido no tiene `max-width`: ocupa todo el ancho al lado de la sidebar en todas las páginas (decisión 033, que reemplazó a `.contenido-lectura`).
- Se fue el pie de página con los datos de contacto y atención presencial de la oficina; si hacen falta, se suman al contenido del inicio en el PR 3.
- La campanita queda montada una sola vez (en la sidebar en escritorio, en la barra en el celular), para no pedir sus datos dos veces.

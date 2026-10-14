# 010 — Paginación y búsqueda en el servidor

## Contexto

Las ofertas públicas (`/` y `/ofertas`) se traían completas y se filtraban en el navegador. Varios listados del panel (empresas, cursos, ofertas de la empresa, candidatos guardados y derivados, mis postulaciones, mis cursos, asignados a un curso) no tenían paginación. Los tres listados que ya paginaban (`admin/ofertas`, `admin/postulaciones`, `admin/postulantes`) tenían cada uno su propia copia de la lógica, y el texto de búsqueda se insertaba sin limpiar dentro de `.or(...)` e `.ilike(...)`: una coma, un paréntesis, un `%` o un `_` rompían el filtro o cambiaban el resultado.

---

## Decisiones tomadas

### 1. Filtrar, contar y paginar en la base de datos

**Decisión:** todos los listados piden a Supabase solo la página que se muestra (`.range(desde, hasta)` con `{ count: "exact" }`, o el total que devuelve la función RPC). El estado de búsqueda, filtros y página vive en la URL (`q`, `pagina` y los filtros propios de cada pantalla); la página del servidor lee esos parámetros y vuelve a consultar.

**Razonamiento:**
- Traer todas las filas y filtrar en JavaScript funciona con pocos datos pero escala mal: más tiempo de respuesta, más memoria y más datos transferidos, para mostrar igual 20 filas.
- PostgreSQL filtra y ordena con índices; es el lugar correcto para hacerlo (ver `docs/guias/guia-filtros-busqueda-paginacion.md`).
- La URL como fuente de verdad permite compartir links, usar el botón atrás y recargar sin perder los filtros.
- Todo listado ordena por un criterio estable con desempate por `id` (por ejemplo `created_at desc, id desc`), para que dos filas con la misma fecha no se repitan ni se salteen entre páginas.

**Página fuera de rango:** `leerPagina()` acepta solo enteros ≥ 1 (cualquier otro valor es la página 1) y `consultarPagina()` detecta cuando la página pedida no existe (por ejemplo `?pagina=999`, que PostgREST responde con `PGRST103`) y vuelve a consultar la última página válida. Nunca se muestra un error por eso.

---

### 2. Tamaño de página: 20

**Decisión:** `TAMANO_PAGINA = 20` en `src/lib/paginacion.ts`, para todos los listados. La función de ofertas públicas acepta como máximo 50 por llamada.

**Razonamiento:**
- Es el valor que ya usaban los tres listados paginados; mantenerlo no cambia lo que ve la oficina.
- 20 tarjetas o filas entran en una o dos pantallas de celular sin un scroll interminable y siguen siendo útiles en escritorio.
- El tope de 50 en la base evita que alguien pida páginas enormes llamando a la función RPC directamente.

---

### 3. Cómo se limpia la búsqueda

**Decisión:** el texto pasa por dos funciones de `src/lib/busqueda.ts`:

1. `limpiarBusqueda(valor)` — quita caracteres de control, reemplaza por espacio los caracteres con significado en la sintaxis de filtros de PostgREST (`,` `(` `)` `"` `'` `` ` `` `:` y `*`, que PostgREST trata como `%` en `like`), colapsa espacios, hace trim y corta en 100 caracteres.
2. `patronIlike(texto)` — escapa `\`, `%` y `_` con barra invertida (para que se busquen literalmente) y envuelve el texto entre `%`.

Toda búsqueda con `.ilike()` u `.or()` usa las dos. Las funciones RPC reciben el texto de `limpiarBusqueda` y escapan los comodines en SQL (así no se escapa dos veces).

**Razonamiento:**
- Dentro de `.or()` la coma separa condiciones y los paréntesis agrupan: sin limpiar, `a,b` agregaba una condición nueva y `a)` rompía la consulta.
- `%` y `_` son comodines de `LIKE`: sin escapar, buscar `50%` o `a_b` devolvía coincidencias que no contienen ese texto.
- El largo máximo evita consultas desproporcionadas y URLs gigantes. El input también limita a 100 caracteres.
- Quitar los caracteres reservados (en vez de intentar citarlos) es más simple y no pierde nada útil: nadie busca un puesto por una coma o un paréntesis.

**Búsqueda en el navegador:** `src/components/ui/buscador.tsx` escribe `q` en la URL con un debounce de 400 ms, vuelve a la página 1 y usa `router.replace` para no llenar el historial con cada tecla. Los filtros que cambian de una vez (pestañas, rubros, modalidad, checkboxes) sí agregan una entrada al historial.

---

### 4. `buscar_ofertas_publicas` es SECURITY INVOKER

**Decisión:** la función de la migración 034 se ejecuta con los permisos de quien la llama (`anon` o `authenticated`), con `search_path = ''` y todos los nombres calificados con `public.`. Además filtra explícitamente `estado = 'activa'`.

**Razonamiento:**
- Con `SECURITY INVOKER` las políticas RLS existentes de `ofertas`, `oferta_categorias` y `categorias` se siguen aplicando: la función no puede devolver una oferta que el visitante no podría leer con un `select` directo. Una función `SECURITY DEFINER` correría como su dueño, se saltearía RLS y cualquier error en su `WHERE` expondría ofertas pendientes o rechazadas a cualquiera.
- El filtro `estado = 'activa'` replica la consulta anterior: una empresa logueada puede leer sus propias ofertas pendientes por RLS, pero en el listado público no deben aparecer.
- `search_path = ''` evita que un objeto con el mismo nombre en otro schema reemplace a una tabla o función del proyecto.
- Búsqueda sin mayúsculas ni acentos sin extensiones nuevas: `public.normalizar_busqueda()` usa `translate()` + `lower()` (vocales acentuadas, diéresis, ñ y ç). La ñ se compara como n, así que "diseno" encuentra "diseño".

**Índice:** `ofertas_estado_created_at_idx (estado, created_at desc, id desc)` resuelve el filtro por estado y el orden de todos los listados de ofertas. Para el texto no se agrega índice: un `LIKE '%texto%'` no puede usar un btree y la alternativa (`pg_trgm`) es una extensión nueva que no hace falta con el volumen actual.

---

### 5. Esqueleto al cambiar de página o de búsqueda

**Decisión:** cada página separa el encabezado y los filtros (que se renderizan enseguida) del listado, que va dentro de un `<Suspense key={...}>` cuya clave cambia con los filtros y la página. El `fallback` usa los mismos componentes de `src/components/ui/esqueleto.tsx` que los `loading.tsx`.

**Razonamiento:**
- En Next.js 16 una navegación que solo cambia los search params mantiene la página anterior en pantalla hasta que llega la nueva: los `loading.tsx` se muestran al entrar a la ruta, pero no al cambiar `?pagina=` o `?q=`.
- Un `Suspense` con clave nueva se monta de cero, así que React sí muestra su `fallback` durante la navegación.
- El buscador queda fuera del `Suspense`: no se desmonta mientras se escribe y no pierde el foco.

---

## Límites conocidos

- **Candidatos guardados y candidatos derivados:** solo paginación. El nombre del candidato solo se obtiene, uno por uno, desde la función `SECURITY DEFINER` `candidato_para_empresa`; la empresa no puede leer `usuarios` ni `postulantes`. Buscar por nombre en el servidor requiere una función nueva que pagine y filtre por nombre. No se filtra en el cliente.
- **Búsqueda por nombre/DNI en `admin/postulaciones` y `admin/postulantes`:** se mantiene el prefiltro existente (busca ids en `usuarios` y `postulantes` y luego filtra con `.in(...)`). Con búsquedas muy cortas la lista de ids puede crecer y PostgREST la corta en su límite de filas. La solución definitiva es una función RPC que haga el `JOIN`.
- **`admin/empresas`:** la tabla no tiene "nombre de fantasía"; se busca por razón social y CUIT (con o sin guiones).

---

## Archivos clave

```
src/lib/paginacion.ts                              — TAMANO_PAGINA, leerPagina, rangoDePagina, calcularTotalPaginas, hrefConParams, consultarPagina
src/lib/busqueda.ts                                — limpiarBusqueda, patronIlike
src/components/ui/paginacion.tsx                   — Anterior / Siguiente, "Página X de Y", "Mostrando X–Y de Z"
src/components/ui/buscador.tsx                     — campo de búsqueda con debounce que escribe q en la URL
src/components/ui/estado-listado.tsx               — EstadoVacio (sin registros / sin resultados) y ErrorListado
src/migrations/migration_034_busqueda_ofertas_publicas.sql — normalizar_busqueda, buscar_ofertas_publicas, índice
```

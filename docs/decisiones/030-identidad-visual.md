# 030 — Identidad visual

**Fecha:** 2026-10-22
**Estado:** Vigente
**Migración:** ninguna

---

## Contexto

El portal tenía el verde institucional como color de marca, pero el resto de la interfaz había crecido pantalla por pantalla: badges y avisos con colores pastel de Tailwind (`bg-amber-100 text-amber-800`, `bg-red-50`, `bg-emerald-100`…) repartidos en unos 60 archivos, cada helper de estado devolviendo sus propias clases, botones con alturas y radios distintos según la pantalla y una tipografía de sistema (Trebuchet MS).

El rediseño aprobado en Claude Design se implementa en tres PR. Este es el primero: la base visual (colores, tipografía, botones, campos, tarjetas, badges y avisos), sin tocar la estructura de las pantallas. La navegación y el login van en el PR 2; las tarjetas escritas con clases en cada pantalla, en el PR 3.

---

## Decisiones tomadas

### 1. Verde institucional como color de marca

`--color-primary` es `#006833`, el verde de la Municipalidad de Funes. Es el color de la acción principal (botón primario, foco, links) y del tono `success`. El fondo general es un gris verdoso muy claro (`#F4F7F5`) y los títulos van en un verde casi negro (`#0F2A1B`), para que la página se lea como municipal sin llenarla de verde.

### 2. Acento amarillo

`--color-accent` (`#F2B705`, texto `#2B2000`) marca lo que pide atención sin ser un error: el tono `warning` de los badges y avisos, los contadores de pendientes y el futuro botón de acento de la navegación. El amarillo no se usa como texto sobre blanco (no llega a AA); para eso está `--color-warning-text` (`#8A5A00`).

### 3. Public Sans

Public Sans es una tipografía abierta pensada para interfaces de gobierno: legible en tamaños chicos, con números claros y pesos del 400 al 800. Se carga con `next/font/google` en el layout raíz (sin pedidos a Google desde el navegador y sin salto de diseño) y se expone como `--font-sans`. Los títulos van en 800 y en `--color-heading`; como cada pantalla escribe sus títulos con clases, `globals.css` les aplica el peso y el color con una regla fuera de capa en lugar de editarlos uno por uno. Georgia queda solo para el login.

### 4. Colores sólidos, sin pastel

Los estados, avisos y toasts van con fondo sólido y texto blanco (el amarillo, con texto oscuro). Motivos:

- **Contraste.** Todos los tonos superan 6,5:1 con su texto; varios pares pastel apenas pasaban 4,5:1 y dependían de elegir bien el tono del texto en cada archivo.
- **Lectura rápida.** En listados largos de la oficina el estado se distingue de un vistazo; el pastel se confundía con el fondo.
- **Un solo criterio.** Siete tonos (`info`, `teal`, `success`, `neutral`, `warning`, `danger`, `violet`) en lugar de una combinación de fondo, borde y texto por archivo.

Las notas neutras que no son un aviso ("No fuiste seleccionado", "Retiraste esta postulación") van sobre la superficie tintada con borde, no en gris pastel.

### 5. Badges centralizados por tono

Hay un solo `Badge` (`src/components/ui/badge.tsx`) con una prop `tono`, y los helpers de estado (`lib/oferta-estados.ts`, `lib/mis-postulaciones.ts`, `lib/admin/postulacion-estados.ts`, `lib/derivacion-estados.ts`, `lib/pre-entrevistas.ts`, `lib/cursos.ts`, `lib/invitaciones.ts`) devuelven el tono, no clases. Así un estado se ve igual en todas las pantallas y cambiar su color es cambiar una línea. Los rubros, la modalidad y la jornada no son estados: van en `EtiquetaRubro`, blanca con borde, para no competir con los badges.

La tabla de tonos por estado está en `docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md`, sección 21.

### 6. Botones y campos con medidas comunes

Todos los botones miden al menos 44 px de alto, con radio 10 px y texto de 15 px en 700. Las medidas van fuera de capa en `globals.css` para que ganen sobre las clases sueltas de cada pantalla (`h-9`, `text-xs`, `sm:min-h-9`), y las variantes de `Button` usan las mismas clases que los links con `.btn-*`. Los campos (`.campo`) usan texto de 16 px para que iOS no haga zoom al enfocarlos.

---

## Consecuencias

- No se usan clases de colores de Tailwind para estados (`bg-*-50`, `bg-*-100`, `text-amber-700`…). Un estado nuevo se agrega con su tono en el helper que corresponda.
- Quedan para el PR 2 los colores de la barra superior, el menú del usuario, la campanita y el login, que todavía usan clases propias. Resuelto en la decisión 031 (navegación lateral y login nuevo).
- Quedan para el PR 3 las tarjetas y algunos formularios que escriben sus clases en cada pantalla; ya toman los colores nuevos por los tokens, pero no el radio de 16 px ni `.campo`.
- El motivo de "No seleccionado" de la empresa (rediseño, PR 5) se elige con opciones tipo radio ("No cumple con los requisitos del puesto", "Elegimos a otra persona", "No se presentó a la entrevista" u "Otro motivo" con texto) y se guarda como texto en el mismo campo de siempre (`derivaciones.nota_empresa`, vía `rechazarCandidato`); sigue siendo obligatorio.

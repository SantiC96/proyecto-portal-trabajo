# 033 — Ancho completo y columnas parejas

**Fecha:** 2026-10-23
**Estado:** Vigente
**Migración:** ninguna

---

## Contexto

Desde la decisión 031 el contenido no tenía un ancho máximo global, pero cada página elegía el suyo: `.contenido-lectura` (720 px) para textos y formularios, `.contenido-lectura-ancho` (960 px) para detalles con dos columnas, y `max-w-[1200px]` en la revisión de ofertas y empresas y en el formulario de oferta. En pantallas de 1440 o 1920 px eso dejaba una franja vacía grande a la derecha (en crear un curso, el perfil de la oficina, la revisión de una oferta, la ficha de una postulación o la del candidato de la empresa). En la revisión del rediseño el pedido del usuario fue explícito: no desperdiciar espacio en pantallas anchas.

Además, en los detalles con una columna lateral las dos columnas terminaban a distinta altura (el lateral era `sticky` y más corto), y quedaba un hueco debajo de la columna más corta.

---

## Decisiones tomadas

### 1. Sin ancho máximo en las páginas con navegación

Se borraron `.contenido-lectura` y `.contenido-lectura-ancho` de `globals.css` y los `max-w-[1200px]` de página. Todas las páginas de los tres roles ocupan el ancho disponible al lado de la sidebar; el margen lo sigue poniendo `.app-contenido`. Siguen centrados con su ancho propio las pantallas de `/auth`, los diálogos, los popovers y los estados vacíos.

### 2. Los formularios se compensan con grillas

Un formulario de una sola columna a 1100 px de ancho tiene campos difíciles de leer y recorrer. Por eso los formularios reparten sus campos en grillas, con container queries (la sidebar le quita ancho al contenido):

- 2 columnas desde `@2xl:` del contenedor (crear y editar curso, datos de contacto del perfil);
- 3 columnas cuando los campos son cortos (contraseñas del perfil; datos de la empresa y persona responsable en la solicitud a corregir, desde `@5xl:`);
- los textareas, las zonas de carga y los campos largos a todo el ancho;
- en el formulario de oferta: modalidad y jornada lado a lado, requisitos y beneficios lado a lado, y vacantes y duración lado a lado;
- en el celular, una columna.

### 3. Columnas de igual alto: `DetalleConLateral`

`src/components/ui/detalle-con-lateral.tsx` arma los detalles con lateral: una fila de dos columnas (contenido y un lateral de 400 px) que terminan a la misma altura, porque la fila es una grilla que estira las dos columnas y la última tarjeta de cada columna crece (`flex-1`) con su contenido arriba. Las tarjetas de la izquierda que no entran en esa fila van debajo, a todo el ancho (o en dos columnas). El lateral deja de ser `sticky`: ya no queda un hueco que acompañar. En el celular, una columna con el orden de siempre (el lateral puede ir primero o al final). El breakpoint es el de cada pantalla: `@4xl` del contenido, o `lg`/`xl` de la ventana donde ya pasaban a dos columnas ahí.

Qué tarjetas acompañan al lateral se elige por pantalla, para que las dos columnas tengan alturas parecidas antes de estirar. En la ficha de una postulación depende del estado: pendiente, las tres de la izquierda; no seleccionada por la oficina, datos del postulante y oferta; el resto, solo los datos del postulante.

---

## Consecuencias

- Una página nueva no elige un ancho: ocupa todo el ancho y, si es un formulario, reparte los campos en grilla.
- Un detalle nuevo con lateral usa `DetalleConLateral` en lugar de armar su propia grilla.
- Los textos largos (descripciones de ofertas) quedan con líneas más largas en pantallas muy anchas; se aceptó a cambio de no dejar espacio vacío.
- Se actualizaron el design system (sección 11) y la decisión 031.

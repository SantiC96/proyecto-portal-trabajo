# Design System --- Portal Municipal de Empleo

**Producto:** Portal Municipal de Empleo --- Municipalidad de Funes\
**Versión:** 1.0\
**Estado:** Base de diseño aprobable para implementación\
**Stack objetivo:** Next.js + TypeScript + Tailwind CSS + shadcn/ui +
Lucide Icons

------------------------------------------------------------------------

## 1. Objetivo

Definir una identidad visual y un conjunto de reglas de interfaz
compartidas para todo el Portal Municipal de Empleo.

El sistema debe transmitir una identidad:

-   institucional;
-   moderna;
-   clara;
-   accesible;
-   confiable;
-   consistente entre Postulante, Empresa y Municipalidad.

La interfaz no debe parecer un sistema administrativo antiguo ni
trasladar literalmente la estética de una pieza publicitaria. La
identidad municipal se expresa principalmente mediante el verde
institucional, el escudo, la tipografía, la composición y los
componentes compartidos.

------------------------------------------------------------------------

## 2. Alcance

Este Design System aplica a:

-   landing pública;
-   autenticación;
-   área de Postulante;
-   área de Empresa;
-   área de Municipalidad;
-   dashboards;
-   perfiles;
-   ofertas laborales;
-   postulaciones;
-   candidatos;
-   formularios;
-   tablas y listados;
-   filtros;
-   modales;
-   navegación;
-   estados y feedback;
-   vistas responsive.

### Fuera de alcance

Este documento no define:

-   lógica de negocio;
-   permisos;
-   modelo de datos;
-   endpoints;
-   flujo funcional detallado de postulaciones;
-   contenido editorial definitivo;
-   ilustraciones o fotografías de campañas.

------------------------------------------------------------------------

# 3. Principios visuales

## 3.1 Institucional sin sobrecargar

El verde municipal identifica la aplicación, pero no debe ocupar toda la
interfaz.

Usar verde principalmente en:

-   navegación;
-   botones principales;
-   elementos activos;
-   enlaces relevantes;
-   iconografía institucional;
-   acentos;
-   estados positivos.

Las superficies de trabajo deben permanecer mayormente blancas o
gris-verdosas muy claras.

## 3.2 Jerarquía clara

Cada pantalla debe tener una acción principal claramente identificable.

Evitar:

-   múltiples botones primarios compitiendo;
-   exceso de badges;
-   cards dentro de cards sin necesidad;
-   bordes fuertes;
-   sombras pronunciadas;
-   grandes bloques de color sin función.

## 3.3 Un único producto

Postulante, Empresa y Municipalidad usan el mismo Design System.

No crear una paleta diferente para cada rol.

Pueden cambiar:

-   navegación;
-   contenido;
-   acciones;
-   estructura del dashboard.

No deben cambiar:

-   tipografía;
-   botones;
-   inputs;
-   radios;
-   sombras;
-   paleta principal;
-   lenguaje visual.

------------------------------------------------------------------------

# 4. Identidad de marca

## Escudo

El escudo blanco de la Municipalidad de Funes se utiliza sobre fondos
verdes oscuros.

Usos recomendados:

-   sidebar;
-   header institucional;
-   login;
-   footer;
-   bloques de marca.

No colocar el escudo blanco directamente sobre fondos blancos o
demasiado claros.

## Lockup recomendado

Cuando exista espacio:

**[Escudo](#escudo) Municipalidad de Funes**\
**Portal de Empleo**

En espacios reducidos se permite utilizar solamente el escudo.

## Archivos del logo

-   `public/images/logo-funes-blanco.png` (185 × 52): sobre verde
    (sidebar, panel de marca de las pantallas de /auth, footer; encabezado de
    los correos).
-   `public/images/logo-funes-verde.png` (185 × 52): sobre fondos claros
    (tarjeta de las pantallas de /auth desde lg, contacto de la
    oficina). Es el blanco con cada píxel en `#09713D` y la misma
    transparencia, así que se ve igual de nítido; se muestra a 120 × 34
    (la misma proporción). Reemplaza al viejo `logo-funes-color.png`
    (92 × 26, borroso al agrandarlo), que se borró.

------------------------------------------------------------------------

# 5. Paleta

La paleta es la identidad visual implementada en producción. Los valores
de esta sección son la fuente de verdad. Ver la decisión
`docs/decisiones/030-identidad-visual.md`.

**No se usan colores pastel.** Estados, badges, avisos y toasts van con
fondo sólido y texto blanco (el amarillo, con texto oscuro). No usar las
clases de colores de Tailwind (`bg-amber-100`, `text-red-700`,
`bg-emerald-50`, etc.): siempre los tokens de esta sección.

## Marca

  Token                    Valor       Uso
  ------------------------ ----------- --------------------------------
  `primary`                `#006833`   verde institucional: botones, íconos, texto activo
  `primary-hover`          `#00532A`   hover de botones y CTA
  `primary-foreground`     `#FFFFFF`   texto sobre fondo primary

## Superficies y bordes

  Token                 Valor       Uso
  --------------------- ----------- ----------------------------------------
  `background`          `#F4F7F5`   fondo general de página
  `surface`             `#FFFFFF`   cards, formularios, paneles
  `surface-tinted`      `#F0F5F2`   superficies muy claras, hover del botón neutro
  `secondary`           `#EEF1EF`   hover del botón secundario, notas neutras
  `secondary-hover`     `#E3E9E5`   hover sobre fondos secondary, esqueletos
  `border`              `#DDE5E0`   bordes de tarjetas y separadores
  `border-strong`       `#C6D3CB`   bordes de campos
  `border-control`      `#CBD6CF`   borde del botón neutro y de la paginación
  `border-tab`          `#C6D8CD`   borde de las pestañas inactivas

## Texto

  Token                       Valor       Uso
  --------------------------- ----------- --------------------------------
  `foreground`                `#17251D`   texto principal
  `heading`                   `#0F2A1B`   títulos
  `control-foreground`        `#22332A`   labels y texto del botón neutro
  `muted-foreground`          `#55665C`   texto secundario
  `muted-foreground-strong`   `#33443A`   texto secundario destacado, etiquetas de rubro
  `muted-icon`                `#8A988F`   íconos de campos, borde de etiquetas de rubro
  `placeholder`               `#5F6F66`   placeholder de campos (AA sobre blanco)

## Acento amarillo

  Token                 Valor       Uso
  --------------------- ----------- --------------------------------
  `accent`              `#F2B705`   botón de acento, tono warning, contadores
  `accent-hover`        `#FFC928`   hover del botón de acento
  `accent-foreground`   `#2B2000`   texto sobre amarillo

El amarillo no se usa como color de texto sobre blanco: para texto de
aviso suelto se usa `warning-text` (`#8A5A00`).

## Estados (fondos sólidos)

  Token            Valor       Texto        Contraste
  ---------------- ----------- ------------ -----------
  `info`           `#1D4E9E`   blanco       7,97:1
  `teal`           `#0B5D57`   blanco       7,73:1
  `success`        `#006833`   blanco       6,94:1
  `neutral`        `#4F5E55`   blanco       6,85:1
  `danger`         `#B42318`   blanco       6,57:1
  `danger-hover`   `#912018`   blanco       8,66:1
  `violet`         `#5B3A9E`   blanco       8,26:1
  warning          `accent`    `#2B2000`    8,82:1
  apagado          `muted-icon` `heading`  5,10:1

Todos superan AA (4,5:1) para texto de 13 px en negrita. `apagado`
(`#8A988F`, gris claro de "retirada") lleva texto oscuro: el blanco
queda en 3,1:1.

Texto de estado suelto sobre blanco (sin fondo):

  Uso       Clase                 Valor       Contraste
  --------- --------------------- ----------- -----------
  aviso     `text-warning-text`   `#8A5A00`   5,93:1
  error     `text-danger`         `#B42318`   6,57:1
  éxito     `text-primary`        `#006833`   6,94:1

## Decorativo

  Token             Valor       Uso
  ----------------- ----------- -----------------------------------------
  `brand-subtle`    `#B9DCC7`   sin uso desde el rediseño del inicio

## Navegación y pantallas de /auth

  Token                 Valor       Uso
  --------------------- ----------- ---------------------------------------------
  `sidebar-texto`       `#E3F0E8`   secciones de la sidebar; bajada del login
  `sidebar-suave`       `#CFE6D9`   "Portal de empleo", rol del usuario, "Contraer menú"
  `sidebar-grupo`       `#C2DECE`   títulos de grupo de la sidebar
  `tooltip`             `#0F1D15`   tooltips de la sidebar contraída
  `danger-fondo`        `#FDEDEC`   hover de "Cerrar sesión" en el menú del usuario
  `fondo-auth`          `#F3F5F4`   fondo del login y de las pantallas de /auth
  `texto-volver`        `#2E4337`   link "Volver" de /auth
  `login-suave`         `#D7EBDF`   volanta y nota del panel verde del login

## Inicio, panel y listas

  Token                  Valor       Uso
  ---------------------- ----------- ---------------------------------------------
  `texto-bajada`         `#2E4337`   bajada del inicio; empresa en la tarjeta de oferta
  `invitacion-titulo`    `#3A2A00`   título de la tarjeta y del aviso de invitaciones
  `invitacion-texto`     `#4A3700`   texto de la tarjeta de invitaciones del inicio
  `invitacion-detalle`   `#5A4300`   detalle del aviso de invitaciones del panel
  `progreso-fondo`       `#D3DCD6`   fondo de la barra de progreso
  `punto-carrusel`       `#B9C8BF`   indicadores de posición del carrusel (decorativos)
  `tabla-encabezado`     `#F8FAF9`   encabezado de tabla
  `tabla-borde`          `#E6ECE8`   borde entre filas
  `tabla-hover`          `#F8FBF9`   hover de fila
  `tabla-separador`      `#E8ECEA`   separadores de prioridad

## Pantallas públicas y del postulante

  Token               Valor       Uso
  ------------------- ----------- ---------------------------------------------
  `border-campo`      `#B8C7BE`   buscador del listado, pastillas de filtro, opciones tipo radio y campos de Mi perfil
  `opcion-elegida`    `#F3F8F5`   fondo de la opción tipo radio elegida
  `texto-parrafo`     `#22332A`   párrafos y listas del detalle de una oferta
  `texto-vence`       `#8A1A12`   "Vence el …" de las invitaciones (9,9:1 sobre blanco)
  `pendiente-icono`   `#B07A00`   `CircleAlert` del índice de Mi perfil (3,7:1 sobre blanco: solo ícono)

## Pantallas de la empresa y de la oficina

  Token               Valor       Uso
  ------------------- ----------- ---------------------------------------------
  `tabla-cabecera`    `#F3F5F4`   encabezado del componente `Tabla`
  `borde-campo-oferta` `#7F9488`  borde de los campos del formulario de oferta
  `campo-lectura`     `#F3F5F4`   ubicación de solo lectura del formulario de oferta
  `texto-ejemplo`     `#6E7D74`   título de ejemplo de la vista previa de la oferta (solo texto grande)
  `tabla-fila-hover`  `#FAFBFA`   hover de fila del componente `Tabla`
  `numero-fondo`      `#F7F9F8`   números de "Rechazos y cursos" en el perfil del postulante (oficina)
  `sin-comprobante`   `#7A5A00`   "Sin comprobante" debajo del chip de localidad (6,3:1 sobre blanco)
  `texto-pestana`     `#3D4A43`   pestañas inactivas; cantidad en cero de la tarjeta de pendiente (9,3:1 sobre blanco)
  `pastilla-gris`     `#DDE3DF`   fondo de la cantidad de las pestañas y de la tarjeta de pendiente en cero
  `grafico-verde-claro` `#8CC63F` solo indicadores de la oficina: contrataciones, derivadas (con texto `heading`, 7,5:1)
  `grafico-gris`      `#C5CEC8`   solo indicadores de la oficina: rechazadas (con texto `heading`, 9,5:1)
  `nota-rotulo`       `#5C4500`   "NOTA PRIVADA" de Candidatos guardados (sobre el amarillo suave de la nota)

Radio de las tarjetas de los indicadores de la oficina: `--radius-indicador`
(18 px). Sombra del selector de período: `--sombra-selector`
(`0 6px 18px rgb(0 30 15 / 0.08)`).

Las etiquetas de `DatosClave` y el encabezado de la tabla usan `neutral`
(`#4F5E55`); los valores, `control-foreground` (`#22332A`).

`border-tab` (`#C6D8CD`) es el borde de las pastillas de rubro y
del buscador del inicio. Sombra del buscador: `--sombra-buscador`
(`0 8px 24px rgb(0 60 30 / 0.08)`).

------------------------------------------------------------------------

# 6. Tokens Tailwind / CSS

Los componentes no deben contener colores HEX directamente.

La fuente de verdad vive en el bloque `@theme` de `src/app/globals.css`
(Tailwind CSS v4). Cada `--color-*` genera automáticamente clases de
utilidad: `bg-primary`, `text-heading`, `bg-danger`, `border-border-strong`,
etc.

En `:root` están los radios (`--radius-sm` 8 px, `--radius-md` 10 px,
`--radius-lg` 12 px, `--radius-xl` 16 px) y las sombras con nombre:

  Variable                   Valor
  -------------------------- ------------------------------------
  `--sombra-foco`            `0 0 0 3px rgb(0 104 51 / .25)`
  `--sombra-foco-campo`      `0 0 0 3px rgb(0 104 51 / .18)`
  `--sombra-error-campo`     `0 0 0 3px rgb(180 35 24 / .18)`
  `--sombra-dialogo`         `0 24px 60px rgb(0 40 20 / .18)`
  `--sombra-tarjeta-hover`   `0 8px 20px rgb(15 42 27 / .08)`

Clases de componente en `globals.css`: `.btn-primario`, `.btn-secundario`,
`.btn-neutro`, `.btn-peligro`, `.btn-peligro-borde`, `.btn-acento`, `.campo`, `.campo-grupo`,
`.etiqueta-campo`, `.tarjeta` y `.tarjeta-clickeable`.

------------------------------------------------------------------------

# 7. Tipografía

## Familias

**Texto general (token `font-sans`):** Public Sans, cargada con
`next/font/google` en `src/app/layout.tsx` (pesos 400, 500, 600, 700 y
800; subset latin; `display: swap`) y expuesta como `--font-public-sans`.

**Display (token `font-display`):** `Georgia, "Times New Roman", serif`
(fuente del sistema, no se carga). Solo para los títulos principales:

  Título                                    Clase              Peso   Tracking
  ----------------------------------------- ------------------ ------ ----------
  Hero del inicio (`hero.tsx`)              `.titulo-portada`  400    -0.02em
  Títulos del login y de `/auth`            `.login-*-titulo`  400    -0.02em
  `h1` de `EncabezadoPagina` (pantallas     `.titulo-display`  700    -0.01em
  internas)
  `h2` de las secciones del inicio (Cómo    `.titulo-display`  700    -0.01em
  funciona, Tu actividad, título del
  carrusel)

Georgia no tiene peso 800: nunca combinar `font-display` con
`font-extrabold`, porque el navegador simularía la negrita. Las clases
`.titulo-display` y `.titulo-portada` están fuera de capa en
`globals.css` para ganarle a la regla `h1, h2 { font-weight: 800 }`;
no sumarles utilidades de peso ni de tracking.

Todo lo demás queda en Public Sans: títulos de tarjetas, tablas,
diálogos, formularios, badges, botones y el título del detalle de una
oferta.

No introducir familias tipográficas adicionales.

El `body` usa `-webkit-font-smoothing: antialiased`.

## Escala

  Uso                   Tamaño       Peso   Color
  -------------------- ------------ ------ -----------
  Hero del inicio       32 / 46 px   400    blanco (Georgia, interlineado 1.08)
  Título de página      26 / 32 px   700    `heading` (Georgia, interlineado 1.15)
  Título de sección     26 px        700    `heading` (Georgia en el inicio, 1.25)
  Título de sección     20 px        800    `heading` (Public Sans, resto)
  Body                  15--16 px    400    `foreground`
  Label                 15 px        600    `control-foreground`
  Botón                 15 px        700
  Badge                 13 px        700
  Caption               12--14 px    400--500

Los `h1` y `h2` en Public Sans toman el peso 800 y el color `heading` desde
`globals.css` aunque cada pantalla tenga sus propias clases
(`font-bold text-foreground`). Un `h2` sin tamaño propio mide 20 px.

En mobile los títulos pueden reducirse un nivel visual cuando sea
necesario.

------------------------------------------------------------------------

# 8. Espaciado

Usar la escala estándar de Tailwind siempre que sea posible.

Valores predominantes:

-   `4px` --- microespaciado;
-   `8px` --- elementos relacionados;
-   `12px` --- controles compactos;
-   `16px` --- separación interna habitual;
-   `24px` --- grupos/secciones;
-   `32px` --- bloques principales;
-   `48px` --- separación de secciones grandes;
-   `64px` --- secciones de landing.

No introducir valores arbitrarios si existe un token equivalente.

------------------------------------------------------------------------

# 9. Radius

  Elemento                Radius
  ----------------------- -------------------------------
  Button                  10 px (`--radius-md`)
  Campo                   12 px (`--radius-lg`)
  Aviso, toast            12 px (`--radius-lg`)
  Card                    16 px (`--radius-xl`)
  Modal                   16 px (`--radius-xl`)
  Badge                   13 px (pastilla de 26 px)
  Pestaña                 pastilla
  Avatar/Icon container   circular o 10--12 px

Evitar cards excesivamente redondeadas.

------------------------------------------------------------------------

# 10. Sombras

La interfaz se apoya primero en superficie, borde y espaciado.

Las sombras deben ser discretas.

### Card normal

Borde de 1 px `border` y `--sombra-tarjeta` (`0 1px 3px rgb(0 30 15 /
.06)`). Una tarjeta clickeable se eleva 2 px con `--sombra-tarjeta-hover`
al pasar el mouse.

### Elemento elevado

Usar una sombra moderada solamente para:

-   dropdown;
-   popover;
-   modal;
-   command menu;
-   elementos flotantes.

No usar sombras fuertes en todas las cards.

------------------------------------------------------------------------

# 11. Layout

## Estructura (`AppShell`)

`src/components/layout/app-shell.tsx` arma todas las páginas, con o sin
sesión (decisión 031):

``` text
Desde lg (1024 px)                    Menos de lg
┌──────────┬────────────────────────┐ ┌──────────────────────────┐
│          │                        │ │ ☰ [trébol] Portal  🔔    │ barra 60 px
│ Sidebar  │      Contenido         │ ├──────────────────────────┤
│ 260 px   │   (todo el ancho)      │ │       Contenido          │
│ (72 px)  │                        │ │                          │
└──────────┴────────────────────────┘ └──────────────────────────┘
```

Las rutas de `/auth/*` no llevan navegación: solo el contenido.

## Contenido

-   Padding del área de contenido: 32 px en escritorio, 24 px en tablet
    y 16 px en celular.
-   Sin `max-width`: todas las páginas con navegación ocupan todo el
    ancho disponible al lado de la sidebar, en los tres roles (decisión
    033). No hay espacio vacío a la derecha en pantallas anchas.
-   Las páginas no agregan padding propio ni `mx-auto max-w-*`: el
    margen lo pone `.app-contenido`.
-   Siguen centrados con su ancho propio: las pantallas de `/auth`, los
    diálogos, los popovers y los estados vacíos.
-   Para pasar de una a varias columnas dentro del contenido se prefieren
    container queries (`@container`, `@xl:`, `@4xl:`) a los breakpoints
    de la ventana: la sidebar le quita ancho al contenido.

## Fondo de las pantallas

Todas las pantallas con navegación (postulante, empresa, oficina y las
públicas, como `/ofertas` y el detalle de una oferta) llevan el mismo
fondo, aplicado una sola vez en `.app-contenido` (`globals.css`, bloque
"Ambiente"). Ninguna página lo repite.

-   Degradé: `linear-gradient(180deg, rgb(0 104 51 / .07), transparent
    360px)` sobre `background` (240 px en celular).
-   Puntos (`::before`): capa de 460 px de alto (300 en celular) con
    puntos verdes al 13 % cada 24 px y el mismo degradé, enmascarada con
    `radial-gradient(ellipse 70% 100% at 100% 0, #000 15%, transparent
    60%)`: quedan solo en la esquina superior derecha, lejos del título.
-   Escudo de agua (`::after`, solo desde lg): 300 px, al 8 %, girado
    −8°, a 28 px de la derecha y 56 px por encima del borde.
-   `.app-contenido` lleva `position: relative` e `isolation: isolate`:
    la decoración va en `z-index: -1` dentro de él, detrás del contenido,
    y no recibe clics (`pointer-events: none`).
-   El inicio (`/`) no lo lleva: `AppShell` le pone
    `.app-contenido--inicio`, que deja el fondo liso, porque su
    decoración es el hero (sección 26).
-   Las tarjetas y tablas siguen blancas. El encabezado de página, la
    sidebar y la barra del celular no cambian.

El padding de la página es la variable `--relleno-contenido` (16 / 24 /
32 px): la usan las bandas del inicio para llegar de borde a borde. Va en
`.app-pagina`, el contenedor que `AppShell` pone alrededor de cada página
(ver sección 41); abajo deja `--espacio-pie` (48 px) antes del footer.

## Escudo de agua

La marca de agua es el escudo de la Municipalidad, en dos imágenes de
`public/images` de 330 × 344 px con fondo transparente:

-   `escudo-verde.png`, para fondos claros: el fondo de las pantallas y
    los estados vacíos, como `background: url(...) center / contain
    no-repeat` en un `::after` de `globals.css`, al 8 % y girado −8°. La
    imagen ya es verde de marca: no lleva máscara ni color propio.
-   `escudo-blanco.png`, para fondos verdes: el footer (sección 41).

En las pantallas con encabezado de banda verde (sección 13) el escudo del
fondo no se muestra: la banda ya lleva el suyo.

No se copia en los componentes. El trébol de la sidebar contraída y de la
barra del celular (`trebol.png`) es otra pieza y no cambia.

Formularios: como ocupan todo el ancho, reparten los campos en grillas de
2 columnas (3 si son cortos, como las contraseñas o los datos de la
solicitud de la empresa) desde `@2xl:` del contenedor; los textareas, las
zonas de carga y los campos largos van a todo el ancho (`col-span-*`). En
el celular, una columna. Las secciones cortas que van juntas (requisitos y
beneficios de la oferta) se ponen lado a lado.

## Detalle con lateral y columnas parejas (`DetalleConLateral`)

`src/components/ui/detalle-con-lateral.tsx`, con las props `principal`,
`lateral` y `debajo` (fragmentos de tarjetas). Desde el breakpoint de la
pantalla (`desde`: `@4xl` del contenido por defecto; `lg` o `xl` de la
ventana en las que ya pasaban a dos columnas ahí):

``` text
┌──────────────────────────────┬───────────┐
│ principal (1fr)              │ lateral   │  misma altura: la última
│                              │ (400 px)  │  tarjeta de la columna más
│                              ├───────────┤  corta crece (flex-1), con
│                              │ (crece)   │  su contenido arriba
├──────────────────────────────┴───────────┤
│ debajo: a todo el ancho (o 2 columnas)   │
└──────────────────────────────────────────┘
```

-   Separación igual en las columnas (`separacion`, `gap-6` por defecto).
-   El lateral ya no es sticky: termina a la par del contenido.
-   En una columna (celular), el orden de siempre: `principal`, `lateral`
    y `debajo`, o el lateral primero o al final (`lateralEnCelular`).
-   `debajoEnDosColumnas` para dos tarjetas cortas.
-   `anchoLateral` (400 por defecto; 380 en la oficina) y
    `separacionColumnas` (la separación entre columnas, si es distinta de
    la de las tarjetas).

Pantallas: detalle público de una oferta (título y "Postularme" arriba,
descripción debajo), revisión de oferta y de empresa, ficha de una
postulación (qué tarjetas acompañan a la lateral depende del estado),
fichas del candidato de la empresa y detalle de curso.

Ficha del candidato de la empresa
(`/empresa/ofertas/[id]/candidatos/[derivacionId]`), en escritorio:

-   En curso (pendiente o en proceso): "Gestión" mide lo mismo que las
    tarjetas de la izquierda juntas (Contacto, CV, nota de la Oficina,
    información laboral y la nota privada si hay). "Ver perfil completo"
    va debajo.
-   Terminado (seleccionado, no seleccionado, se retiró, oferta retirada):
    "Gestión" es un mensaje corto y mide lo mismo que la tarjeta de
    Contacto; el resto de las tarjetas y "Ver perfil completo" van debajo,
    a todo el ancho.
-   En el celular, una columna con el orden de siempre: Gestión al final
    (`lateralEnCelular="al-final"`).

Con la misma técnica (grilla con `items-stretch`), en el panel del
postulante "Últimos movimientos" y la tarjeta del perfil (completitud)
terminan a la misma altura cuando están lado a lado (`ColumnasPanel`): la
más corta crece con su contenido arriba. En una columna, una debajo de la
otra.

## Índice de secciones (Mi perfil)

`src/components/perfil/indice-secciones.tsx` (`IndiceSecciones`). Marca la
sección visible con `IntersectionObserver` y `aria-current`.

-   Desde 768 px de ancho disponible (`@3xl:`): una `.tarjeta` de 240 px a
    la izquierda (padding 12), sticky (`top-6`), con "En esta página"
    (13 px 800, mayúsculas, `neutral`) y un link de 44 px por sección:
    el ícono de la sección (18 px), el nombre (15 px 600) y, a la
    derecha, el estado. La actual, con fondo `primary` al 10 %
    (`rgba(0,104,51,.10)`) y texto `primary-hover` (`#00532A`) 700;
    hover `secondary`.
-   En pantallas angostas: pastillas de 44 px (radio 22, borde 1,5 px
    `border-campo`, fondo blanco) en una fila con scroll horizontal (sin
    barra), fija arriba (`sticky top-0`, fondo `background` al 95 %). La
    actual, verde sólida con texto blanco; al cambiar de sección se
    desplaza a la vista (sin animación con movimiento reducido).
-   Íconos: Foto `Camera`, Datos personales `IdCard`, Procedencia
    `MapPin`, Información laboral `Briefcase`, Rubros de interés `Tag`,
    CVs `FileText` y Contraseña `Lock`.
-   Estado: `CircleCheck` `primary` si la sección está completa,
    `CircleAlert` `pendiente-icono` (`#B07A00`) si le falta algo (blanco
    sobre la pastilla actual), con el texto para lectores de pantalla
    "(completa)" o "(le falta completar)". Los criterios son los de
    `obtenerCompletitudPerfil` (los mismos del panel): Información
    laboral junta experiencia y disponibilidad; Procedencia, localidad y
    comprobante. Contraseña no tiene criterio y va sin estado. Si la
    completitud no se puede leer, el índice va sin estados.

## Tarjeta de la foto (Mi perfil del postulante)

`EncabezadoPerfil destacado` (`src/components/perfil/encabezado-perfil.tsx`)
reemplaza a la tarjeta "Foto" (el título queda solo para lectores de
pantalla). La empresa usa la misma tarjeta (ver «Mi perfil de la
empresa», más abajo); la oficina sigue con el encabezado de siempre.

-   `.tarjeta .tarjeta-panel`: la foto o las iniciales (96 px; 76 en el
    celular; clic para verla y ajustarla), el nombre en Georgia
    (`.titulo-display`, 32 px; 26 en el celular), el rol (15 px 600
    `primary`) y los botones "Cambiar foto" (o "Subir foto",
    `.btn-secundario`) y quitar (`.btn-icono` con borde rojo, solo
    ícono, con `aria-label`). En el celular, centrado.
-   A la derecha desde `lg` (debajo en angosto), un recuadro con fondo
    `primary` al 6 % (`rgba(0,104,51,.06)`), radio 12: el
    `AnilloProgreso` de 64 px (el mismo del panel, con su animación),
    "Perfil al X %" (16 px 800) y "Te falta:" con lo pendiente como
    links a su sección (los textos del panel; abren la tarjeta en
    edición como los links "Completar"). Completo: "Tu perfil está
    completo."
-   Debajo, a todo el ancho, la ayuda de formatos (13 px
    `muted-foreground`).

Cada sección del perfil es una tarjeta (`SeccionPerfil` en
`components/perfil/piezas.tsx`) con su título de 20 px 800 (18 en el
celular), una línea de ayuda opcional y su contenido. En el perfil del
postulante, el título lleva el ícono de la sección en un `IconoCuadro`
de 40 px (`icono`). Campos del perfil:
alto 48, borde 1,5 px `border-campo`, radio 10; label 15 px 700, ayuda
13 px, error 13 px 600 en `danger`.

### Modo lectura y edición (perfil del postulante)

`components/perfil/tarjeta-editable.tsx`. Las tarjetas de datos (Datos
personales, Procedencia, Información laboral y Rubros de interés) se ven
en **modo lectura** al entrar:

-   cada dato con `CampoLectura estiloPerfil` dentro de `GrillaLectura`
    (`<dl>` de 2 columnas desde sm, 1 en el celular): la etiqueta arriba
    en 13 px 700 `neutral` y el valor abajo en 16 px
    `control-foreground`. Un dato vacío va como `ChipSinCompletar`
    (abajo);
-   los rubros elegidos, como chips verdes: fondo `primary` al 10 %,
    radio 18, alto 36, texto 15 px 600 `primary-hover`, con el ícono del
    rubro (`iconoRubro`, `src/lib/rubros-iconos.ts`) blanco de 16 px en
    un círculo `primary` de 28 px. Sin rubros, el chip de sin completar;
-   en el encabezado, el botón **"Editar"** (`BotonEditar`: `.btn-neutro
    .btn-chico` con el ícono `Pencil`). Su nombre accesible nombra la
    tarjeta ("Editar datos personales"). "Cambiar contraseña" usa
    `.btn-secundario .btn-chico`.

### Mi perfil de la empresa (`/empresa/perfil`)

`EncabezadoPagina banda` "Mi perfil" con su bajada y, dentro de
`EdicionPerfil` (una sola tarjeta en edición a la vez):

-   **Tarjeta del logo**: `EncabezadoPerfil destacado accionesAlCostado
    variante="logo"`. El logo (o las iniciales de la empresa sobre
    `primary`) en 96 px (76 en el celular); la razón social en Georgia de
    30 px (26 en el celular); "Contacto: [persona]" (15 px 600 `primary`)
    y, debajo (`debajo`), el badge del estado de la empresa (En revisión
    `warning`, Aprobada `success`, Rechazada `danger`). A la derecha
    (debajo en angosto), en una sola fila (`flex-nowrap`): "Cambiar logo"
    (`.btn-secundario`, `Upload`) y "Eliminar logo" (`.btn-icono`
    `.btn-peligro-borde`, solo `Trash2`, con su confirmación; sin logo no
    se muestra). Debajo, la ayuda de formatos. Sin el anillo de
    completitud.
-   Dos tarjetas lado a lado desde `lg` (apiladas antes), `SeccionPerfil`
    con `GrillaLectura` (etiqueta arriba, valor abajo; el vacío como "—"
    gris, `chipVacio={false}`). Desde `lg` miden lo mismo: la fila con
    `align-items: stretch` y las dos tarjetas con `height: 100%`
    (`lg:items-stretch lg:*:h-full`); en el celular, cada una con su alto.
    Los íconos de las tres tarjetas (contacto, empresa y contraseña) van
    en el mismo cuadrado `primary` de `IconoCuadro` (40 px, ícono blanco).
    -   **Datos de contacto** (`IdCard`): `DatosContactoForm
        variante="tarjeta"`, con "Editar datos" (`BotonEditar`, `.btn-neutro
        .btn-chico` con texto e ícono `primary`, `primary-hover` al pasar
        el mouse; fondo y borde los del neutro). Solo en este perfil: el
        "Editar" del postulante sigue neutro. La edición es la de siempre
        (nombre, apellido, teléfono; el email no se edita) con los campos
        del perfil y `PieEdicion` ("Guardar datos").
    -   **Datos de la empresa** (`Building2` en el cuadrado `primary`):
        razón social, CUIT, rubro, estado y descripción (a
        todo el ancho), de solo lectura. Debajo, un recuadro
        `surface-tinted` (radio 12) con `Lock` y "Para corregir estos
        datos, comunicate con la Oficina de Empleo." en `primary-hover`
        600; si la solicitud fue rechazada, en su lugar "Corregir y
        reenviar solicitud" (primario).
-   **Contraseña**: `SeccionContrasena` con `Lock` en el cuadrado
    `primary` y "Cambiar contraseña" (`.btn-secundario`) a la derecha,
    que despliega el formulario de siempre.

`.btn-chico` (`globals.css`, después de las medidas comunes): padding
12 px, texto 14 px, ícono de 16 px y 36 px de alto desde `sm`; en el
celular, 44 px como todos los botones.

**Dato sin completar** (`ChipSinCompletar`, `piezas.tsx`): chip en lugar
del texto gris, con fondo `accent` al 20 % (`rgba(242,183,5,.2)`), radio
8, texto "Sin completar" 14 px 700 en `invitacion-titulo` (`#3A2A00`) y
`TriangleAlert` de 16 px. Va en todos los datos vacíos del modo lectura
(también los opcionales).

**Fila de archivo del perfil** (`FilaArchivoPerfil`, `piezas.tsx`): los
CVs y el comprobante de domicilio. Fila con borde y radio 12: `FileText`
en un cuadrado de 44 px con fondo `primary` al 10 % (ícono `primary`),
el nombre (15 px 700) y sus datos en 13 px `muted-foreground` (peso,
tipo y fecha, los que haya: "120 KB · PDF · Cargado el …"; el
comprobante no guarda el tipo). A la derecha (debajo en el celular), el
badge si tiene (el estado del comprobante: "Verificado", "En revisión" o
"Rechazado") y las acciones: "Ver" (`.btn-neutro` con `ExternalLink`) y
eliminar (`.btn-icono` con borde rojo y `aria-label`, con su
confirmación). El comprobante no tiene acción de eliminar.

En CVs, debajo de la lista, la barra de uso: "2 de 5 CVs" (700
`heading`) "· PDF, hasta 5 MB" (con `CV_MAXIMOS` y `CV_HELP_TEXT`) y una
barra de 8 px (`progreso-fondo`, lleno `primary`, decorativa) y, a la
derecha, "Subir CV" (`.btn-secundario`; debajo en el celular).

Al tocar "Editar", la tarjeta muestra el formulario (el botón se oculta)
con el pie `PieEdicion`: "Cancelar" (neutro) y "Guardar cambios"
(primario), a la derecha; en el celular, a todo el ancho con "Guardar
cambios" arriba. Guardar usa la misma acción, validaciones, errores y
aviso de éxito de siempre y, si sale bien, vuelve al modo lectura con los
datos nuevos. Cancelar descarta los cambios. El foco va al primer campo al
abrir y vuelve a "Editar" al guardar o cancelar.

-   **Una tarjeta en edición a la vez** (`EdicionPerfil`): abrir otra
    cierra la que estaba abierta; si tenía cambios sin guardar, primero
    pregunta "¿Descartar los cambios sin guardar?" ("Seguir editando" /
    "Descartar cambios", destructivo), con `Dialog` y `BotonesDialogo`.
-   **Abrir desde un link:** si la URL apunta a una tarjeta (`#id`, como
    `hrefSeccionPerfil` del panel o el aviso "completá tu localidad") y a
    esa tarjeta le faltan datos (los mismos criterios que la completitud
    del panel), se abre directamente en edición.
-   **Contraseña:** el botón "Cambiar contraseña" (secundario) despliega
    el formulario, con "Cancelar"; cuenta como una tarjeta más en edición.
-   La foto y los CVs no tienen modo lectura: siguen con sus botones de
    subir y de borrar (la foto, en su tarjeta: «Tarjeta de la foto»). El comprobante de domicilio de Procedencia queda
    siempre a la vista, fuera del formulario de la localidad.
-   Los perfiles de la empresa y de la oficina no usan `EdicionPerfil`.

## PageContainer

`.app-contenido` hace de contenedor de todas las páginas internas:
padding responsive (16 / 24 / 32 px) y alineación. Sin ancho máximo
(ver "Contenido").

------------------------------------------------------------------------

# 12. Sidebar

Componentes: `src/components/layout/sidebar.tsx` (contenido),
`secciones-rol.ts` (secciones por rol), `menu-usuario.tsx` (bloque del
usuario) y las clases `.sidebar-*` de `globals.css`.

## Escritorio (desde lg)

-   Fija a la izquierda (sticky, 100vh), 260 px de ancho, fondo
    `primary`, texto blanco, padding 20 px 12 px 14 px. Solo la lista de
    secciones tiene scroll si no entra.
-   **Marca:** logo blanco de 170 px y debajo "PORTAL DE EMPLEO" (12 px,
    700, letter-spacing .08em, `sidebar-suave`). Línea
    `rgba(255,255,255,.18)` y 12 px de margen.
-   **Sección:** ícono Lucide de 20 px y texto 15 px 500, alto 44 px,
    padding 0 12 px, radio 10, gap 12, color `sidebar-texto`.
    -   Hover: fondo `rgba(255,255,255,.12)` y texto blanco (150 ms).
    -   Actual: fondo blanco, texto `primary` 700, `aria-current="page"`.
        Se calcula con la ruta: coincidencia exacta o por prefijo, la más
        específica gana.
    -   Destacada ("Publicar oferta" de la empresa): fondo `accent`,
        texto `accent-foreground` 700, hover `accent-hover`, 4 px de
        margen arriba y abajo.
-   **Títulos de grupo** (solo oficina): 11 px, 700, mayúsculas,
    letter-spacing .08em, `sidebar-grupo`, padding 12 px 12 px 4 px.
    **Separador:** línea de 1 px `rgba(255,255,255,.2)` con 8 px de margen.
-   **Contador** (solo pendientes de la oficina): pastilla de 22 px, radio
    11, fondo `accent`, texto `accent-foreground` 12 px 800, a la derecha
    del texto. En la sección actual va en `primary` con texto blanco.
-   **Pie** (misma línea que arriba):
    -   Con sesión: bloque del usuario (foto o iniciales de 38 px con
        borde blanco, nombre 14 px 700, rol 12 px `sidebar-suave`,
        chevron) y la campanita (44 px; número en pastilla `accent` con
        borde `primary` de 2 px). El bloque abre hacia arriba un menú
        blanco (radio 12, sombra `0 12px 32px rgba(0,30,15,.28)`,
        padding 6): "Mi perfil" y, tras una línea, "Cerrar sesión" en
        `danger` (hover `danger-fondo`). Ítems de 44 px, 15 px 600, ícono
        de 18 px. La campanita abre su panel al costado de la sidebar.
    -   Sin sesión: "Ingresar" (fondo blanco, texto verde) y
        "Registrarme" (borde 1,5 px `rgba(255,255,255,.8)`), 44 px.
    -   "Contraer menú" (14 px, `sidebar-suave`, PanelLeftClose /
        PanelLeftOpen).

## Contraída (72 px)

-   Solo íconos centrados en botones de 48 × 44; arriba el trébol en un
    cuadrado blanco de 44 px con radio 10.
-   Los títulos de grupo pasan a ser una línea separadora.
-   El contador pasa a una pastilla de 18 px con borde `primary` de 2 px
    arriba a la derecha del ícono.
-   El usuario muestra solo la foto, con la campanita arriba;
    "Ingresar" y "Registrarme", solo el ícono.
-   Tooltip a la derecha con el nombre al pasar el mouse o con el foco
    del teclado (fondo `tooltip`, texto blanco 13 px 600, radio 6). Con
    contador: "Comprobantes · 5 por revisar". Los links conservan su
    `aria-label`.
-   La preferencia se guarda en `localStorage` y se aplica antes de
    pintar (atributo `data-sidebar` en `<html>`).

## Barra y panel del celular (menos de lg)

-   Barra fija de 60 px, fondo `primary`: botón de menú (44 × 44,
    "Abrir menú", `aria-expanded`), el trébol en un cuadrado blanco de
    36 px, "Portal de Empleo" (15 px 700, blanco) y a la derecha la
    campanita o "Ingresar".
-   El botón abre la sidebar completa (260 px) como panel desde la
    izquierda (translateX de -100 % a 0 en 250 ms) sobre un fondo
    `rgba(15,29,21,.5)`. Se cierra con la X, tocando el fondo, con Escape
    o al elegir una sección. Mientras está abierto, la página no
    scrollea y el foco queda dentro; al cerrar vuelve al botón de menú.
    La campanita queda en la barra, no en el panel.

## Animaciones

Todas se desactivan con `prefers-reduced-motion: reduce`.

-   Contraer o expandir: ancho en 250 ms ease; textos, logo y títulos de
    grupo con fundido de 300 ms y 100 ms de demora.
-   Menú del usuario: entra desde abajo (translateY 8 px y escala .97)
    en 180 ms; los ítems con fundido escalonado de 60 ms.

------------------------------------------------------------------------

# 13. Header de página

Componente compartido: `EncabezadoPagina`
(`src/components/ui/encabezado-pagina.tsx`): título de 32 px 800 (26 px
en el celular),
letter-spacing `-.01em`, color `heading`; bajada de 16 px
`muted-foreground` con 6 px de margen; acciones a la derecha, alineadas
abajo.

Puede contener:

-   breadcrumb opcional;
-   título;
-   descripción;
-   acción principal;
-   acciones secundarias opcionales.

Ejemplo:

``` text
Ofertas laborales                     [+ Nueva oferta]
Gestioná las búsquedas activas de tu empresa.
```

En mobile las acciones pasan debajo del título.

## Con banda verde (pantallas del postulante y de la empresa)

`EncabezadoPagina banda`: en las seis pantallas del postulante (Panel,
Mis postulaciones, Invitaciones, Mis cursos, Notificaciones y Mi perfil) y
en nueve de la empresa (Panel, Mis ofertas, el detalle de la oferta,
Publicar oferta, Editar oferta, Candidatos guardados, Indicadores,
Notificaciones y Mi perfil). Sin
la prop, el encabezado de siempre en el resto. Clases `.encabezado-banda*`
de `globals.css`.

-   Banda: `position: relative`, `isolation: isolate`, `overflow:
    hidden`, radio 24 (20 en celular), padding `34px 40px` (`22px 18px`
    en celular), fondo `primary` con puntos blancos al 9 %
    (`radial-gradient(rgb(255 255 255 / .09) 1px, transparent 1.5px)`)
    cada 28 px (24 en celular).
-   Decoración: `DecoracionBanda` (`src/components/ui/decoracion-banda.tsx`),
    la misma pieza que la banda del listado de ofertas (anillo de 560 px
    con borde de 60 px y `escudo-blanco.png` de 190 px, rotado −8°, dentro
    del hueco del aro). Cambia solo en el celular: anillo a −120 px de la
    derecha y −140 px de abajo, y el escudo al 12 % (13 % desde `sm`).
-   Título en Georgia 400 (`.titulo-portada`, tracking −.02em), blanco,
    48 px (34 en celular); bajada en `sidebar-texto` (`#E3F0E8`), 17 px
    (15 en celular). Contraste sobre `primary`: blanco 7,4:1 y
    `sidebar-texto` 6,4:1.
-   Acciones a la derecha, alineadas abajo; en el celular, debajo y a todo
    el ancho. Las páginas pasan los botones de siempre y la banda los
    adapta: `.btn-primario` con fondo blanco y texto `primary` (hover
    `sidebar-texto`); `.btn-secundario` y `.btn-neutro` transparentes, con
    borde blanco al 75 % y texto blanco (hover blanco al 12 %). El foco,
    un anillo blanco por fuera de un borde verde.
-   "Volver", si la pantalla lo tiene, va arriba y fuera de la banda
    (`BotonVolver destacado`, en verde).
-   **Banda de la empresa** (`botonesBlancos`, clase
    `.encabezado-banda-acciones--blancos`): todos los botones van con
    fondo blanco, borde blanco y texto `primary`, también los neutros, los
    secundarios y los de baja ("Retirar oferta", "Eliminar"); hover
    `sidebar-texto`. Las del postulante no cambian.
-   `junto`: algo al lado del título, en la misma línea (pasa debajo si no
    entra). En el detalle de la oferta, el estado en una pastilla blanca de
    30 px, radio 15, texto `primary-hover` (`#00532A`) 14 px 700 con su
    punto.
-   Con el selector de período desplegable en las acciones (indicadores
    de la empresa, `.selector-periodo-banda`), la banda pasa a `overflow:
    visible` y `z-index` 20 para que la lista salga por debajo; la
    decoración ya se recorta en su propia capa.
-   Con banda no se muestra el escudo de agua del fondo
    (`.app-contenido:has(.encabezado-banda)::after`).
-   Mientras carga (`loading.tsx`), la banda ya está con su título; lo que
    falta va en una barra blanca al 20 %.

## "Volver"

Arriba del título, `BotonVolver` (`src/components/ui/boton-volver.tsx`);
en `/auth`, `LinkVolverAuth`. Dicen "Volver" y llevan a la pantalla
anterior de esta pestaña con su query (pestaña, filtros, página y
búsqueda). Saltean los formularios ya enviados (nueva, nuevo, editar,
solicitud), las pantallas de `/auth` y los cambios de filtro o página de
la misma pantalla; si se llegó por el redirect de una acción, también la
pantalla donde se hizo. Solo sin una pantalla anterior del sitio
(pestaña nueva, link de un email, link directo) van a su `href` de
respaldo, la página padre. Todos los "Volver" del sitio usan estos dos
componentes. Detalle en la decisión 031, punto 6.

------------------------------------------------------------------------

# 14. Button

Las clases de `globals.css` y las variantes de
`src/components/ui/button.tsx` se ven igual (las variantes usan las
mismas clases).

## Medidas comunes

-   alto mínimo 44 px, padding horizontal 18 px;
-   radio 10 px;
-   Public Sans 700, 15 px;
-   8 px entre ícono y texto, ícono de 18 px;
-   transición de color de 150 ms;
-   foco visible: anillo de 3 px `rgb(0 104 51 / .25)`;
-   deshabilitado: opacidad .6 y cursor `not-allowed`.

Estas medidas van fuera de capa en `globals.css` para que ganen sobre las
clases sueltas de cada pantalla.

## Variantes

  Clase              `Button variant`   Fondo           Borde                   Texto                 Hover
  ------------------ ------------------ --------------- ----------------------- --------------------- -------------------
  `.btn-primario`    `default`          `primary`       ---                     blanco                `primary-hover`
  `.btn-secundario`  `secondary`        blanco          1,5 px `primary`        `primary`             fondo `secondary`
  `.btn-neutro`      `outline`          blanco          1,5 px `border-control` `control-foreground`  `surface-tinted`
  `.btn-peligro`     `destructive`      `danger`        ---                     blanco                `danger-hover`
  `.btn-peligro-borde` ---              blanco          1,5 px `danger`         `danger`              `danger-fondo`
  `.btn-acento`      `accent`           `accent`        ---                     `accent-foreground`   `accent-hover`

`ghost` y `link` quedan para acciones de baja jerarquía y botones de
ícono (44 × 44).

`.btn-icono` (fuera de capa, después de las medidas comunes): botón de
solo ícono de 44 × 44, sin padding, ícono de 20 px. Siempre con
`aria-label` y `title` con el mismo texto. Lo usan los botones de borrar
un archivo: "Quitar foto" (o "Eliminar logo") de Mi perfil y "Eliminar CV
«nombre»" de cada CV, con `Trash2` en `.btn-peligro-borde`
(`DialogoConfirmacion` con `etiquetaBoton`, `ayudaBoton` y
`claseBoton="btn-icono"`). La confirmación es la de siempre.

## Reglas

-   Una sección no debe contener varios botones primarios con igual
    jerarquía salvo que representen acciones equivalentes.
-   "Cancelar" en los diálogos usa el botón neutro.
-   "Cerrar sesión" y toda acción destructiva usan el botón de peligro.
    Una destructiva de menor peso que convive con otras acciones
    ("Retirar postulación", "Quitar foto", eliminar un CV) usa
    `.btn-peligro-borde` (`estiloBoton="peligroBorde"` en
    `DialogoConfirmacion`); para borrar un archivo, como botón de ícono
    (`.btn-icono`, ver arriba).
-   El botón de acento se reserva para la navegación (rediseño, PR 2).
-   Dentro de un aviso rojo, la acción usa el botón neutro (el verde no
    contrasta sobre el rojo).

------------------------------------------------------------------------

# 15. Campos

Clase `.campo` (la usan `Input`, `Textarea`, el botón y los desplegables
de hora de `CampoFechaHora`, el `Buscador` y el botón de los `Combobox` de
los formularios); `.campo-grupo` para contenedores que
se ven como un campo (los chips de `MultiCombobox`).

-   borde 1,5 px `border-strong`, radio 12 px, fondo blanco;
-   texto 16 px (evita el zoom automático de iOS);
-   placeholder `placeholder`; desaparece cuando el campo tiene foco
    (regla global fuera de capa en `globals.css`:
    `input:focus::placeholder, textarea:focus::placeholder` transparente),
    en todos los `input` y `textarea` del sistema. Por eso el placeholder
    es solo un ejemplo: lo necesario va en el label o en la ayuda;
-   alto mínimo 48 px en una línea;
-   foco: borde `primary` y `--sombra-foco-campo`;
-   error (`aria-invalid`): borde `danger` y `--sombra-error-campo`;
-   deshabilitado: fondo `surface-tinted`.

Cada campo debe tener:

``` text
Label
[ Input                         ]
Texto de ayuda / error
```

Labels: clase `.etiqueta-campo` (15 px, 600, `control-foreground`). El
asterisco de obligatorio (`<Obligatorio />`) va en `danger`.

## Fecha y hora (`CampoFechaHora`)

`src/components/ui/campo-fecha-hora.tsx`, sobre `Calendar` y `Popover` de
shadcn (`src/components/ui/calendar.tsx`, restilizado con los tokens; sin
colores por defecto de shadcn). Un solo campo con su label ("Fecha y hora"
con `<Obligatorio />`) y su error debajo:

-   **Disparador:** un botón `.campo` de 48 px con el ícono de calendario
    (`muted-icon`), la fecha elegida en formato largo ("Martes 3 de
    noviembre, 10:30 h"; con el año solo si no es el actual) o el
    placeholder "Elegí la fecha y la hora" en `placeholder`, y un chevron.
    Abierto, borde `primary` y `--sombra-foco-campo`; con error, el borde
    rojo de `.campo` (`aria-invalid` y `aria-describedby` van al botón, así
    `useErroresCampo` lo enfoca).
-   **Popover:** fondo `surface`, radio 12 (`--radius-lg`), borde `border` y
    `--sombra-dialogo`; padding 12, alineado al inicio del campo y nunca más
    ancho que la pantalla menos 32 px. Aparece con el fundido y la escala de
    los popovers (sin movimiento con `prefers-reduced-motion: reduce`).
-   **Calendario:** en español, la semana empieza el lunes, mes en 15 px 800
    `heading` con mayúscula inicial, días de la semana en 13 px 600
    `muted-foreground`. Celdas de 44 px (en pantallas de 320 px se achican
    para que entren las 7 columnas), radio 10, número de 15 px. Hoy:
    `primary` en negrita con un anillo interno de 1,5 px `primary`. El día
    elegido: fondo `primary` (`#006833`) con texto blanco en negrita (6,94:1),
    hover `primary-hover`. Hover de los demás: `secondary`. Días pasados
    (cuando se pide una fecha futura, que es el caso por defecto):
    `muted-icon` tachados, sin hover; no se puede volver a meses anteriores.
    Días de otro mes: `muted-foreground`. Foco: `--sombra-foco`.
-   **Hora:** debajo del calendario, separada por un borde `border`, dos
    `Combobox` `.campo` lado a lado, sin buscador (`buscador={false}`: son
    números de dos cifras y la lista entra entera; con el teclado se salta
    escribiendo la cifra): "Hora" (08 a 20) y "Minutos" (00, 15, 30 y 45;
    a las 20 solo 00). Su lista se abre en un portal encima del popover.
    Se habilitan después de elegir el día; los turnos que ya pasaron hoy
    aparecen en gris y no se pueden elegir. Elegir la hora completa los
    minutos con el primer turno libre.
-   **"Listo":** botón primario a todo el ancho que cierra el popover.

Teclado: Enter o Espacio abren y el foco entra en el día elegido (o en hoy);
las flechas recorren los días, Re Pág / Av Pág cambian de mes, Enter elige;
Tab llega a la hora, los minutos y "Listo"; Escape cierra y el foco vuelve al
botón. El valor que se envía no cambia: el día del calendario y "HH:MM", que
`fechaHoraISO` convierte a ISO con el desplazamiento de Argentina (-03:00).

------------------------------------------------------------------------

# 16. Select / Combobox

**Regla: todos los desplegables de selección única usan `Combobox`**
(`src/components/ui/combobox.tsx`). No se usan `<select>` nativos.

-   **Buscador interno solo con más de 7 opciones**
    (`MAXIMO_SIN_BUSCADOR`). Con 7 o menos es una lista simple, con el
    mismo botón y el mismo popup (por dentro, el `Select` de Base UI, que
    es el control accesible cuando no hay buscador: las letras saltan a la
    opción). `buscador` lo fuerza en un sentido u otro (la hora de
    `CampoFechaHora` va sin buscador).
-   **Mismo alto que los campos de la pantalla:** `triggerClassName` con
    la clase de los inputs de al lado (`.campo` de 48 px, el campo de Mi
    perfil o el de la pantalla) más `cursor-pointer`; nunca menos de 44 px.
-   **Label** con `<label htmlFor>` apuntando al `id` del botón.
-   **Error de campo en rojo:** `aria-invalid` y `aria-describedby`
    (`ariaErrorCampo`) van al botón; `requerido` le pone `aria-required`.
    `useErroresCampo` lo enfoca y lo marca como a cualquier campo.
-   **Formularios:** con `name`, el valor viaja en un input oculto, así el
    formulario lo manda igual que un `<select>` (también un GET sin
    JavaScript, con el valor inicial).
-   **Controlado** (`valor` + `onCambiar`) o **no controlado**
    (`valorInicial`), por ejemplo en los filtros GET de Postulaciones de la
    oficina, que se renderizan en el servidor; un `key` que cambia lo
    reinicia.
-   Opciones deshabilitadas (`deshabilitada`): en `muted-foreground`, no se
    pueden elegir.
-   **Enviar al elegir** (`enviarAlCambiar`, con `name`): elegir una opción
    distinta envía el formulario que lo contiene; para filtros de un
    listado (sección 23).

Para selección múltiple, mostrar elementos seleccionados de manera clara
y removible (chip blanco con borde verde, como la etiqueta de rubro
verde): `MultiCombobox`. Como filtro de una sola línea (rubros de
`/ofertas` en el celular), con `resumen` muestra un texto corto de lo
elegido en lugar de los chips.

Selección única con búsqueda: `Combobox` (`src/components/ui/combobox.tsx`).
Un botón que muestra la opción elegida con un chevron y abre el mismo
popup que `MultiCombobox` (`PopupCombobox`: lista con check, opciones de
44 px, "sin resultados"), con un campo "Buscar…" arriba de la lista. La
primera opción puede ser "todos" (`opcionVacia`, valor `""`). Con `name`,
el valor viaja en un input oculto, así el formulario lo manda como un
`<select>` (también un GET sin JavaScript, con el valor inicial).
Teclado: Enter o flecha abajo abren con el foco en el buscador, las
flechas recorren, Enter elige y Escape cierra; el foco vuelve al botón.
Lo usa el rubro del buscador del inicio (botón de 52 px, sin borde desde
md, texto de 16 px, 220 px de ancho).

Dónde se usa: el rubro del registro de la empresa y de "Corregir
solicitud"; "¿De dónde sos?" (`CampoLocalidad`, en el registro y en Mi
perfil); nivel educativo, situación laboral y disponibilidad de Mi
perfil; los filtros Oferta y Orden de Postulaciones de la oficina;
"Corregir estado de la empresa" y "Asignar curso"; la hora y los minutos
de `CampoFechaHora`.

------------------------------------------------------------------------

# 17. Card

Clase `.tarjeta`:

-   superficie blanca;
-   borde 1 px `border`;
-   radius 16 px;
-   sombra mínima `--sombra-tarjeta` (`0 1px 3px rgb(0 30 15 / .06)`),
    para separarla del fondo con degradé (sección 11, "Fondo de las
    pantallas"). Las filas y el contenedor del componente `Tabla` llevan
    la misma.

`.tarjeta-clickeable` (además de `.tarjeta`): al pasar el mouse se eleva
2 px con una sombra suave y el borde pasa a `border-strong`.

`.tarjeta-panel` (además de `.tarjeta`), en las pantallas del postulante:
radio 18 (`radius-indicador`) y padding `22px 24px` (`18px 16px` en el
celular).

Ícono de sección (`IconoCuadro`, `src/components/ui/icono-cuadro.tsx`):
ícono blanco de lucide en un cuadrado de color (`primary` por defecto),
`aria-hidden`. Tamaños: 40 px (radio 11, ícono de 20), 44 px (radio 12,
ícono de 22) y 56 px (radio 16, ícono de 28). Va junto a los títulos de
bloque del panel, en los cuadros de estado, en la línea de tiempo y en las
invitaciones.

Una card debe agrupar información relacionada.

No utilizar una card solamente para envolver cada texto o métrica.

------------------------------------------------------------------------

# 18. JobCard

Componente específico del Portal.

Estructura recomendada:

``` text
┌────────────────────────────────────────────┐
│ [icon/logo]  Desarrollador Frontend        │
│              Empresa                       │
│                                            │
│ 📍 Funes        Jornada completa           │
│                                            │
│ [Tecnología] [React] [Junior]              │
│                                            │
│ Publicada hace 2 días       Ver oferta →   │
└────────────────────────────────────────────┘
```

## Prioridades

1.  puesto;
2.  empresa;
3.  ubicación/modalidad;
4.  condiciones relevantes;
5.  categorías;
6.  antigüedad;
7.  acción.

Evitar llenar la card de información secundaria.

------------------------------------------------------------------------

## Tarjeta de oferta (inicio y panel)

`src/components/ofertas/tarjeta-oferta.tsx` (`TarjetaOferta`). `.tarjeta`
con `.tarjeta-oferta` (decoración en `globals.css`, bloque "Ambiente"),
padding 24, gap 14:

``` text
┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  franja verde de 4 px
│ [Gastronomía +1] [Presencial] [Te …]  [💼] │  ícono 44 px (tinte desde acá)
│ Ayudante de cocina                         │  20 px 700, hasta 2 renglones
│ Restaurante El Molino                      │  15 px 600 texto-bajada
│ 📍 Funes    🕒 Jornada completa             │  14 px muted, íconos 16 px
│ [ Ver oferta ]                             │  tonal (primario: "Postularme")
└────────────────────────────────────────────┘
```

Decoración (ronda 5, tinte verde). Todas las ofertas usan el verde
institucional: una oferta puede tener varios rubros, así que el color no
depende del rubro; los rubros van solo en las etiquetas.

-   Fondo: `radial-gradient(circle at 100% 0, rgb(0 104 51 / .16),
    transparent 62%)` sobre blanco. El tinte sale de la esquina superior
    derecha y se apaga hacia abajo a la izquierda.
-   Borde: 1 px `rgb(0 104 51 / .35)` y arriba 4 px `primary`. El radio
    es el de `.tarjeta`. `position: relative`, `isolation: isolate` y
    `overflow: hidden`.
-   Ícono (`.tarjeta-oferta-icono`, `aria-hidden`, sin clics): cuadrado
    de 44 px con radio 12, fondo `primary`, sombra `0 6px 14px rgb(0 30
    15 / .18)`, a 16 px de arriba y de la derecha, con `Briefcase` blanco
    de 22 px (trazo 2). La fila de etiquetas lleva 48 px de padding a la
    derecha para no pasar por debajo; el título siempre empieza debajo
    del ícono porque la fila tiene al menos la modalidad (26 px).
-   Botón "Ver oferta" tonal (`.tarjeta-oferta-tonal`, variante de
    `.btn-secundario` solo para esta tarjeta): fondo `rgb(0 104 51 /
    .12)`, sin borde visible (queda transparente para medir lo mismo),
    texto `primary-hover`; con el mouse sobre la tarjeta, fondo al 20 %.
    Alto mínimo 44 px. La versión primaria ("Postularme") no cambia.
-   Hover: sube 3 px y sombra `0 12px 28px rgb(0 30 15 / .14)`, en
    180 ms. Sin movimiento con `prefers-reduced-motion: reduce` (la
    sombra sí cambia).
-   Foco del título: el anillo `--sombra-foco` se dibuja en la tarjeta
    (`:has(h3 a:focus-visible)`), porque el `overflow: hidden` recortaría
    el del link.
-   Contraste (peor caso, sobre el tinte al 16 %): `muted-foreground`
    4,75:1, `texto-bajada` 8,27:1, título 11,95:1 (5,40:1 en verde al
    pasar el mouse); botón tonal 6,07:1 (5,39:1 con hover); las etiquetas
    tienen su propio fondo blanco (9,25:1 y 10,35:1); ícono 6,94:1.
-   En un contenedor con scroll (el carrusel) la elevación necesita unos
    20 px libres arriba y 40 abajo: el carrusel los da con padding y los
    compensa con márgenes negativos.

-   Etiquetas: rubro (`EtiquetaRubro verde`, el primero y "+N"),
    modalidad (`EtiquetaRubro`) y badges extra (`Te invitaron` warning,
    coincidencia).
-   Fila de datos: lugar (`MapPin`), jornada (`Clock`) y, opcional,
    cuándo se publicó (`publicada`, ícono `CalendarDays`, mismo estilo):
    "Publicada hoy", "Publicada ayer", "Publicada hace 3 días", "Publicada
    hace 2 semanas", "Publicada hace 1 mes". Se arma en el servidor con
    `formatAntiguedadPublicacion` (`src/lib/fechas.ts`), contando días
    calendario en Argentina, para que no cambie al hidratar. Por ahora
    solo lo pasa el carrusel del inicio.
-   El título es el link y cubre la tarjeta (un paso de teclado por
    oferta); el botón de abajo es visual. Una acción extra con su propio
    link va por encima: `Buscar postulantes` de la oficina, en
    `btn-primario` (verde) con el ícono `UserSearch`, porque es su acción
    principal en la tarjeta; "Ver oferta" sigue tonal. Si no entran en una
    fila (tarjetas angostas, 375 px), "Ver oferta" baja a la siguiente.
-   El listado `/ofertas` también usa `TarjetaOferta` (`JobCard` se
    borró): grilla de 3, 2 o 1 columnas según el ancho del contenido
    (`@4xl:` y `@xl:`), "Te invitaron" para el postulante y "Buscar
    postulantes" para la oficina.
-   Sin logo de la empresa (está en el bucket privado de avatares): el
    detalle y las invitaciones muestran sus iniciales en un círculo verde
    (`InicialesEmpresa`, 64 o 44 px).

## Carrusel

`src/components/public/carrusel-ofertas.tsx`. Título de 26 px 800 y
bajada; a la derecha el link "Ver todas las ofertas" y dos botones
redondos de 44 px (anterior / siguiente, con `aria-label`, deshabilitados
en los extremos).

-   Scroll horizontal con `scroll-snap`; 3 tarjetas desde 896 px de ancho
    disponible, 2 desde 576 px y una (85 %, mostrando el borde de la
    siguiente) más angosto.
-   Las flechas desplazan una página; con teclado se llega a cada
    tarjeta. Desplazamiento suave, sin animación con
    `prefers-reduced-motion`.
-   Debajo, puntos de posición (`aria-hidden`): pastilla de 24 × 8 verde
    para la página actual y puntos de 8 px `punto-carrusel`.
-   Si todas las tarjetas entran, no hay flechas ni puntos.
-   La lista lleva 24 px de padding arriba y 44 abajo (con `-mb-10`) para
    que el scroll horizontal no recorte la elevación ni la sombra de las
    tarjetas; a los costados, 4 px.

### Pase automático

-   Cada 7 segundos (`INTERVALO_MS`, el tiempo de leer una tarjeta)
    avanza **una tarjeta**, no una página, con el mismo desplazamiento
    suave. Desde la última vuelve a la primera, también con
    desplazamiento suave. Los puntos marcan la página con más tarjetas a
    la vista.
-   Se pausa mientras el mouse está sobre las tarjetas, hay foco dentro
    de ellas, un dedo las toca o desliza, la pestaña está oculta
    (`visibilitychange`) o el carrusel está fuera de la pantalla
    (`IntersectionObserver`). Al terminar la causa retoma con los 7
    segundos completos. Las pausas por mouse, foco y toque se miden sobre
    la lista de tarjetas y no sobre los botones, para que el botón de
    reanudar y las flechas funcionen con el mouse o el foco encima.
-   Usar las flechas, o deslizarlo a mano, reinicia el conteo.
-   Botón de pausa y reproducción a la izquierda de las flechas, con el
    mismo estilo (redondo de 44 px): ícono `Pause` o `Play`,
    `aria-label` "Pausar el carrusel" o "Reanudar el carrusel" y
    `aria-pressed`. Pausado con el botón queda pausado hasta que el
    usuario lo reanude; el mouse y el foco no lo reanudan.
-   Con `prefers-reduced-motion` arranca pausado; el botón lo inicia y
    cada paso es sin animación.
-   Sin flechas (todas las tarjetas entran) no hay pase automático ni
    botón.
-   Accesibilidad: la sección lleva `aria-roledescription="carrusel"` y
    su título. Un texto solo para lectores ("Página 2 de 3") va con
    `aria-live="off"` mientras avanza solo y `"polite"` cuando está
    pausado o lo mueve el usuario. El pase solo desplaza la lista: nunca
    mueve el foco.

------------------------------------------------------------------------

# 19. CandidateCard

Para Empresa y Municipalidad.

Debe permitir identificar rápidamente:

-   nombre;
-   categorías laborales;
-   información profesional resumida;
-   estado de la postulación;
-   fecha;
-   acción disponible.

No mostrar datos sensibles que no correspondan al contexto o permiso del
actor.

------------------------------------------------------------------------

# 20. Badge

Componente único: `src/components/ui/badge.tsx`.

``` tsx
<Badge tono="success" estado>Publicada</Badge>
<Badge tono="warning" icono={Clock}>Funes · Sin verificar</Badge>
```

-   pastilla de 26 px de alto, padding `0 10px`, radio 13 px;
-   13 px, 700, sin salto de línea. Si no entra en su contenedor
    (`max-w-full`), el texto se acorta con puntos suspensivos y, si es
    texto simple, el badge lleva un `title` con el texto completo;
-   `multilinea`: el texto pasa de línea dentro de la pastilla (mínimo
    26 px, padding vertical 5 px, interlineado 1,25). Para cuadros
    angostos donde la etiqueta es la información (los indicadores del
    panel del postulante);
-   ícono opcional de 14 px (`icono`);
-   variante `estado`: punto de 8 px del color del texto antes de la
    etiqueta;
-   fondo sólido del tono y texto blanco; `warning` usa `accent` con
    `accent-foreground`.

Tonos: `info`, `teal`, `success`, `neutral`, `warning`, `danger`,
`violet`. `claseTono(tono)` da las mismas clases para un elemento que no
es un badge (el ícono de una notificación, un aviso corto).

Los helpers de estado devuelven el **tono**, nunca clases sueltas.

## Etiqueta de rubro

`src/components/ui/etiqueta-rubro.tsx`. No es un estado: rubros,
modalidad, jornada, motivos de coincidencia.

-   fondo blanco, borde interno 1,5 px `muted-icon`, texto
    `muted-foreground-strong`, 13 px 600;
-   variante `verde`: borde `primary` y texto `primary-hover`;
-   el texto pasa de línea dentro de la etiqueta (`break-words`, también
    una palabra larga) y nunca supera el ancho del contenedor; donde
    tiene que quedar en una línea (el rubro de `TarjetaOferta`), se acorta
    con un `span` `truncate` y `title`.

No convertir párrafos o información extensa en badges.

------------------------------------------------------------------------

# 21. Tonos por estado

**El componente visual no inventa estados**: los estados vienen del
dominio y cada helper los mapea a un tono en un único lugar.

  Dominio           Estado                                    Tono        Helper
  ----------------- ----------------------------------------- ----------- ------------------------------------------------
  Postulación       Recibida                                  neutral     `badgePostulacion` (`lib/mis-postulaciones.ts`)
  (postulante)      En revisión                               info
                    Enviada a la empresa                      teal
                    Seleccionado                              success
                    No seleccionado / Oferta cerrada /        neutral
                    Retirada
  Postulación       Recibida                                  neutral     `BADGE_ESTADO_VISIBLE` y `FILETE_ESTADO_VISIBLE`
  (oficina)         En revisión / con pre-entrevista          info        (`lib/admin/postulacion-estados.ts`)
                    Derivada                                  teal
                    Contratado                                success
                    No seleccionado (oficina o empresa)       danger
                    Retirada / Cerrada (oferta retirada)      apagado
  Oferta            Borrador                                  neutral     `ESTADO_OFERTA_EMPRESA_TONO`,
                    En revisión / pendiente                   warning     `getOfertaEstadoBadge`
                    Activa / publicada                        success     (`lib/oferta-estados.ts`)
                    Rechazada                                 danger
                    Vencida                                   danger
                    Cerrada                                   neutral
                    Modificada / Corregida (por revisar)      info
                    Nueva (por revisar)                       teal
  Empresa           Pendiente / Reenviada                     warning     `/admin/empresas`
                    Aprobada                                  success
                    Rechazada                                 danger
  Derivación        Por contactar                             warning     `DERIVACION_ESTADO_TONO`
                    Entrevista coordinada                     info        (`lib/derivacion-estados.ts`)
                    Seleccionado                              success
                    No seleccionado / Cerrada / Se retiró     neutral
  Pre-entrevista    Sin coordinar / Cancelada                 neutral     `PRE_ENTREVISTA_TONO`
                    Coordinada                                info        (`lib/pre-entrevistas.ts`)
                    Realizada                                 success
                    No asistió                                warning
  Procedencia       De Funes verificado                       success     `BadgeProcedencia`
                    De Funes sin verificar                    warning
                    Otra localidad                            neutral
  Comprobante       En revisión                               warning     perfil y `/admin/comprobantes`
                    Aprobado                                  success
                    Rechazado                                 danger
  CV                Sin CV                                    warning     `/admin/postulantes`
  Curso             Necesita curso / Cuenta para el curso     warning     `ESTADO_CURSO_TONO` (`lib/cursos.ts`)
                    Asignado / En curso                       violet
                    Completado                                success
                    Abandonado                                neutral
                    Curso activo / inactivo                   success / neutral
  Invitación        Pendiente / Por invitación                warning     `TONO_INVITACION` (`lib/invitaciones.ts`),
                    Aceptada                                  success     `BadgePorInvitacion`
                    No interesado / Dijo que no               danger
                    Vencida                                   neutral
  Coincidencia      Alta                                      success     `COINCIDENCIA` (`lib/invitaciones.ts`)
                    Media                                     warning
                    Baja                                      neutral
  Cuenta oficina    Activa / Desactivada                      success / neutral
  Contadores        Pendientes del panel de la oficina        warning     `CuadroEstado` + `ChipAccionCuadro` (gris si es 0)
                    Cantidad de una pestaña                   ---         `PestanasEstado`: gris; verde en la activa

Contraste de cada tono: ver la sección 5 (todos superan 6,5:1).

------------------------------------------------------------------------

# 22. Tables

Usar tabla cuando el usuario necesite comparar varias entidades por
columnas.

Ejemplos:

-   gestión municipal;
-   empresas;
-   ofertas;
-   postulaciones administrativas.

Características:

-   header diferenciado suavemente;
-   filas con altura cómoda;
-   hover discreto;
-   acciones al extremo derecho;
-   empty state;
-   loading state;
-   paginación cuando corresponda.

### Estado vacío del directorio público de ofertas

En `/ofertas`, distinguir los resultados vacíos por búsqueda, filtros o
ambos del error de carga. La tarjeta de estado vacío usa superficie
blanca, borde sólido y mantiene el ancho disponible del listado, con su
contenido centrado.
El título es «No encontramos ofertas con esos filtros» y el
texto de apoyo es «Probá con otro rubro o modalidad, o quitá algún filtro
para ver más ofertas laborales.».
El texto de apoyo es de al menos 14 px y contraste AA. «Limpiar filtros» es la única acción principal y quita la búsqueda y los
filtros activos. La acción mantiene su ancho natural también en mobile.
Anunciar resultados vacíos con una región
`aria-live="polite"`; los errores se presentan por separado y permiten
reintentar.

**Con sugerencia de modalidad.** Si hay modalidades elegidas y existen
ofertas de los mismos rubros (y del mismo texto) en otras modalidades, el
texto de apoyo lo dice: «No hay ofertas de Gastronomía en modalidad
Remoto, pero hay 3 en modalidad Presencial.». Las acciones principales son
un link por cada modalidad con ofertas («Ver las 3 en modalidad
Presencial», mismo estilo que «Limpiar filtros»), que cambia la modalidad
elegida por esa y conserva los rubros y el texto. «Limpiar filtros» pasa a
ser un link de texto `primary` debajo. Sin sugerencia, el estado vacío de
siempre.

El buscador va en la banda verde y los rubros en «Explorá por rubro»
(ver «Listado de ofertas»). Las modalidades son botones de 44 px en todos
los tamaños.
Esta superficie usa los tokens locales `ofertas-*` para la paleta solicitada
por el módulo, sin cambiar los colores institucionales globales.

En mobile no forzar tablas ilegibles: utilizar cards o una
representación responsive definida.

## Tabla con separadores (lista de postulantes)

Una sola marca para los dos formatos (`/admin/postulantes`):

-   Desde 896 px de ancho disponible: tarjeta (radio 16, `overflow
    hidden`) con encabezado de 12 px 700 en mayúsculas, letter-spacing
    `.06em`, color `neutral`, fondo `tabla-encabezado`. Filas con
    padding 12 × 20, gap 16, borde superior `tabla-borde`, hover
    `tabla-hover`. La acción va a la derecha (botón neutro de 40 px y 14
    px).
-   Columnas: la misma técnica que el componente Tabla (abajo). Una sola
    grilla para toda la lista; el encabezado, cada grupo, su lista y
    cada fila son `subgrid` de ella, así que los rótulos quedan sobre su
    columna y la columna `auto` de las acciones mide lo mismo en todas las
    filas (tengan "Asignar curso" y "Ver perfil" o solo "Ver perfil"). El
    separador de grupo ocupa todo el ancho (`col-span-full`). No usa el
    componente `Tabla` porque las filas van agrupadas por nivel con un
    separador entre grupos y la tarjeta angosta ordena los datos distinto
    (DNI y localidad en el mismo renglón).
-   Separadores de grupo: fila con fondo `tabla-separador`, el badge del
    grupo, el título en 14 px 700 y "· N" con el total del grupo según los
    filtros. Con el filtro por procedencia (sección 23) queda solo el
    separador del nivel elegido.
-   Más angosto: cada fila es una tarjeta (foto y nombre arriba, datos
    debajo, badges que bajan de renglón y la acción a todo el ancho); los
    separadores quedan como franjas redondeadas.
-   El encabezado de columnas es visual (`aria-hidden`); cada celda lleva
    su rótulo para lectores de pantalla.
-   Paginación con números: `<Paginacion variante="numeros" />`
    ("Página N de M" a la izquierda; Anterior, números y Siguiente de 44
    px a la derecha; la actual en verde y "…" si son muchas). El total
    ("Mostrando X–Y de N") va en la fila de filtros.

## Componente Tabla (empresa y oficina)

`src/components/ui/tabla.tsx` (`Tabla`, `FilaTabla`, `CeldaTabla`,
`CeldaPersona`, `CLASE_ACCION_FILA`). Mismo criterio que la lista de
postulantes, con un componente para no repetir las clases:

-   Desde 896 px de ancho disponible (`@4xl`): contenedor con borde 1 px
    `border`, radio 16, `overflow hidden` y fondo blanco. Encabezado de 12
    px 700 en mayúsculas, letter-spacing `.06em`, color `neutral`, fondo
    `tabla-cabecera`, padding 12 × 16. Filas de 15 px con padding 14 × 16,
    borde inferior `tabla-borde` y hover `tabla-fila-hover`.
-   Las columnas son un `grid-template-columns` (`columnas`) de una sola
    grilla; el encabezado, la lista y cada fila son `subgrid` de ella, así
    que cada rótulo queda alineado con su columna aunque haya columnas
    `auto` (la de la acción mide lo mismo con el encabezado vacío que con
    el botón). Encabezado y filas tienen el mismo padding a la izquierda
    (16) y el mismo espacio entre columnas (16); el texto va a la
    izquierda.
-   La celda "quién" (`CeldaPersona`): foto o iniciales en un círculo de 40
    px y el nombre en 15 px 700 como link; debajo, un badge o un dato.
-   Más angosto: cada fila es una tarjeta (radio 16, padding 16) con los
    mismos datos uno debajo del otro y la acción a todo el ancho
    (`CLASE_ACCION_FILA`: a todo el ancho en la tarjeta, 40 px y 14 px en
    la tabla). Una celda puede mostrar su rótulo en la tarjeta
    (`rotuloVisible`: "Derivado el 3 de octubre").
-   Si la tarjeta ordena los datos distinto que la tabla (Comprobantes:
    nombre, DNI y fecha arriba; localidad y domicilio en `DatosClave`), las
    celdas de cada formato se ocultan con `hidden @4xl:block` y
    `@4xl:hidden`.
-   El encabezado es visual (`aria-hidden`); cada celda lleva su rótulo para
    los lectores de pantalla y la lista tiene `aria-label`.
-   Una celda vacía muestra "—" en la tabla y se oculta en la tarjeta
    (`hidden @4xl:block`). Si la fila no tiene acción, va un `span`
    vacío con esas mismas clases para no correr las columnas.
-   Varias acciones en una fila: un `div` `flex flex-col gap-2
    @4xl:flex-row @4xl:justify-end`, cada botón con `CLASE_ACCION_FILA`,
    de menor a mayor importancia (la principal queda a la derecha). Ver y
    editar van en `btn-neutro`; dar de baja o retirar, en
    `peligroBorde`; renovar o continuar, en primario.
-   **Fila de detalle** (`FilaTabla detalle`): aclaraciones o avisos de la
    fila (franjas, un motivo de rechazo) debajo de sus celdas, dentro de
    la misma fila, con 12 px de separación. En la tabla ocupa solo la
    primera columna (`col-start-1 col-end-2` en la grilla compartida):
    empieza y termina en los bordes de esa columna, el texto largo pasa de
    línea dentro de ella y las demás columnas quedan vacías, así el aviso
    se lee como parte de la primera celda y no de las de al lado. Comparte
    el hover y el borde inferior de la fila; en la tarjeta, va al final y
    a todo el ancho. Las franjas miden lo que su texto (`w-fit
    max-w-full`).
-   **Separador de grupo** (`SeparadorTabla`): título de 14 px 600 a todo
    el ancho, con fondo `tabla-cabecera` en la tabla y entre dos líneas en
    las tarjetas ("Ya invitados a esta oferta"). Las filas de ese grupo
    pueden ir con fondo `surface-tinted`.
-   `FilaTabla id`: ancla de la fila (`scroll-mt-20`). Hoy no la usa
    ninguna pantalla: Mis postulaciones pasó a tarjetas propias (sección
    25).

-   **Como tabla** (`Tabla semantica="tabla"`, con `FilaTabla
    semantica="tabla"` y cada celda con `role="cell"`): roles ARIA
    `table`, `rowgroup`, `row`, `columnheader` y `cell` en lugar de una
    lista. El encabezado (12 px **800**, mayúsculas, `neutral`, fondo
    `tabla-cabecera`) no es `aria-hidden`: en angosto queda `sr-only`, así
    los lectores de pantalla siguen teniendo los rótulos de columna.
-   **Filete de estado** (`FilaTabla filete="before:bg-*"`): una franja
    izquierda de 5 px del color del estado, en la fila de la tabla y en la
    tarjeta; la fila corre su padding izquierdo a 21 px (y el encabezado
    también, para que los rótulos queden alineados).

### Lista de ofertas con filete (Mis ofertas)

-   Columnas `1.75fr / 1.05fr / 1.15fr / .7fr / 1.75fr`: Oferta (título
    como link, 16 px 800, y debajo la fecha en 13 px `muted-foreground`),
    Estado (badge y, si tiene, "Candidatos por contactar"), Rubros (hasta
    2 `EtiquetaRubro verde` y "+n"), Vence (la fecha, con "Vence en N
    días" en `warning-text` si falta poco; "—" si no aplica) y acciones a
    la derecha.
-   Fecha: "Publicada el …" con `publicado_en`; si no hay (borrador,
    pendiente, rechazada sin publicar), "Creada el …". La base no guarda
    la fecha de envío a revisión ni la de cierre.
-   Filete y badge por estado (`ACENTO_ESTADO_OFERTA`,
    `src/lib/empresa/filtro-ofertas.ts`): publicada `success`, pendiente
    de revisión `accent` (texto `accent-foreground`), rechazada y vencida
    `danger`, cerrada y borrador `neutral`.
-   Acciones, siempre en este orden: Ver candidatos (secundario, solo
    activas), Renovar (vencidas), Continuar (borradores), Editar (neutro
    con `Pencil`, `aria-label` "Editar: [título]") y la baja ("Retirar
    oferta" o "Eliminar" con `Trash2`, `peligroBorde`). Cerrada: "Sin
    acciones" en gris. Las acciones disponibles salen de
    `accionesDisponibles`, como antes.
-   Motivo de rechazo en la fila de detalle (solo la columna de la
    oferta).
-   Celular: cada oferta es una tarjeta con el mismo filete; arriba el
    badge (`order-first`), después el título, la fecha, los rubros,
    "Vence: …" con `Calendar` y los botones en dos columnas (el último,
    si son impares, a todo el ancho).

Dónde se usa y con qué columnas:

  Pantalla                                   Columnas
  ------------------------------------------ ------------------------------------------------------------------------
  Oficina · Postulaciones                    Postulante · Oferta y empresa · Fecha · Estado · acción
  Oficina · Empresas                         Razón social · CUIT · Rubro · Persona responsable · Solicitud · acción
  Oficina · Ofertas                          Oferta · Empresa · Fecha · Estado · acción
  Oficina · Comprobantes                     Nombre · DNI · Localidad · Domicilio · Cargado el · Comprobante · Resultado o acciones
  Oficina · Buscar postulantes (oferta)      Postulante · Procedencia · Coincidencia · Invitación · Ver ficha e Invitar; separador "Ya invitados"
  Empresa · Mis ofertas                      Oferta (título, fecha) · Estado · Rubros (+N) · Vence · acciones; filete de estado; motivo de rechazo en la fila de detalle
  Empresa · Mis ofertas (Eliminadas)         Oferta · Eliminada · Restaurar
  Empresa · Detalle de oferta (candidatos)   Candidato · Derivado el · Nota de la Oficina · Estado · acción

## Detalle de la oferta (empresa)

-   "Volver" arriba de la banda. Banda (`botonesBlancos`) con el título de
    la oferta en Georgia, el estado en la pastilla blanca (`junto`), las
    fechas de publicación y de vencimiento en la bajada y los botones de
    hoy: Editar (`Pencil`), Renovar si venció y la baja, todos blancos con
    texto verde.
-   Debajo, dos tarjetas `.tarjeta-panel` lado a lado (`380px / 1fr`
    desde 768 px de ancho disponible; apiladas antes) con la misma altura:
    -   **Datos de la oferta** (`TituloBloque` con `Briefcase`): un `dl`
        donde cada dato lleva su ícono en un `IconoCuadro` de 40 px con
        fondo `primary/10` e ícono `primary`, la etiqueta arriba (13 px 700
        `muted-foreground`) y el valor (16 px 600 `heading`). Rubro `Tag`,
        Modalidad `Monitor`, Jornada `Clock`, Ubicación `MapPin`,
        Vencimiento `Calendar` y Vacantes `Users` ("N vacantes · M
        cubiertas" con `BarraProgreso fina` y "M de N").
    -   La descripción (`FileText`, con "Ver más" a las 8 líneas), los
        requisitos (`ClipboardList`) y los beneficios (`Gift`), separados
        por líneas de 1 px `tabla-borde`. Requisitos y beneficios vacíos no
        se muestran.
-   "Candidatos derivados por la Oficina de Empleo" (`TituloBloque` con
    `Users` y bajada), con la tabla de candidatos de siempre. Sin
    candidatos, `EstadoVacio` con `Users`.

## Lista de datos (`DatosClave`)

`src/components/ui/datos-clave.tsx`: un `dl` en dos columnas, la etiqueta
(14 px 700 `neutral`, 160 px) y el valor (15 px `control-foreground`).
Cuando la lista mide menos de 384 px (una columna angosta o el celular),
la etiqueta va arriba del valor. Los datos sin valor se omiten. La usan los
datos de una oferta, el contacto del candidato, la tarjeta del candidato de
la oficina y los datos de una derivación.

------------------------------------------------------------------------

# 23. Filtros

Los filtros deben ubicarse cerca del listado que afectan.

Orden recomendado:

``` text
[Buscar........................] [Categoría ▼] [Estado ▼] [Más filtros]
```

Los filtros activos deben ser visibles y fáciles de limpiar.

No esconder filtros básicos detrás de un modal en desktop.

## Buscador con botón (listado de ofertas)

`<Buscador boton="Buscar" />`: campo de 52 px, radio 12, borde 1,5 px
`border-campo`, ícono a la izquierda y label oculto (`sr-only`); al lado,
el botón primario "Buscar" de 52 px y padding `0 28px`. En el celular el
botón pasa debajo, a todo el ancho. Sigue buscando sola mientras se
escribe. En `/ofertas` va dentro de un contenedor blanco de radio 16 con
`--sombra-buscador`, sobre la banda verde.

## Pastillas de filtro

`src/components/ui/pastilla-filtro.tsx` (`PastillaFiltro`,
`GrupoPastillas`, `clasePastilla()`):

-   40 px de alto (44 px en el celular), radio 20, borde 1,5 px
    `border-campo`, 15 px 600, texto `control-foreground`;
-   la activa: fondo `primary`, texto blanco;
-   cada grupo lleva su título de 13 px 700 y `role="group"`;
-   `cantidad`: el número va dentro, en un círculo de 28 px (fondo
    `secondary`; en la elegida, blanco con texto `primary`);
-   en el celular, una sola fila con scroll horizontal (sin barra); desde
    sm bajan de renglón;
-   con `unaLinea` (los rubros del listado público, que son muchos)
    siempre van en una sola fila (`FilaDesplazable`): scroll horizontal
    con `.sin-barra-scroll`, un degradé desde `surface` en el borde hacia
    el que hay más y, desde md, flechas de 44 px ("Ver rubros
    anteriores", "Ver más rubros") que aparecen solo si se puede
    desplazar hacia ese lado. La pastilla con foco se desplaza hasta
    quedar visible (con `scroll-padding` para no quedar debajo de la
    flecha) y la activa queda a la vista al entrar. Sin animación con
    movimiento reducido.

Cuando el filtro vive en la URL, cada pastilla es un link que mantiene los
demás filtros y la activa se marca con `aria-current` (`aria-pressed` no
es válido en un link). En una pastilla que es un botón, `aria-pressed`.

**Selección múltiple** (Modalidad en `/ofertas`; los rubros usan las
tarjetas de «Explorá por rubro»): cada pastilla agrega o saca su valor de
la lista (`?modalidad=A&modalidad=B`), así que puede haber varias activas
a la vez; la primera («Todas») saca todas y está activa cuando no hay
ninguna elegida. Tocar una pastilla vuelve a la página 1. Las de Modalidad
de `/ofertas` miden 44 px también desde sm y tienen radio 22
(`clasePastilla(activa, "rounded-[22px] sm:h-11")`).

**Selección instantánea** (rubros y Modalidad de `/ofertas`,
`SeleccionFiltrosOfertas` en
`src/components/public/seleccion-filtros-ofertas.tsx`): las tarjetas de
rubro, las pastillas de Modalidad («Todos» y «Todas» incluidas) y el panel
«Todos los rubros» comparten una selección con `useOptimistic`. Al tocar
una opción se marca o se desmarca en el momento (fondo, tilde y
`aria-current`) y se navega a su link con `router.push` (`scroll: false`)
dentro de `startTransition`. Cada toque parte de la selección optimista,
así que varios seguidos se acumulan; cuando la transición termina, manda
la URL (si la navegación no llega, vuelve a la de la URL). Siguen siendo
links con su `href` real: sin JavaScript, con Ctrl/Cmd/Shift + clic o con
el botón del medio funcionan como un link común; solo se intercepta el
clic simple. Mientras llega la página, la lista de resultados queda con
opacidad .6 y `aria-busy="true"` (`ResultadosPendientes`; sin transición
con movimiento reducido). Los chips de filtros activos y las cantidades
cambian cuando llega la página. El filtrado sigue en el servidor.

## Pestañas de estado

`PestanasEstado` (`src/components/ui/pestanas-estado.tsx`), con subrayado.
Es compartido: cambia en todas las pantallas que lo usan (Mis ofertas de la
empresa; Postulaciones, Ofertas, Empresas, Comprobantes, Postulantes
(procedencia) y Cursos (Activos / Inactivos, con su cantidad según la
búsqueda) de la oficina).

-   contenedor con una línea inferior de 2 px `border` (sombra interna:
    un borde quedaría fuera del área de scroll y recortaría el subrayado);
    en el celular se desplaza de costado (sin barra);
-   cada pestaña es un link de 48 px de alto, padding `0 14px`, 15 px 600,
    color `texto-pestana`, con un subrayado de 3 px transparente que tapa
    el borde del contenedor;
-   la activa: verde, 800, subrayado `primary` y `aria-current="page"`; en
    hover, el texto se pone verde y el subrayado `border-strong`;
-   la cantidad (opcional, también en 0) en una pastilla de 22 px, fondo
    `pastilla-gris` y texto `control-foreground`; en la activa, fondo verde
    y texto blanco.

Filtros con label arriba (Postulaciones de la oficina): cada `Combobox` con su
`.etiqueta-campo` y `.campo` de 48 px, y "Mostrando X de N" a la derecha.
Se aplican solos al elegir una opción distinta de la actual
(`enviarAlCambiar`: el Combobox llama a `form.requestSubmit()`), con los
mismos parámetros de la URL, y vuelven a la página 1. El formulario es el
`Form` de `next/form` con `scroll={false}`: navega sin recargar y el foco
vuelve al filtro que se usó (también eligiendo con Enter). El botón
"Filtrar" (neutro, 48 px) va dentro de `<noscript>`: solo aparece sin
JavaScript. "Limpiar filtros" queda como link.

------------------------------------------------------------------------

# 24. Modal / Dialog

Usar `Dialog` de shadcn/ui (`src/components/ui/dialog.tsx`). Desde la
ronda 9, todos los diálogos del portal (postulante, empresa y oficina)
comparten un solo estilo:

-   ancho 520 px (100 % − 32 px en el celular), radio 20, padding 24 (20
    en el celular), sombra `--sombra-dialogo` y alto máximo de la ventana
    − 32 px con scroll interno;
-   encabezado (`DialogHeader`): título de 20 px 800 `heading` y una sola
    línea de explicación (15 px `muted-foreground`). Con `icono`, el
    ícono va a la izquierda en un círculo de 44 px: `tonoIcono="peligro"`
    (rojo, rechazar), `"teal"` (derivar) o `"primario"` (verde, invitar o
    aprobar), sobre el mismo color al 10 %;
-   botón de cerrar de 44 px arriba a la derecha, con `aria-label="Cerrar"`;
-   resumen opcional (`DialogResumen`): recuadro `tabla-cabecera`
    (`#F3F5F4`), radio 14, con lo que se está confirmando (título,
    empresa, fecha);
-   los campos;
-   pie (`DialogFooter`, el de `BotonesDialogo`): franja `background`
    (`#F4F7F5`) de borde a borde con borde superior, "Cancelar" (neutro) y
    la acción a la derecha; en el celular, apilados con la acción arriba.

`DialogoConfirmacion` arma el diálogo completo y suma las props
opcionales `icono`, `tonoIcono` (por defecto rojo si es destructivo) y
`resumen`; las demás props no cambiaron. Base UI pone `role="dialog"`,
`aria-modal`, atrapa el foco y cierra con Escape.

Estructura:

``` text
(o) Título                                   [X]
    Una línea de explicación
+-----------------------------------------------+
| Resumen (opcional)                            |
+-----------------------------------------------+
Campos
------------------------------------------------- (pie gris)
                              Cancelar   Acción
```

No utilizar modales para procesos largos que deberían ser una página.

## Elegir el tipo de cuenta (`RegisterModal`)

El diálogo de "Registrarme" (`src/components/auth/register-modal.tsx`)
usa el `Dialog` a 480 px (casi todo el ancho en el celular):
"Crear una cuenta" (20 px 800) y "Elegí cómo vas a usar el Portal de
Empleo." (15 px `muted`); dos opciones, una debajo de la otra, que son
links: borde 1,5 px `border`, radio 16, padding 20, mínimo 88 px, ícono
blanco en un cuadrado verde de 48 px (radio 12), título de 17 px 800,
descripción de 14 px `muted` y chevron; hover con borde `primary` y fondo
`background` (`#F4F7F5`), foco con el anillo del proyecto. "Busco
trabajo" lleva a `/auth/registro` y "Quiero publicar ofertas" a
`/auth/registro?tipo=empresa`. Al pie, centrado, "¿Ya tenés cuenta?
Iniciá sesión". Botón de cerrar de 44 px con `aria-label`.

## Diálogo amplio

Ya no existe: la variante `tamano="amplio"` de las pantallas del
postulante se unificó con el diálogo de la ronda 9 (sección 24).

## Opciones tipo radio

`src/components/ui/opcion-radio.tsx` (`OpcionRadio`), dentro de un
`fieldset` con su `legend`:

-   fila con borde 1,5 px `border-campo` y radio 12; toda la fila es el
    label (mínimo 44 px);
-   la elegida: borde `primary` y fondo `opcion-elegida`; el foco se ve
    en toda la fila;
-   `extra` deja algo fuera del label a la derecha (el link "Ver" de un
    CV).

La usan "Elegí con qué CV postularte" (`DialogoElegirCv`), el motivo de
"No me interesa" y el motivo de "No seleccionado" de la empresa (la opción
"Otro motivo" muestra un campo de texto).

Las acciones destructivas requieren confirmación explícita.

------------------------------------------------------------------------

# 25. Dashboard

Los dashboards deben priorizar información accionable.

## Municipalidad

Puede incluir:

-   postulaciones pendientes de revisión;
-   candidatos a derivar;
-   empresas pendientes;
-   ofertas activas;
-   actividad reciente.

## Empresa

Puede incluir:

-   ofertas activas;
-   candidatos derivados;
-   estados recientes;
-   acceso a publicar oferta.

## Postulante

Puede incluir:

-   postulaciones;
-   estado de cada postulación;
-   perfil;
-   ofertas recientes o relevantes.

Las métricas no deben convertirse en grandes cards sin contexto
únicamente para llenar espacio.

## Cuadros de estado (paneles del postulante y de la empresa)

Componente compartido `CuadroEstado` con su grilla (`CLASE_GRILLA_CUADROS`,
`claseCeldaCuadro`) en `src/components/ui/cuadro-estado.tsx`.

**Empresa:** Publicadas (`success`, `CircleCheck`), En revisión (`accent`
con el ícono `accent-foreground`, `Search`), Rechazadas (`danger`,
`CircleX`), Cerradas (`neutral`, `Archive`) y Vencidas (`danger`,
`Clock`). Cada uno lleva a Mis ofertas con su filtro
(`/empresa/ofertas?estado=publicada`, `pendiente`, `rechazada`, `cerrada`,
`vencida`) y cuenta con el mismo criterio (`aplicarFiltroOfertas`), con
el nombre accesible "3 ofertas publicadas. Ver lista".

**Postulante:**

Cinco cuadros: En revisión, Enviadas a la empresa, Seleccionadas, No
seleccionadas y Retiradas. Cada uno es un link a Mis postulaciones
filtrada por su estado (`/mis-postulaciones?estado=en-revision`,
`derivadas`, `seleccionadas`, `no-seleccionadas`, `retiradas`), con el
nombre accesible "3 postulaciones en revisión. Ver lista". No hay cuadro
de "Activas": repetía la suma de En revisión y Enviadas a la empresa.

-   `.tarjeta .tarjeta-panel .tarjeta-clickeable` con un filete superior
    de 4 px del color del estado (`CLASE_CUADRO_ESTADO`,
    `src/components/ui/cuadro-estado.tsx`).
-   Arriba, el ícono en un cuadrado de 40 px del color del estado y un
    `ChevronRight` `muted-icon` a la derecha; debajo, el número (38 px
    800, `heading`) y el nombre (14 px 700). Los textos pasan de línea
    dentro del cuadro: nunca se salen.
-   Colores e íconos (`ACENTO_FILTRO`,
    `src/components/postulantes/acento-estado.ts`): En revisión `info`
    `Search`, Enviadas a la empresa `teal` `Send`, Seleccionadas `success`
    `CircleCheck`, No seleccionadas `neutral` `CircleX` y Retiradas
    `muted-icon` (`#8A988F`) `Undo2`.
-   Grilla sin huecos: en celular, 2 por fila y el último a todo el ancho;
    desde 672 px de ancho disponible, 3 arriba y 2 abajo; desde 1024 px,
    los cinco en una fila.
-   Al pasar el mouse sube 2 px con sombra (sin movimiento con movimiento
    reducido); el foco, con `sombra-foco`.

## Bloques del panel del postulante

Título de bloque de 20 px 800 con su `IconoCuadro` de 40 px a la
izquierda y, si tiene, el link a la derecha ("Ver mis postulaciones",
"Ver todas las ofertas", 15 px 700 `primary` con `ChevronRight`).

-   **Últimos movimientos** (`Activity`) y **Completá tu perfil** (`User`)
    en una fila `1.7fr / 1fr` (apiladas en celular), con la misma altura
    (`ColumnasPanel`), en `.tarjeta .tarjeta-panel`.
-   Últimos movimientos: `LineaDeTiempo` con íconos (sección 30). Cada
    movimiento lleva el ícono de su estado (`ACENTO_ESTADO`), el puesto
    (800) · la empresa (500), el mensaje (14 px `muted-foreground-strong`)
    y "hace X" (13 px `muted-foreground`); el badge a la derecha (debajo
    en angosto). Todo el movimiento es un link a su postulación.
-   Completá tu perfil: anillo de progreso (abajo, «Anillo de progreso»)
    con el texto de prioridad al lado, y el checklist con lo pendiente
    primero: cada pendiente es un link en una fila resaltada (fondo
    `accent` al 18 %, texto `accent-foreground` 700, `TriangleAlert`,
    radio 10, 44 px de alto); lo completo, con `CircleCheck` `primary`.
    "Completar perfil" (`.btn-secundario`) al pie, al primer pendiente.
-   **Ofertas para vos** (`Briefcase`): `TarjetaOferta` en 2 columnas como
    máximo (1 en angosto), con el badge de coincidencia (`success` sólido
    para "Alta coincidencia") y "Postularme".

## Filtro por estado (Mis postulaciones)

`GrupoPastillas` "Estado" (en el celular, una fila con scroll horizontal;
desde `sm`, bajan de renglón), arriba de la lista y debajo de la leyenda
de estados: `PastillaFiltro` de 44 px en todos los anchos, "Todas" y una
por cada cuadro del panel (no hay pastilla "Activas"), con las mismas
etiquetas. La cantidad va dentro, en un círculo de 28 px (13 px 700,
números tabulares) con fondo `secondary` (`#EEF1EF`); en la elegida
(verde sólida), fondo blanco y texto `primary`. Las cantidades de cada estado son las de `indicadores_postulante()` y los
criterios de la lista filtrada son los mismos (`CRITERIO_FILTRO`,
`src/lib/mis-postulaciones.ts`). Cambiar de filtro vuelve a la página 1;
la paginación y "Mostrando X de N" son los de la lista filtrada. Un
`?estado=` no válido (por ejemplo, `activas` de un link viejo) muestra
todas. Un filtro sin resultados muestra `EstadoVacio` `sin-resultados` con un texto por
estado ("No tenés postulaciones retiradas.") y "Ver todas". Los cambios de
filtro no cuentan como pantallas distintas para "Volver".

## Filtro por estado (Mis ofertas)

`GrupoPastillas` "Estado" con `PastillaFiltro cantidad` (44 px, la
cantidad en el círculo de 28 px, la elegida verde sólida, scroll
horizontal en el celular): Todas, Publicadas (activas no vencidas o sin
`vence_en`), Pendientes de revisión, Rechazadas, Cerradas, Vencidas
(activas con `vence_en` pasado) y Borradores. Después, separada por una
línea vertical de 1 px `separador-filtro` (`#C9D4CD`), "Eliminadas" sin
cantidad (`?vista=eliminadas`).

-   `?estado=` acepta `publicada`, `pendiente`, `rechazada`, `cerrada`,
    `vencida` y `borrador`; un valor no válido muestra todas. El filtro va
    en la consulta del servidor, antes de la paginación; "Mostrando X–Y de
    Z" y la paginación son los de la lista filtrada.
-   Las cantidades son conteos del servidor con la búsqueda aplicada
    (`FILTROS_OFERTAS`, `CRITERIO_FILTRO_OFERTAS` y `aplicarFiltroOfertas`
    en `src/lib/empresa/filtro-ofertas.ts`, los mismos del panel).
-   A la derecha, el `Buscador` por título (48 px, ícono `Search`
    adentro, 320 px); debajo y a todo el ancho cuando el contenido mide
    menos de 1024 px. Cambiar de filtro conserva la búsqueda y escribir
    conserva el filtro.
-   Vacío por filtro: `EstadoVacio` con `Briefcase`, "No tenés ofertas
    [estado]." y "Ver todas". Eliminadas vacía: `Trash2` y "No tenés
    ofertas eliminadas.". Con búsqueda, "No encontramos ofertas con ese
    título" y "Limpiar búsqueda".

## Tarjetas de Mis postulaciones

`MisPostulacionesLista`
(`src/app/(dashboard)/mis-postulaciones/mis-postulaciones-lista.tsx`): una
`.tarjeta .tarjeta-panel` por postulación (no usa `Tabla`), con el id de
`anclaPostulacion` (`scroll-mt-20`) para los links del panel.

-   Filete izquierdo de 5 px del color de su estado (`ACENTO_ESTADO`): en
    revisión y recibida `info`, enviada a la empresa `teal`, seleccionado
    `success`, no seleccionado `neutral`, retirada y oferta cerrada
    `muted-icon`.
-   Desde 768 px de ancho disponible, tres columnas `1.6fr / 1fr / auto`
    compartidas por toda la lista (subgrid: la acción mide lo mismo en
    todas): el puesto (18 px 800; link a la oferta solo si está activa) y
    la empresa; el badge del estado, la fecha (`Calendar`) y el CV
    enviado (`FileText`); y la acción ("Retirar postulación" o "Volver a
    postularme"). En el celular, apiladas y la acción a todo el ancho.
-   Los avisos (franjas de retiro, seleccionado, pre-entrevista,
    entrevista coordinada, oferta retirada y modificada) van debajo, a
    todo el ancho de la tarjeta y con un máximo de 680 px desde 768 px.
-   Paginación `numeros`: "Página X de Y" a la izquierda y los botones a la
    derecha.

## Filtro por procedencia (lista de postulantes de la oficina)

`PastillaFiltro` con cantidad (ronda 9), debajo de la banda y arriba del
buscador y de los rubros: "Todos", "De Funes, verificados", "De Funes,
sin verificar" y "Otra localidad o sin informar".

-   Vive en la URL (`?procedencia=verificado | sin-verificar | otra`). Un
    valor no válido muestra todos. Cambiar de pastilla vuelve a la página
    1 y conserva la búsqueda y los rubros; cambiar la búsqueda o los
    rubros conserva la procedencia, y "Limpiar filtros" saca todo.
-   Las cantidades respetan la búsqueda y los rubros, no la procedencia
    elegida (son los mismos totales de los grupos), con el mismo
    `aplicarFiltroPostulantes` (`lib/admin/filtro-postulantes.ts`) que la
    lista. "Todos" es la suma de los tres niveles. Mientras cargan, las
    pastillas se ven sin número.
-   Con un filtro, la lista muestra solo el grupo de ese nivel.
-   Sin resultados por la procedencia sola: `EstadoVacio` `sin-resultados`
    con un texto por nivel ("No hay postulantes de Funes con el domicilio
    verificado.") y "Ver todos". Con búsqueda o rubros, el texto de
    siempre y "Limpiar filtros".

## Barra de progreso

`src/components/ui/barra-progreso.tsx`: alto 10, radio 5, fondo
`progreso-fondo`, relleno `primary`, `role="progressbar"` con
`aria-label` ("Perfil completo al 70%") y `aria-valuenow`. El porcentaje
visible va al lado, en 14 px 700. `fina`: 8 px de alto, radio 4 y fondo
`secondary-hover` (`#E3E9E5`), para las vacantes del detalle de la oferta.

## Anillo de progreso

`AnilloProgreso` (`src/components/ui/anillo-progreso.tsx`, clases
`.anillo-progreso*`): anillo de 96 px con trazo de 10 px, fondo
`secondary-hover` (`#E3E9E5`) y progreso `primary` con extremos
redondeados (en 0 % no se dibuja el progreso). El porcentaje en el
centro, 22 px 800. Es `role="img"` con el valor real en el `aria-label`
("Perfil completo al 71%") desde el primer render.

Al abrir la página el anillo se llena de 0 al valor y el número cuenta a
la par (1,4 s, `cubic-bezier(.2,.7,.2,1)`, .2 s de demora). Es solo CSS:
una variable registrada (`@property --progreso`, entera) que mueve el
trazo (`stroke-dashoffset` con `pathLength="100"`) y el número
(`counter`). Sin movimiento con movimiento reducido. Lo usa "Completá tu
perfil" en el panel; el cálculo del porcentaje es el de
`obtenerCompletitudPerfil`.

`tamano={64}` (`.anillo-progreso-64`): el mismo anillo a 64 px (el trazo
escala con él) con el número de 16 px, en la tarjeta de la foto de Mi
perfil.

## Mis cursos

`src/app/(dashboard)/mis-cursos/page.tsx`, debajo del encabezado con banda.

-   **Resumen** (si hay cursos): `.banda-resumen` (`globals.css`), el
    verde `primary` con los puntos blancos al 9 % de la banda del
    encabezado (cada 24 px; 28 desde `sm`), radio 18, padding `22px 24px`
    (`18px 16px` en el celular) y un aro blanco al 8 % arriba a la
    derecha (decorativo). Adentro, `GraduationCap` en un `IconoCuadro` de
    56 px con fondo blanco al 16 %, la cantidad de cursos completados
    (34 px 800, blanco, números tabulares) y "cursos completados" (o
    "curso completado") debajo, 15 px 600 `sidebar-texto`. Cuenta todos
    los completados, no solo los de la página; si el conteo falla, la
    lista se muestra sin el resumen.
-   **Lista** a todo el ancho, una `.tarjeta .tarjeta-panel
    .tarjeta-clickeable` por curso: `BookOpen` en un `IconoCuadro` de 40
    px, el título como link verde (17 px 800, se estira sobre toda la
    tarjeta) con el badge de su estado, la fecha de su estado ("Completado
    el …", "Empezado el …", "Asignado el …", "Abandonado el …") en 14 px
    `muted-foreground`, la descripción (15 px, hasta 3 líneas), las
    acciones de siempre ("Empezar curso", "Marcar como completado", "Ir al
    curso", por encima del link) y "Ver curso ›" (15 px 700 `primary`) a
    la derecha, centrado; en el celular, abajo.
-   Debajo, `Paginacion` simple ("Mostrando X–Y de Z").

## Notificaciones del postulante y de la empresa

`PaginaNotificaciones banda` usa `ListaNotificacionesAgrupada`
(`src/components/notificaciones/lista-agrupada.tsx`); la empresa pasa
además `rol="empresa"`, que cambia solo los íconos y colores (abajo). La
lista de la oficina no cambia.

-   **Grupos por fecha** (`src/lib/grupos-notificaciones.ts`), dentro de la
    página que se está viendo (la paginación no cambia): "Últimas 24
    horas" (hace menos de 24 h), "Esta semana" (desde el lunes 00:00 de
    Argentina y hace 24 h o más) y "Más antiguas". Se calculan en el
    servidor; solo aparecen los grupos con notificaciones. Título de
    grupo: `<h2>` de 13 px 800 en mayúsculas, `neutral` (`#4F5E55`).
-   **Tarjeta** (`.tarjeta .tarjeta-panel`): el ícono en un `IconoCuadro`
    de 40 px según el tipo: `CircleCheck` `success` (seleccionado),
    `CalendarClock` `info` (`#1D4E9E`; entrevista y pre-entrevistas),
    `Send` `teal` (derivada), `Archive` `neutral` (postulación cerrada);
    los demás tipos, su ícono de siempre en `neutral` sobre `secondary`.
    Después, el título (16 px 800), el texto (15 px
    `muted-foreground-strong`) y "hace X" (13 px). "Ver detalle ›" es un
    link (15 px 700 `primary`, 44 px de alto) a la derecha; en el
    celular, debajo del texto. Las nuevas, con el punto `accent` y el
    fondo resaltado de siempre; se marcan como leídas igual que antes.
-   **Íconos de la empresa** (`IconoCuadro` de 40 px): `Send` `teal`
    (candidato derivado), `CircleCheck` `success` (oferta aprobada y
    solicitud aprobada), `CircleX` `danger` (oferta rechazada y solicitud
    rechazada), `Archive` `neutral` (oferta vencida y candidato retirado)
    y `CalendarClock` `info` (oferta por vencer). Un tipo desconocido, su
    ícono de siempre en `neutral` sobre `secondary`.
-   No hay chips de fecha, lugar o link de las entrevistas: la tabla
    `notificaciones` no guarda esos datos en columnas propias (están
    dentro del texto).
-   Debajo, `Paginacion` simple ("Mostrando X–Y de Z").

## Invitaciones

Borde de 2 px `accent` sobre blanco, título `invitacion-titulo`, badge
warning y botón `.btn-oscuro` (fondo `accent-foreground`, texto blanco).

Pantalla `/invitaciones` (`seccion-invitaciones.tsx`):

-   Pendientes en `.tarjeta .tarjeta-panel`, en dos columnas desde `md`.
-   Sin pendientes: una tarjeta centrada con fondo en degradé verde muy
    suave (`surface-tinted` a blanco), el sobre (`Mail`) en un
    `IconoCuadro` de 56 px con halo (`0 0 0 8px rgb(0 104 51 / .10)`),
    el título y "Cuando la Oficina de Empleo te proponga una oferta, la
    vas a ver acá." Sin ninguna invitación, la misma tarjeta con "No tenés
    invitaciones por ahora." y "Ver ofertas".
-   Respondidas: el título y, a la derecha (debajo en el celular), el
    resumen de todo el historial en chips con un punto de color ("4
    aceptadas", "1 no me interesa", "1 vencida"; solo los que hay). Cada
    fila: el ícono del resultado en un cuadrado de 40 px (`MailCheck`
    `primary` si aceptó; `CircleX` o `Clock` en `neutral` si no le
    interesó o venció), el título, "empresa · respondida el …" (o "venció
    el …"), el badge y "Ver oferta ›" si la oferta todavía se puede ver.

## Pendientes del panel de la oficina

`CuadroEstado` con `pie` y `apagado` (la `TarjetaPendiente` anterior se
borró), en la grilla de cinco (`CLASE_GRILLA_CUADROS`: 2 columnas en el
celular, los cinco en una fila desde 1024 px de contenido). Toda la
tarjeta es el link, con `aria-label` "nombre: número. acción".

-   Con pendientes: filete superior `accent`, ícono blanco en el cuadrado
    `primary`, el número en `heading` y abajo `ChipAccionCuadro`: chip
    `accent` con `accent-foreground`, 13 px 700, "Revisar postulaciones ›".
-   En 0: filete e ícono `muted-icon` (`#8A988F`), el número en
    `muted-foreground` (`#55665C`) y el chip verde "Al día" (`primary` al
    12 % con `primary-hover`) con `CircleCheck`.
-   Sin chevron arriba: la acción ya está en el chip.

## Tarjeta de acceso

`src/components/ui/tarjeta-acceso.tsx` (`TarjetaAcceso`): link con un ícono
en un cuadrado verde de 44 px, título de 17 px 800, descripción de 14 px,
un dato opcional en verde (13 px 700 `primary`, "3 cursos activos") y
chevron. `claseIcono` cambia el color del cuadrado y `elevable` hace que
suba 2 px con sombra. Accesos del panel de la oficina (Cursos verde,
Indicadores teal, Postulantes azul, Cuentas gris; todos `elevable`) y "Más
herramientas" del panel de la empresa, en 2 columnas (1 en el celular).

## Pantallas de la Oficina (ronda 9)

Piezas compartidas para las pantallas de la oficina (rol admin). Las
próximas pantallas de la oficina usan las mismas.

### Badge de estado en la banda (`BadgeBanda`)

`src/components/ui/badge.tsx`. Va en `EncabezadoPagina` `junto`, al lado
del título: pastilla blanca de 30 px, radio 15, 14 px 700
`primary-hover` (`#00532A`) y un punto de 9 px del color del estado
(`tono`: los de `Badge` más `"apagado"`, `muted-icon`, para retirada). Sin
`tono`, el punto va del color del texto (detalle de la oferta de la
empresa).

### Tabla con filete

El `Tabla` de la ronda 8 (`semantica="tabla"`, roles ARIA) con las
columnas por props y `FilaTabla filete` (`before:bg-*` del estado). En el
celular, cada fila es una tarjeta con el mismo filete, el estado arriba y
el botón a todo el ancho (`CLASE_ACCION_FILA`). El botón de cada fila
lleva `aria-label` con el nombre del elemento ("Revisar Contador").

Debajo, `Paginacion variante="numeros"` con `elemento`: "Mostrando X–Y de
Z ofertas" a la izquierda y los números de página a la derecha.

### Persona o empresa en una celda (`CeldaPersona`)

Iniciales (o la foto o el logo, si la consulta ya los trae) en un círculo
de 40 px y el nombre como link. Con `secundario`, el nombre va en 800 y
debajo una línea de 13 px `muted-foreground` (DNI, teléfono o CUIT);
`secundario={null}` da el estilo sin la segunda línea. Sin `secundario`,
el estilo anterior (700), que siguen usando la empresa y el postulante.
Con `secundarioSoloTarjeta`, la segunda línea se ve solo en la tarjeta
del celular, cuando el dato tiene su propia columna en la tabla (el CUIT
en Empresas).

### Chip suave (`Chip`)

`src/components/ui/badge.tsx`. 26 px, radio 13, 13 px 700, ícono de
14 px y fondo claro: `verde` (`primary` al 12 %, texto `#00532A`),
`amarillo` (`accent` al 22 %, `#3A2A00`) y `gris` (`secondary`,
`#33443A`). No es un estado (los estados van en `Badge`): marca un dato
verificado o una característica. Lo usan `ChipLocalidad` y "Email
confirmado" en el detalle de la empresa.

### Chip de localidad (`ChipLocalidad`)

`src/components/postulantes/badge-procedencia.tsx`. Un `Chip` (26 px,
radio 13, 13 px 700, ícono de 14 px). La variante sale del nivel de prioridad
(`varianteLocalidad` en `lib/procedencia.ts`, la misma lógica que
`BadgeProcedencia`):

  Nivel   Fondo                      Texto       Ícono         Texto del chip
  ------- -------------------------- ----------- ------------- ---------------------------------------------------
  1       `primary` al 12 %          `#00532A`   CircleCheck   Funes · Verificado
  2       `accent` al 22 %           `#3A2A00`   Clock         Funes · Sin verificar
  3       `secondary` (`#EEF1EF`)    `#33443A`   MapPin        Otra localidad: {ciudad} (o "Localidad sin informar")

### Detalle en dos columnas

`DetalleConLateral` con `anchoLateral={380}`, `separacion="gap-4"` y
`separacionColumnas="gap-5"`: grid `minmax(0,1fr) / 380px`, 20 px entre
columnas, 16 px entre tarjetas, `align-items: stretch` y la última tarjeta
de cada columna con `flex: 1`, así las dos terminan a la misma altura. Una
columna en el celular. La lateral no es sticky.

### Tarjeta "Decisión" (`TarjetaDecision`)

`src/components/ui/tarjeta-decision.tsx`: filete superior de 4 px
del color de `estado`: `accent` pendiente, `primary` aprobada,
`danger` rechazada),
`Scale` en un cuadrado de 40 px, el título de 20 px 800, la bajada y las
acciones a todo el ancho: la principal (verde) arriba y la de rechazo
(`btn-peligro-borde`) abajo. Una decisión ya tomada va arriba de las
acciones con `ResultadoDecision`: recuadro radio 14 verde suave
(`primary` al 8 %, texto `#00532A`, `CircleCheck`) o rojo suave
(`danger` al 7 %, texto `motivo-rechazo`, `CircleX`), el texto en 15 px
700 ("Aprobada el … por …") y debajo, en 14 px, el motivo.

### Historial de revisión

`LineaDeTiempo variante="historial"`: cada evento con su ícono blanco en
un cuadrado de 40 px, unido al siguiente por una línea de 2 px
`secondary-hover` (`#E3E9E5`); el título en 15 px 800 y la fecha y el
autor en 14 px `muted-foreground`. Íconos (`ICONO_HISTORIAL`): `Send`
gris (enviado), `Search` azul (revisado), `CircleCheck` verde (aprobado),
`CircleX` rojo (rechazado) y `Clock` teal (actualizado). El motivo de un
rechazo va en `nota` con `MotivoRechazo`: recuadro rojo al 7 %, texto
`motivo-rechazo` (`#5A1A12`) y "Motivo:" en negrita.

### Mosaicos de datos (`MosaicosDatos`)

`src/components/ui/mosaicos-datos.tsx`: grid de 3 columnas (1 en el
celular, gap 12). Cada mosaico: borde `secondary-hover`, radio 14, fondo
`tabla-fila-hover` (`#FAFBFA`), el ícono verde en un cuadrado de 38 px
(`primary` al 10 %), la etiqueta de 12 px y el valor de 15 px 700. Con
`ancho`, ocupa toda la fila (los rubros). Los datos sin valor no se
muestran.

`variante="lista"` (detalle de la empresa): los mismos datos uno debajo
del otro, separados por una línea `tabla-borde`, con el mismo ícono de
38 px, la etiqueta de 12 px y el valor en 15 px 600.

### Banda con logo o iniciales

`EncabezadoPagina banda` con `avatar`: a la izquierda del título, un
`AvatarAjustado size="banda" claro`: círculo blanco de 72 px (56 en el
celular) con el logo o las iniciales en `primary` 800.

### Panel (`/admin`)

-   Banda verde: "Hola, {nombre}", "Esto es lo que tiene pendiente la
    Oficina de Empleo." y el botón blanco "Ver indicadores" (`ChartColumn`).
-   "Pendientes" (`TituloBloque`, `Inbox`), con la bajada "Hay N cosas
    para revisar." o "Estás al día." y los cinco cuadros de pendientes.
-   "Accesos" (`TituloBloque`, `LayoutGrid`): cuatro `TarjetaAcceso` con
    su dato en verde (cursos activos, postulantes registrados, cuentas
    activas; Indicadores no lleva).

### Ofertas (`/admin/ofertas`)

-   Banda con el título y la bajada.
-   Las cinco pestañas como `PastillaFiltro` con cantidad (`?estado=`) y,
    al lado, el `Buscador` por título (debajo y a todo el ancho por debajo
    de lg). Las cantidades aplican la misma búsqueda que la lista
    (`aplicarFiltroOfertasAdmin`, `lib/admin/filtro-ofertas.ts`), así
    coinciden siempre.
-   Tabla con filete: Oferta (link y badge "Nueva", "Modificada" o
    "Corregida") 2fr · Empresa (`CeldaPersona` con iniciales) 1.3fr ·
    Fecha en una línea .8fr · Estado 1.1fr · "Revisar" (secundario chico)
    .6fr. Filete: `accent` por revisar, `primary` activa, `danger` vencida
    o rechazada, `neutral` cerrada.
-   Sin ofertas: estado vacío E1 con el texto de cada pestaña.

### Detalle de la oferta (`/admin/ofertas/[id]`)

-   "Volver" arriba de la banda. Banda: el título con `BadgeBanda` y la
    bajada "{empresa} · Enviada el …" o "{empresa} · Publicada el … ·
    Vence el …".
-   Izquierda: "Contenido de la oferta" (`FileText`) con los mosaicos
    (Rubros a todo el ancho, Modalidad, Jornada, Ubicación, Vacantes,
    Duración), una línea y Descripción, Requisitos y Beneficios
    (`SeccionTexto`, compartida con el detalle de la empresa).
-   Derecha, pendiente: "Decisión" (Publicar oferta y Rechazar) y la
    tarjeta de la empresa (logo o iniciales, nombre, estado, razón social,
    CUIT, rubro y "Ver empresa ›").
-   Derecha, en los demás estados: "Postulaciones" (`Users`, el número en
    44 px 800 y "Buscar postulantes para esta oferta" si está activa; en
    rechazada o cerrada solo si recibió alguna), la empresa y "Revisión"
    (`History`) con el historial.
-   Diálogo "Rechazar oferta": ícono `X` rojo, una sola explicación, el
    resumen (título, empresa y fecha de envío), el motivo obligatorio con
    contador y "Rechazar oferta" en rojo sólido.

### Empresas (`/admin/empresas`)

-   Banda con el título y la bajada.
-   Pendientes, Aprobadas y Rechazadas como `PastillaFiltro` con cantidad
    (`?estado=`) y, al lado, el `Buscador` por razón social o CUIT
    (debajo y a todo el ancho por debajo de lg). Las cantidades aplican la
    misma búsqueda que la lista y excluyen las empresas que no confirmaron
    el email (`aplicarFiltroEmpresas`, `lib/admin/filtro-empresas.ts`).
-   Tabla con filete (`accent` pendiente, `primary` aprobada, `danger`
    rechazada): Razón social (`CeldaPersona` con logo o iniciales y el
    badge "Reenviada" si corresponde) 1.6fr · CUIT (`formatearCUIT`,
    `tabular-nums`) 1fr · Rubro 1.2fr · Persona responsable 1.2fr ·
    Solicitud (fecha; la del último reenvío, si lo hay) .8fr · "Revisar"
    (secundario chico, `aria-label` con la razón social) .6fr.
-   En el celular, tarjetas: las iniciales con el CUIT debajo del nombre
    y el rubro, el responsable y la fecha con `Tag`, `User` y `Calendar`.
-   Sin empresas: E1 con `Building2` y el texto de cada pestaña; con
    búsqueda, el estado vacío de búsqueda con "Limpiar búsqueda".

### Detalle de la empresa (`/admin/empresas/[id]`)

-   "Volver" arriba de la banda. Banda con el logo o las iniciales (círculo
    blanco de 72 px, 56 en el celular), la razón social, el `BadgeBanda`
    del estado y "Solicitud enviada el …" o "Solicitud reenviada el …".
-   Izquierda: "Datos de la empresa" (`Building2`) con `MosaicosDatos
    variante="lista"` (Razón social `Building2`, CUIT `Hash`, Rubro `Tag`
    y Descripción `AlignLeft`, si hay) y "Persona responsable" (`User`):
    Nombre `User`, Teléfono `Phone` y Email `Mail` con el `Chip` verde
    "Email confirmado" al lado.
-   Derecha: `TarjetaDecision` y "Historial de la solicitud" (`History`,
    `LineaDeTiempo variante="historial"`: enviada `Send`, reenviada `Clock`
    teal, aprobada y rechazada con el autor, y el motivo en
    `MotivoRechazo`).
    -   Pendiente: "Si la aprobás, …", "Aprobar" y "Rechazar".
    -   Aprobada: filete verde, `ResultadoDecision` "Aprobada el … por …"
        (el autor sale del último evento "aprobada" del historial) y
        "Rechazar" debajo.
    -   Rechazada: filete rojo, `ResultadoDecision` "Rechazada el … por …"
        con el motivo, y "Aprobar".
-   Diálogos: "Rechazar empresa" con `X` rojo, el resumen (razón social y
    CUIT), el motivo obligatorio con su contador y "Rechazar empresa" en
    rojo; "Aprobar empresa" con `CircleCheck` verde y el mismo resumen.

### Comprobantes de domicilio (`/admin/comprobantes`)

-   Banda con el título y la bajada.
-   "Por revisar" y "Revisados" como `PastillaFiltro` con cantidad y, a la
    derecha, "N comprobantes" de la pestaña. Las cantidades usan el mismo
    filtro que la lista (`aplicarFiltroComprobantes`,
    `lib/admin/filtro-comprobantes.ts`). No hay búsqueda.
-   Tabla con filete (`accent` por revisar, `primary` aprobado, `danger`
    rechazado): Postulante (`CeldaPersona` con iniciales, nombre y DNI)
    1.5fr · Localidad (`ChipLocalidad`) .8fr · Domicilio declarado (o
    "Sin informar" en gris) 1fr · Cargado el .9fr · "Ver comprobante" con
    `ExternalLink` 1fr · acciones 1.6fr.
-   Por revisar: "Aprobar" (principal chico con `Check`) y "Rechazar"
    (`btn-peligro-borde`), con `aria-label` "Aprobar el comprobante de
    {nombre}". Revisados: el badge "Aprobado" o "Rechazado", la fecha y
    quién lo revisó debajo (y el motivo del rechazo), alineado a la
    derecha.
-   En el celular, tarjetas con el mismo filete: los rótulos "Domicilio
    declarado" y "Cargado el" a la vista, "Ver comprobante" a todo el
    ancho y los dos botones en dos columnas.
-   Diálogo "Rechazar el comprobante": `XCircle` rojo, el resumen del
    postulante (iniciales, nombre, DNI y fecha de carga), el motivo
    obligatorio con un ejemplo en el placeholder y el contador (500), y
    "Rechazar comprobante" en rojo. El de aprobar, con `CircleCheck`
    verde y el mismo resumen. La ficha del postulante usa el mismo
    componente, sin resumen.

### Cuentas de la oficina (`/admin/cuentas`)

-   Sin "Volver" (es una sección de la sidebar). Banda con el título, la
    bajada y el botón blanco "Invitar cuenta" (`UserPlus`).
-   Cada cuenta, una `.tarjeta .tarjeta-panel`: la foto o las iniciales en
    un círculo de 56 px, el nombre (17 px 800), "Vos" (`EtiquetaRubro
    verde`, borde verde) en la propia, el badge del estado (Activa verde,
    Desactivada gris), el email con `Mail` y "Alta: …" (`Calendar`) ·
    "Último ingreso: …" o "Todavía no ingresó" (`Clock`).
-   A la derecha (abajo y a todo el ancho en el celular): "Desactivar"
    (rojo, `X`) o "Reactivar" (`RotateCcw`), con `aria-label` con el
    nombre. En la propia, el texto gris "No podés desactivar tu propia
    cuenta.".
-   Diálogo "Invitar una cuenta de la oficina": `UserPlus` verde, la
    explicación, Nombre y Apellido lado a lado (uno debajo del otro en el
    celular), Email, Teléfono "(opcional)" y "Enviar invitación" con
    `Send`. Desactivar y Reactivar llevan su ícono (`X` rojo,
    `RotateCcw` verde).

### Piezas que suma la parte 3

-   `Badge tono="apagado"`: gris claro `muted-icon` con texto `heading`
    (retirada; el blanco no llega a AA). `BadgeBanda` acepta los mismos
    tonos.
-   `TarjetaDecision` suma `estado="derivada"` (filete `teal`) y
    `"cerrada"` (filete `muted-icon`); `ResultadoDecision`, los tonos
    `derivada` (teal al 8 %, texto `teal`, `Send`) y `cerrada`
    (`secondary`, texto `muted-foreground-strong`, `Undo2`), y `icono`
    para cambiar el del tono.
-   `BotonesDialogo iconoConfirmar`: ícono a la izquierda del texto de
    confirmar ("Derivar candidato" con `Send`).
-   `Aviso tono="warning" suave`: fondo `accent` al 18 %
    (`rgba(242,183,5,.18)`), texto `accent-foreground` y `TriangleAlert`
    ("Esta acción no se puede deshacer." en un diálogo).
-   `Buscador etiquetaVisible`: la etiqueta arriba del campo
    (`etiqueta-campo`), como la de los filtros de al lado.
-   `GrupoOpciones` (`components/ui/grupo-opciones.tsx`): pastillas de
    44 px con `role="radio"` dentro de un `radiogroup`, un solo paso de
    tabulación y flechas. Lo usan el formulario de oferta y la modalidad de
    la pre-entrevista.
-   `CamposEntrevista`: `modalidadEnPastillas`, `etiquetaLink` y
    `placeholderLink`. Sin esas props (la entrevista de la empresa) sigue
    igual.
-   `FilaArchivoPerfil` suma `nota` (una aclaración o la revisión del
    comprobante) y `className`. `BotonVerArchivo`
    (`components/admin/boton-ver-archivo.tsx`): "Ver CV" o "Ver
    comprobante" (`.btn-neutro` con `ExternalLink`).
-   `DatosCandidato`: DNI, teléfono, email y domicilio en dos columnas (una
    en el celular), etiqueta de 13 px 700 `neutral` y valor de 16 px; sin
    domicilio, `ChipSinCompletar`. Debajo, los rubros de interés como
    `EtiquetaRubro verde` (o "Sin rubros" en gris). Lo usan la ficha de la
    postulación y el perfil del postulante.
-   `InformacionLaboralResumen` suma `encabezado` y `estiloOficina` (los
    datos uno debajo del otro con la etiqueta de 13 px). Sin esas props
    (las fichas de la empresa) sigue igual.

### Colores de estado de una postulación

`BADGE_ESTADO_VISIBLE` y `FILETE_ESTADO_VISIBLE`
(`lib/admin/postulacion-estados.ts`): recibida `neutral` (`#4F5E55`), en
revisión `info` (`#1D4E9E`), derivada `teal` (`#0B5D57`), contratado
`success` (`#006833`), no seleccionado (por la oficina o la empresa)
`danger` (`#B42318`), retirada por el postulante y cerrada porque la
empresa retiró la oferta `apagado` (`#8A988F`). Una pendiente con la
pre-entrevista coordinada lleva el filete azul. Las pantallas del
postulante siguen con `badgePostulacion` de `lib/mis-postulaciones.ts`.

### Postulaciones (`/admin/postulaciones`)

-   Banda con el título y la bajada.
-   Pendientes, Derivadas, Contratado, No seleccionado y Retiradas como
    `PastillaFiltro` con cantidad (`?estado=`). Las cantidades aplican la
    misma oferta y la misma búsqueda que la lista
    (`cantidadesPorPestana`, `filtrarOfertaYBusqueda` y
    `postulantesDeBusqueda` en `lib/admin/postulaciones-pestanas.ts`). Si
    un conteo falla, esa pastilla va sin número.
-   Debajo, una fila (1.4fr / 1fr / 1fr desde md, apilados más angosto):
    el `Buscador` ("Buscar", con el label arriba) y los `Combobox`
    "Oferta" y "Orden", los tres de 48 px. Oferta y Orden se aplican solos
    al elegir; Orden solo existe en Pendientes, Derivadas y Retiradas.
    "Limpiar filtros" debajo, si hay alguno.
-   Tabla con filete (el color del estado): Postulante (`CeldaPersona` con
    la foto o las iniciales, el nombre en 800, "DNI …", `ChipLocalidad` y,
    si está sin verificar, el estado del comprobante en `sin-comprobante`)
    1.7fr · Oferta en 800 con la empresa debajo 1.5fr · Fecha (el rótulo
    cambia por pestaña: "Contratado el", "Rechazado el", "Retirada el")
    .7fr · Estado (badge, "Por invitación" y "Pre-entrevista: 29/10
    12:30" en `info` con `CalendarClock`) 1.2fr · "Ver ficha" (secundario
    chico, `aria-label` con el nombre y la oferta) .6fr. En el celular,
    tarjetas con el estado arriba y la fecha con `Calendar`.
-   Debajo, `Paginacion variante="numeros"` con "Mostrando X–Y de Z
    postulaciones".

### Ficha de postulación (`/admin/postulaciones/[id]`)

-   "Volver" arriba de la banda. Banda: "Postulación de {nombre}" con el
    `BadgeBanda` del estado (y "Por invitación" si vino de una invitación)
    y la bajada "{oferta} · {empresa} · recibida el …" (y "Contratado por
    … el …" debajo, si corresponde).
-   `DetalleConLateral` (380 px, 20 px entre columnas, 16 entre tarjetas):
    las dos columnas terminan a la misma altura.
-   Izquierda:
    -   "Postulante" (`User`): la foto o las iniciales de 72 px, el nombre
        (20 px 800) y `ChipLocalidad`; `DatosCandidato`; "CV elegido para
        esta postulación" como `FilaArchivoPerfil` con "Ver CV"
        (`ExternalLink`) y la aclaración si es un CV anterior o eliminado;
        "Ver ficha completa del postulante ›".
    -   "Oferta" (`Briefcase`): el badge del estado de la oferta arriba a
        la derecha, las iniciales de la empresa (44 px), el título en 800
        y la empresa, las etiquetas (rubros verdes, modalidad y jornada),
        la franja "Modificada tras la postulación" si corresponde, "Vence
        el …" con `Calendar` y "Ver oferta" (`ExternalLink`).
    -   "Historial de estados" (`History`): `LineaDeTiempo
        variante="historial"` (recibida `Send` gris, revisada `Search`
        azul, retirada `Undo2` gris claro, última actualización `Clock`
        teal).
-   Derecha:
    -   `TarjetaDecision`: "Decisión" pendiente (filete amarillo, "Derivá
        la postulación si el perfil encaja con la oferta. Antes podés
        coordinar una pre-entrevista (es opcional).", "Derivar a la
        empresa" con `Send` y "No seleccionar"); no seleccionada por la
        oficina (rojo, `ResultadoDecision` y "Reconsiderar"); "Derivación
        a la empresa" (teal mientras la empresa no responde, verde
        contratado, rojo no seleccionado, gris claro si la empresa retiró
        la oferta; los datos de la derivación y "Corregir estado de la
        empresa"); "Postulación retirada" (gris claro).
    -   "Pre-entrevista" (`CalendarClock`) con el badge del estado ("Sin
        coordinar" gris). El formulario: `CampoFechaHora`, la modalidad en
        pastillas (`GrupoOpciones`, `role="radio"`) y "Lugar" o "Link de
        la videollamada" (placeholder "https://…") según la modalidad, la
        nota interna opcional con contador y "Guardar pre-entrevista"
        (secundario a lo ancho). La coordinada, con su cartel,
        "Reprogramar" (con "Cancelar" mientras se edita) y el resultado
        (Realizada / No asistió).
    -   "Nota interna" (`NotebookPen`), si la hay.
-   Diálogos (`DialogHeader` con ícono y `DialogResumen` con las
    iniciales, el nombre y "{oferta} · {empresa}"):
    -   "Derivar a la empresa": `Send` teal, "La empresa recibirá los
        datos del candidato.", el resumen, `Aviso suave` "Esta acción no se
        puede deshacer.", el aviso del curso si corresponde, la
        recomendación opcional con contador y "Derivar candidato"
        (principal con `Send`).
    -   "No seleccionar candidato": `X` rojo; "Reconsiderar candidato":
        `RotateCcw` verde; "Corregir estado de la empresa": `PencilLine`
        verde; "Marcar la pre-entrevista como realizada": `CircleCheck`
        verde; "El postulante no asistió": `UserX` rojo. Todos con el
        mismo resumen.

### Postulantes (`/admin/postulantes`)

-   Banda con el título y la bajada. Las pastillas de procedencia (ver
    "Filtro por procedencia").
-   Debajo, una fila desde md: el `Buscador` ("Buscar"), el
    `MultiCombobox` "Rubro" (los dos con el label arriba, 48 px) y
    "Mostrando X–Y de Z postulantes".
-   La tabla agrupada por prioridad (decisión 027). Cada grupo lleva un
    filete izquierdo de 5 px de su color (`primary` verificados, `accent`
    sin verificar, `neutral` otra localidad) y una franja
    `tabla-cabecera` con el chip "PRIORIDAD N" (12 px 800 en mayúsculas,
    blanco; `accent-foreground` sobre el amarillo), el nombre del grupo en
    negrita y la cantidad en gris.
-   Columnas: Postulante (foto o iniciales, nombre en 800 y teléfono)
    1.6fr · DNI .8fr · Localidad (`ChipLocalidad` y, si está sin
    verificar, "Sin comprobante", "Comprobante en revisión" o
    "Comprobante rechazado" en `sin-comprobante`) 1.3fr · Rubros (hasta 2
    `EtiquetaRubro` y "+n" con el resto en el `title`, o "Sin rubros" en
    gris) 1.7fr · CV ("CV cargado" con `FileText` verde o el `Chip`
    amarillo "Sin CV"; debajo, el estado del curso y los cursos
    pendientes) .8fr · acciones ("Asignar curso" si corresponde y "Ver
    perfil" secundario con `aria-label`) .7fr.
-   En el celular, cada fila es una tarjeta de una sola columna, con "DNI"
    como prefijo; el filete del grupo va a la izquierda de sus tarjetas.

### Perfil del postulante (`/admin/postulantes/[id]`)

-   "Volver" arriba de la banda. Banda: la foto o las iniciales en el
    círculo blanco de 72 px (56 en el celular), el nombre, el
    `BadgeBanda` de la localidad (el texto de `ChipLocalidad`) y, si
    corresponde, el del curso ("Necesita curso · …" o el estado del curso
    activo). Bajada: "DNI … · N postulaciones · N rechazos de empresas".
    Las acciones en la banda: "Invitar a esta oferta" (si se entró desde
    la búsqueda de una oferta), "N cursos pendientes" (lleva a "Rechazos y
    cursos") y "Asignar curso".
-   Bloques de a dos (una columna en el celular) con la misma altura por
    fila: "Datos del candidato" (`IdCard`, `DatosCandidato`) y
    "Procedencia" (`MapPin`, `ChipLocalidad` arriba a la derecha, la
    localidad y el comprobante como `FilaArchivoPerfil` al pie de la
    tarjeta, con su estado, "Revisado el …", el motivo si lo rechazaron,
    "Ver comprobante" y Aprobar / Rechazar si está pendiente);
    "Currículum vitae" (`FileText`, "N de 5 CVs" a la derecha y cada CV
    como `FilaArchivoPerfil` con "Ver CV") e "Información laboral"
    (`Briefcase`).
-   "Rechazos y cursos" (`ChartColumn`), a todo el ancho: tres números
    (una columna en el celular) con fondo `numero-fondo`, filete
    izquierdo de 4 px (`primary`, `neutral` e `info`), la etiqueta, el
    número de 34 px 800 y una línea de contexto: rechazos en los últimos
    90 días (en `warning-text` desde el umbral del curso), rechazos
    totales y cursos (la cantidad del historial; "Necesita curso", los
    pendientes o "Sin curso pendiente"). Debajo, lado a lado, "Rechazos de
    empresas (N)" (`X` rojo, la oferta, "empresa · fecha",
    `MotivoRechazo` y "Cuenta para el curso") y "Historial de cursos (N)"
    (`BookOpen` verde, el curso como link, su badge, las fechas y la nota
    interna), cada uno en un recuadro con borde y su paginación.
-   "Historial de postulaciones (N)" (`ClipboardList`): tabla con filete
    (el color del estado): Oferta y empresa 1.6fr · Fecha .7fr · Estado
    1.1fr · CV (nombre y "Subido el …") 1.2fr · Pre-entrevista (badge azul
    "Coordinada" con `CalendarClock`, la fecha y la hora en `info` y la
    modalidad; las demás con su badge; o "Sin pre-entrevista" en gris)
    1.2fr · "Ver ficha" .6fr. Al pie, "Mostrando X–Y de Z
    postulaciones" y la paginación.
-   "Invitaciones a ofertas (N)" (`Mail`): una lista con un ícono por
    resultado (`MailCheck` verde aceptó, `Clock` gris vencida, `X` rojo
    no aceptó, `Mail` amarillo pendiente), el título (link a la oferta),
    "empresa · Invitado el … por …", el motivo si no aceptó, "Ver la
    postulación ›" si aceptó y el badge del resultado a la derecha.

## Panel de la empresa

`EncabezadoPagina banda botonesBlancos` "Hola, [razón social]" con "Mis
ofertas" (`List`) y "Publicar oferta" (`Plus`). Después, en este orden y
separados por 28 px:

1.  **Candidatos esperando tu respuesta** (solo si hay; `.aviso-respuesta`):
    fondo `linear-gradient(180deg, rgb(242 183 5 / .18), rgb(242 183 5 /
    .07))` sobre blanco, borde 1 px `aviso-borde` (`#E6CF86`), radio 18 y
    filete izquierdo de 5 px `accent`. `UserCheck` en un `IconoCuadro` de
    44 px `accent` con el ícono `accent-foreground`, el título "Tenés N
    candidatos esperando tu respuesta" (18 px 800) y la bajada. Cada
    candidato en una fila blanca (borde `aviso-fila-borde` `#EADDB0`,
    radio 14): iniciales en un círculo verde de 44 px, el nombre (800) ·
    la oferta, la entrevista con `Calendar` `info` y "Responder ›"
    (`.btn-secundario .btn-chico`, `aria-label` con el nombre y la
    oferta; en el celular, abajo y a todo el ancho).
2.  **Cuadros por estado** (sección 25, «Cuadros de estado»).
3.  Una fila `1.7fr / 1fr` (apiladas en celular): "Candidatos por
    contactar" en `.tarjeta-panel` con `TituloBloque` (`Send`) y una fila
    por candidato (foto o iniciales, nombre, "[oferta] · derivado el
    [fecha]", badge y "Ver candidato" `.btn-secundario .btn-chico`); y
    "Más herramientas": título de grupo de 13 px 800 en mayúsculas
    `neutral` y dos `TarjetaAcceso elevable` (suben 2 px con sombra):
    Candidatos guardados (`Bookmark`, `info`) e Indicadores
    (`ChartColumn`, `teal`).
4.  Si hay ofertas vencidas o por vencer, la `Franja` de aviso de siempre,
    debajo de todo.

## Candidatos guardados (`/empresa/candidatos-guardados`)

`BotonVolver destacado` y `EncabezadoPagina banda` con el título y la
bajada. No hay buscador: la pantalla no tiene búsqueda por nombre (los
nombres llegan de `candidato_para_empresa`, uno por candidato, después
de paginar). Cada candidato es una `.tarjeta .tarjeta-panel` en grilla
(dentro de un `@container`):

-   desde 672 px de ancho (`@2xl`): `64px / 1.2fr / 1fr / auto`; más
    angosta, `52px / 1fr` con la nota y las acciones a todo el ancho;
-   la foto o las iniciales en un círculo de 64 px (52 en angosto;
    `AvatarAjustado size="tarjeta"`; la foto sale de
    `fotosDeCandidatosEmpresa`, como en el panel);
-   el nombre (`<h2>` 19 px 800), el email y el teléfono (15 px
    `muted-foreground-strong`) con `Mail` y `Phone` `primary` de 16 px;
    chips grises (`secondary`, radio 8, 13 px 600 `control-foreground`)
    con "Conocido por: [oferta]" (`Briefcase`) y "Guardado el …"
    (`Bookmark`);
-   la nota privada (`NotaGuardadoEditor`): recuadro con fondo `accent` al
    15 %, borde `aviso-fila-borde` (`#EADDB0`), radio 14; el rótulo "NOTA
    PRIVADA" (12 px 800, `nota-rotulo` `#5C4500`), el lápiz de 44 px
    (`aria-label` "Editar nota"; la edición de siempre), el texto (15 px)
    y "Solo la ve tu empresa." (13 px);
-   las acciones en columna (en fila y repartidas en angosto): "Ver
    perfil" (`.btn-secundario .btn-chico`) y "Quitar"
    (`.btn-peligro-borde .btn-chico`, `aria-label` "Quitar a [nombre] de
    guardados", con la confirmación de siempre).

Debajo, `Paginacion` simple ("Mostrando X–Y de Z").

### Cuenta en revisión o rechazada

Mientras la empresa no está aprobada, todo lo que está bajo
`src/app/empresa/(panel)/` muestra su estado en lugar de la página,
dentro del `AppShell` y a todo el ancho: `EncabezadoPagina` "Hola,
[razón social]" y una `Franja` arriba.

-   **En revisión:** `Franja` de aviso con el reloj, "Tu cuenta está en
    revisión" y el texto normal o el de la solicitud reenviada. Debajo,
    dos tarjetas del mismo alto (una columna en el celular, dos desde
    768 px de contenido): "Estado de tu solicitud", con una
    `LineaDeTiempo` de tres pasos (enviada o reenviada con su fecha, "En
    revisión por la Oficina de Empleo" resaltado como paso actual y
    "Cuenta aprobada: vas a poder publicar ofertas" pendiente, en gris),
    y "¿Qué pasa mientras tanto?", con el plazo de 1 a 3 días hábiles y
    lo que va a poder hacer (publicar ofertas, recibir candidatos
    preseleccionados, coordinar entrevistas) con íconos en cuadrados
    `secondary` de 36 px.
-   **Rechazada:** `Franja` de error "Tu solicitud fue rechazada" con el
    texto y el motivo ("Motivo:" en negrita, en otra línea). Debajo, la
    tarjeta "Qué podés hacer" con la explicación de que, al reenviarla,
    la Oficina la vuelve a revisar, y "Corregir y reenviar solicitud"
    primario (a todo el ancho en el celular).
-   Al pie de los dos, el contacto de la Oficina (`ContactoOficina
    enTarjeta`) en una tarjeta: logo verde, "Oficina de Empleo" y la
    dirección (link a Google Maps), el teléfono, el correo y el horario,
    leídos de `src/lib/oficina.ts`.

------------------------------------------------------------------------

## Indicadores (oficina y empresa)

`/empresa/indicadores` (ronda 8): `EncabezadoPagina banda` con
"Indicadores", su bajada y el selector de período a la derecha; una fila
de tarjetas de número y los gráficos, cada uno en su `TarjetaGrafico
variante="empresa"`. `/admin/indicadores` tiene su propio diseño (ver
"Indicadores de la oficina", más abajo), con las mismas piezas de
gráficos. Los números salen de las funciones de la base (decisiones 019 y
021); la página los pide en el servidor y los pasa a los gráficos por
props. El modo de datos de ejemplo (`INDICADORES_DE_EJEMPLO`) vale para
las dos.

### Selector de período en la banda (empresa)

`SelectorPeriodoDesplegable enBanda` (el de la oficina, abajo): arriba,
el label "Período" (13 px 600 `sidebar-texto` `#E3F0E8`); el botón
blanco de 48 px, radio 12, sin borde ni sombra, con `Calendar` y
`ChevronDown` `primary` y el período en 15 px 700 `primary-hover`
(`#00532A`); hover `sidebar-texto`; foco con un `outline` de 3 px
`accent` (`#F2B705`) separado 2 px. En el celular, a todo el ancho. La
lista y el `?periodo=` son los de siempre.

### Tarjeta de número (`TarjetaNumero`)

`src/components/indicadores/tarjeta-numero.tsx`. La tarjeta de los
cuadros de estado (`CLASE_CUADRO_ESTADO`: `.tarjeta .tarjeta-panel` con
filete superior de 4 px, `claseFilete`): el ícono en un `IconoCuadro` de
40 px (`claseIcono`), el número en 38 px 800 (30 en el celular), la
etiqueta en 15 px 700 `heading` y una línea de contexto de 13 px `muted`.
Con `href`, toda la tarjeta es el link (chevron arriba a la derecha).
`GrillaNumeros`: 4 columnas, 2 en el celular. En la empresa: Ofertas
vigentes (`Briefcase`, `primary`), Candidatos derivados (`Send`, `teal`),
Seleccionados (`Award`, `accent` con el ícono `accent-foreground`) y Días
hasta la contratación (`Clock`, `info`).

### Donas y Por oferta (empresa)

-   "Tus ofertas" y "Tus candidatos" lado a lado desde `lg` (apiladas
    antes), con `GraficoDona variante="anillo"` (abajo). Colores: ofertas
    vigentes `success`, en revisión `accent`, rechazadas y vencidas
    `danger`, cerradas `neutral`; candidatos seleccionados `success`, no
    seleccionados `neutral` y en proceso `info`. La conclusión, en el
    recuadro verde suave de abajo, dice la parte mayor sobre el total
    ("2 de tus 5 ofertas están vigentes.", "Todos tus 3 candidatos están
    en proceso.", "Tu única oferta está vigente."). "Ver datos" al pie,
    como siempre; con total 0, el estado vacío corto de la dona.
-   "Por oferta" (`Briefcase`) con "Ver datos en tabla" en el encabezado.
    Debajo, `LeyendaMedidasOferta` y las tarjetas en 2 columnas desde 672
    px de ancho de la tarjeta (1 antes). Cada una con el filete superior
    del color de su estado (`ACENTO_ESTADO_OFERTA`), el título (16 px 800,
    link al detalle salvo en el modo de ejemplo) y el badge del estado,
    `BarrasOferta` y, al pie, separada por una línea `tabla-borde`,
    "Vacantes cubiertas" con "M de N" y `BarraProgreso`.

### Tarjeta de gráfico (`TarjetaGrafico`)

`src/components/indicadores/tarjeta-grafico.tsx`. Padding 24 (18 × 16 en
el celular); título de 18 px 800 y descripción de 14 px `muted`; un valor
destacado opcional arriba a la derecha (30 px 800 con su etiqueta de 13
px). Debajo, **la conclusión**: una línea de 15 px 700 `primary-hover` con
un ícono, calculada con los datos ("Octubre fue el mes con más
postulaciones: 34", "La mayoría de tus candidatos están en proceso"). Al
final, **"Ver datos"** (`details`/`summary`, 44 px) despliega una tabla
con los mismos números: es la alternativa al gráfico para quien no lo ve.
Con `variante="empresa"`, la conclusión va **debajo** del gráfico, en un
recuadro `surface-tinted` (radio 12, padding 12 × 16) con el texto
`primary-hover`; y con `tablaEnEncabezado` la tabla no va en "Ver datos"
al pie sino en "Ver datos en tabla" (`DesplegarTabla`: `.btn-neutro
.btn-chico` con `Table2` a la derecha del título, `aria-expanded`), que
la despliega debajo del encabezado.
`IndicadorChico` (ícono en un cuadrado `secondary` de 40 px, número de 22
px 800 y texto de 13 px) arma las tarjetas de resumen como "Proceso de la
Oficina".

### Gráficos

Componentes de cliente en `src/components/indicadores/`, sobre el chart
de shadcn/ui (`src/components/ui/chart.tsx`, Recharts) con los colores
ajustados a los tokens: tooltip en `surface` con anillo `border`, texto de
13 px, grilla `tabla-borde` y cursor `border-strong`. Todos llevan
`accessibilityLayer` y un `role="img"` con un `aria-label` que resume el
gráfico. Todos (también los de HTML y SVG propio) se dibujan la primera
vez que entran a la pantalla (abajo, «Animación al verse»).

-   **Paleta**, siempre en este orden (`PALETA_GRAFICOS`): `primary`
    #006833, `accent` #F2B705, `info` #1D4E9E, `muted-icon` #8A988F,
    `violet` #5B3A9E y `teal` #0B5D57. Cada parte toma el color de su
    posición, nunca de su tamaño. El amarillo y el gris no llegan a 3:1
    contra el blanco: por eso cada parte lleva su nombre y su número en la
    leyenda, y está la tabla de "Ver datos".
-   **Área** (`GraficoArea`): una serie en el tiempo. Degradé `primary`
    de .35 a 0, línea de 2 px, curva suave, grilla horizontal tenue, eje Y
    con valores redondos y eje X con fechas ("12 oct", "oct", "ene 26") en
    13 px `muted`, cada una con una marca corta hacia su punto, siempre la
    primera y la última; debajo, a la derecha, el rango del período en
    12 px `muted`. El tooltip muestra la fecha completa y el valor.
-   **Dona** (`GraficoDona`): partes de un mismo total, **hasta seis**.
    200 px, con el total (32 px 800) y la unidad (13 px `muted`) en el
    centro, 2 px de separación blanca entre partes y la leyenda al costado
    (debajo cuando la tarjeta mide menos de 448 px): color, nombre,
    cantidad y porcentaje. La parte más grande sobresale 6 px y se marca
    también en la leyenda (fondo `secondary` y texto 800). Con total 0,
    un estado vacío corto en lugar de la dona. El total del centro no recibe
    eventos del puntero y el tooltip va por encima (`z-index` 10).
-   **Dona anillo** (`GraficoDona variante="anillo"`, indicadores de la
    empresa): SVG propio, sin Recharts ni tooltip. 170 px,
    trazo de 14 sobre un anillo de fondo `secondary` (`#EEF1EF`), un
    círculo por parte con `stroke-dasharray` empezando arriba y en sentido
    horario, 1,5 de separación entre partes (ninguna si hay una sola), y
    el total (34 px 800) con la unidad en el centro. Los tramos los
    calcula `segmentosDona` (`segmentos-dona.ts`, sin imports): las partes
    en 0 no tienen tramo pero siguen en la leyenda. Leyenda al costado
    (debajo en angosto): cuadrado de color, nombre, cantidad y porcentaje.
-   **Barras** (`BarrasOferta`): para comparar cantidades. HTML del
    servidor: una fila por medida con la etiqueta (13 px 600, 104 px) a la
    izquierda, una barra de 12 px sobre `secondary` (derivados `primary`,
    entrevistas `info`, seleccionados `accent`) y el número (13 px 700) a
    la derecha, con la misma escala en todas las ofertas; la leyenda
    (`LeyendaMedidasOferta`) va arriba de las tarjetas.

#### Animación al verse

`useAnimarAlVerse` y su contenedor `AnimarAlVerse`
(`src/components/indicadores/animar-al-verse.tsx`): una sola pieza para
todos los gráficos de los indicadores (empresa y oficina).

-   **Cuándo:** la primera vez que el gráfico entra a la pantalla
    (`IntersectionObserver`, 40 px antes del borde de abajo). Lo que ya se
    ve al cargar se anima al cargar. No se repite al volver con el scroll;
    al cambiar de período el contenido se vuelve a montar y se anima de
    nuevo.
-   **Fases:** `final` (el gráfico completo, lo que manda el servidor),
    `espera` (en cero, puesta antes de pintar para que nunca se vea
    completo y después vacío) y `animando`. Sin JavaScript, con
    `prefers-reduced-motion`, al imprimir o si el `IntersectionObserver`
    no está o falla, queda en `final`: completo y sin animación.
-   **Donas anillo:** cada tramo va de 0 a su largo (`stroke-dasharray`,
    `.grafico-tramo`), en orden. `tiemposDona` (`segmentos-dona.ts`)
    reparte los 800 ms como si el anillo entero se trazara en ease-out:
    cada tramo empieza cuando el trazo llega a su inicio. El total del
    centro aparece con el anillo (`.grafico-centro`, opacidad, 800 ms).
-   **Donas de Recharts** (oficina): `Pie` se monta recién al verse, con
    `animationBegin` 0, 800 ms y `ease-out`; el total del centro aparece
    con ella. **Área:** las líneas se montan al verse con la animación de
    Recharts; los ejes y la grilla están desde el principio.
-   **Barras** (Por oferta, vacantes cubiertas con
    `BarraProgreso animarIndice` y `BarrasVerticales` de la oficina):
    crecen desde 0 con `transform: scale` (`.grafico-barra-x` desde la
    izquierda, `.grafico-barra-y` desde abajo), 600 ms `ease-out`, 60 ms
    entre una y otra (`--i`).
-   **Sin saltos:** el espacio del gráfico está reservado desde el
    principio y solo se animan `transform`, `stroke-dasharray` y
    `opacity`; los anchos, altos y largos finales son los del servidor. El
    contenido y los `aria-label` no cambian.

### Indicadores de la oficina (`/admin/indicadores`)

Ronda 6 (decisión 032, puntos 8 y 9). Fondo de las pantallas internas.
Las tarjetas son `.tarjeta` con radio 18 (`--radius-indicador`), borde
`border` y `sombra-tarjeta`; los títulos de tarjeta llevan un ícono de 20
px `primary` antes del texto. Grillas con gap 16 (24 desde lg).

-   **Encabezado:** `EncabezadoPagina grande`: "Indicadores" en Georgia
    400 (`.titulo-portada`) de 52 px (36 en el celular), `heading`, y la
    bajada de 17 px `muted-foreground`.
-   **Selector de período** (`SelectorPeriodoDesplegable`): a la
    derecha (a todo el ancho en el celular). Botón blanco de 50 px, radio
    16, borde `border` y `--sombra-selector` (0 6px 18px rgb(0 30 15 /
    .08)), con `Calendar` `primary`, el período en 15 px 700 y un
    `ChevronDown` que gira al abrir. La lista, debajo y a la derecha, con
    la misma sombra: opciones de 44 px (15 px; la actual en `secondary`,
    700 `primary` y un check). Botón con `aria-expanded`, Escape cierra.
-   **Fila 1** (`TarjetaTendencia`): 4 columnas desde xl, 2 desde sm y 1
    en el celular. Padding 20: ícono blanco en un cuadrado `primary` de 46
    px, radio 13, y el nombre en 16 px 700; el número en 42 px 800 con la
    mini línea (`LineaTendencia`, 120 × 44, línea `primary` de 2 px y
    relleno al 10 %, `aria-hidden`) a la derecha (debajo si no entra);
    abajo, la variación (`TextoVariacion`, 14 px): "↑ +12 %" en 800
    `primary` si sube, "↓ −8 %" en 800 `muted-foreground-strong` si baja,
    "Sin cambios", "Nuevo en este período" o "Desde el inicio del
    portal", seguido de "vs. período anterior" en `muted-foreground`.
    Debajo, en 13 px, sobre qué se calculó cuando no es el número
    ("24 nuevos en el período"). Toda la tarjeta es el link a su listado.
-   **Fila 2** (1,85fr / 1fr desde xl): "Evolución general" (`GraficoArea`
    con dos series: postulaciones `primary` 2,5 px con área al 16 % y
    contrataciones `grafico-verde-claro` 2 px; puntos de 3 px, eje Y de 5
    marcas, leyenda arriba a la derecha) y "Estado de postulaciones"
    (`GraficoDona variante="resumen"`: 190 px, total en 38 px 800 con
    "Total", leyenda con punto redondo, nombre, porcentaje en 800 y la
    cantidad entre paréntesis; En revisión `primary`, Derivadas
    `grafico-verde-claro`, Rechazadas `grafico-gris`; debajo, en 13 px,
    cuántas retiradas quedaron afuera).
-   **Fila 3** (1fr / 1,3fr / ,95fr desde xl): "Ofertas por área"
    (`BarrasVerticales`: verticales `primary`, radio 8 arriba, hasta 56
    px, valor de 15 px 800 arriba y rubro de 13 px abajo, desde 32 rem de
    ancho de la tarjeta; más angosta, horizontales de 12 px sobre
    `secondary` con el nombre y el valor arriba); "Últimas postulaciones"
    (`Tabla variante="incrustada"`: sin marco, tabla desde 320 px de
    ancho, filas apiladas con una línea entre ellas más angosta; fecha
    con la hora en `muted-foreground`; badges En revisión `primary` con
    texto blanco, Derivada `grafico-verde-claro` y Rechazada
    `grafico-gris` con texto `heading`, los demás estados con su tono de
    siempre; "Ver todas →" de 44 px arriba a la derecha) y "Resumen del
    período" (filas con ícono `primary` en un cuadrado `secondary` de 40
    px, nombre de 15 px 600, variación de 13 px y el valor en 22 px 800).
-   **Debajo:** postulaciones por rubro, resultado de las derivaciones y
    empresas (3 columnas desde xl) y "Proceso de la Oficina", con el
    mismo estilo y sin título de sección aparte.
-   **Colores solo de estos gráficos:** `grafico-verde-claro` #8CC63F y
    `grafico-gris` #C5CEC8. No llegan a 3:1 contra el blanco: siempre con
    nombre y número al lado.
-   **Aparición al scroll** (`AparecerAlScroll`): lo que está debajo de la
    pantalla al cargar aparece al entrar (opacidad y 16 px hacia arriba,
    400 ms, una vez). Lo que ya se ve no se oculta; sin JavaScript o con
    movimiento reducido, todo se ve directamente. No mueve el layout. Los
    gráficos de adentro, además, se dibujan al verse («Animación al
    verse», en Gráficos).

Ver `docs/decisiones/032-graficos-de-indicadores.md`.

------------------------------------------------------------------------

# 26. Landing pública

La landing puede tener mayor libertad compositiva que el panel
administrativo.

Debe mantener:

-   paleta;
-   tipografía;
-   radius;
-   botones;
-   identidad municipal.

Estructura visual sugerida:

``` text
Navegación lateral (sección 12)
Bloque principal: volanta, título, bajada y buscador (con el rubro)
Últimas ofertas (carrusel)
Tu actividad (solo postulante con sesión)
Cómo funciona (solo sin sesión)
Footer (sección 41; ya no hay un bloque de contacto propio)
```

Gap de 48 px entre secciones; títulos de sección de 26 px 800. El
buscador (`role="search"`, hasta 960 px) lleva a `/ofertas` con `q` y
`categoria`; el rubro se elige en su `Combobox` (no hay una lista de
rubros debajo).

## Hero (bloque principal)

Banda verde de radio 24 (padding 56 / 56 / 48, 24 en celular), con las
mismas piezas que el panel verde de `/auth` (sección 27). Clases
`.hero-*` de `globals.css`; componente `src/components/public/hero.tsx`.

-   Fondo y borde `primary`, con puntos blancos al 9 % cada 28 px (24 en
    celular).
-   Textos: título blanco (6,9:1), volanta y bajada `sidebar-texto`
    (`#e3f0e8`, 5,9:1; 5,2:1 en el punto más claro del brillo detrás de
    la bajada).
-   Buscador blanco con borde blanco y `--sombra-buscador` (`0 18px 40px
    rgb(0 30 15 / .35)`).
-   Capa decorativa `.hero-deco` (`aria-hidden`, `inset: 0`, `z-index:
    -1`, `overflow: hidden`, radio heredado):
    -   brillo: círculo de 640 px con `radial-gradient(circle, rgb(255 255
        255 / .12), transparent 65%)`, a −120 px de la derecha y −260 px
        de abajo, que pulsa de .6 a 1 en 8 s;
    -   anillo: círculo de 620 px con borde de 64 px blanco al 6 %, a −200
        px de la derecha y −260 px de arriba;
    -   íconos flotantes (`UserPlus`, `Briefcase`, `Building`, `Search`):
        cuadrados de 52 px, radio 14, blanco al 10 % con borde al 22 % e
        ícono de 22 px, que suben 8 px en 6 s con demoras distintas. Van
        en la zona libre a la derecha del texto y arriba del buscador, y
        solo aparecen cuando el contenido del hero mide 928 px o más
        (container query): nunca tapan el título, la bajada ni el
        buscador, con la sidebar abierta o contraída. Comparten la base
        con `.login-icono-flotante`.
    -   En celular (menos de 640 px): sin brillo ni íconos; el anillo
        pasa a 300 px con borde de 40 px, a −110 px de la derecha y −120
        px de abajo.
-   El hero lleva `position: relative`, `isolation: isolate` y `z-index:
    2`. El recorte de la decoración va en `.hero-deco`, no en el hero, y
    el popup del `Combobox` de rubro se abre en un portal: se ve entero,
    por encima de las secciones siguientes.

## Listado de ofertas (`/ofertas`)

`src/components/public/job-directory.tsx`, de arriba hacia abajo. Todos
los filtros viven en la URL (`q`, `categoria` y `modalidad` repetidos,
`pagina`) y se aplican en el servidor; los links viejos (un solo
`?categoria=`, el buscador del inicio) siguen sirviendo.

### Banda verde (`BandaOfertas`)

Clases `.banda-ofertas*` de `globals.css`.

-   Fondo `primary` con puntos blancos al 9 % cada 28 px (24 en celular),
    radio 24 (20 en celular), padding `40px 44px 36px` (`24px 18px 20px`
    en celular).
-   Capa decorativa `.banda-ofertas-deco` (`aria-hidden`, `overflow:
    hidden`, `pointer-events: none`), para no recortar nada que salga de
    la banda:
    -   anillo de 560 px con borde de 60 px blanco al 6 %, a −180 px de la
        derecha y −240 px de arriba (en celular, 300 px con borde de 40
        px, abajo a la derecha);
    -   `escudo-blanco.png` de 190 px, opacidad .14, rotado −8°, a 56 px
        de la derecha y 22 px de arriba (en celular, 140 px a −30 px de la
        derecha y −26 px de abajo, detrás del buscador).
-   Título «Ofertas de trabajo» en Georgia (`.titulo-display`), blanco, 48
    px (34 en celular); la cantidad de ofertas en `sidebar-texto`
    (`#e3f0e8`); el buscador blanco (ver «Buscador con botón»).

### Explorá por rubro (`ExplorarRubros`)

-   Título h2, sin texto de ayuda debajo. Con sesión de postulante, el
    link «Editar mis rubros» a la derecha del título
    (`hrefSeccionPerfil(SECCION_PERFIL.rubros)`).
-   Una fila de 8 tarjetas: «Todos», 6 rubros y «Ver todos». Cuando la
    sección mide 1024 px o más (container query), ocho columnas iguales;
    si no, una fila con scroll horizontal (`FilaDesplazable` con
    `fondo="background"`) de tarjetas de 112 × 104 px.
-   Qué 6 rubros (`elegirRubrosDestacados`, `src/lib/rubros-destacados.ts`):
    con sesión de postulante, primero los rubros de su perfil que tienen
    ofertas vigentes, por cantidad; si son menos de 6, se completa con los
    que tienen más ofertas; si son más, los 6 con más ofertas. Sin sesión,
    los 6 con más ofertas. A igual cantidad, por nombre. Ninguna etiqueta
    dice «tu perfil». Las cantidades salen de
    `contar_ofertas_vigentes_por_rubro()` (migration_065).
-   Cada tarjeta es un link que agrega o saca su rubro de `?categoria=`
    (conserva el resto, vuelve a la página 1). «Todos» saca todos. Se
    marca al instante (ver «Selección instantánea»).

**Tarjeta de rubro** (`.tarjeta-rubro`): blanca, borde 1,5 px `border`,
radio 16, `--sombra-tarjeta`; ícono de lucide en un cuadrado de 36 px
(30 en la fila desplazable), radio 10, `primary` al 12 % con el ícono
`primary`; el nombre en 14 px 700 (13 px en la fila desplazable; dos
líneas como máximo) y, en los rubros, la cantidad de ofertas en 13 px
`muted-foreground` (12 px). Hover: borde `primary`. Elegida
(`aria-current`): fondo `primary` con puntos blancos al 10 % cada 14 px,
texto blanco, la cantidad en `sidebar-texto` y un tilde blanco en un
círculo de 22 px con borde blanco en la esquina superior derecha.

**«Ver todos»**: botón con borde verde punteado de 2 px, el ícono `List`
y debajo la cantidad de rubros con ofertas («10 rubros»). Si hay rubros
elegidos que no están entre los 6 visibles, se ve como una tarjeta
elegida y muestra el nombre del rubro o «N rubros más»; con la selección
instantánea, también mientras llega la página.

**Mapa de íconos** (`src/lib/rubros-iconos.ts`, `iconoRubro(nombre)`):

| Rubro | Ícono |
|---|---|
| Administración | `FileText` |
| Comercio y Ventas | `ShoppingBag` |
| Construcción | `HardHat` |
| Educación | `GraduationCap` |
| Gastronomía | `UtensilsCrossed` |
| Informática y Tecnología | `Monitor` |
| Logística y Transporte | `Truck` |
| Salud | `HeartPulse` |
| Seguridad | `Shield` |
| Servicios Generales | `Wrench` |
| Rubro nuevo sin entrada | `BriefcaseBusiness` |

«Todos» usa `LayoutGrid`; «Ver todos», `List`. Al agregar un rubro a la
tabla `categorias`, sumarlo al mapa.

### Panel «Todos los rubros» (`PanelRubros`)

Client component cuya única tarea es elegir rubros y cambiar la URL; el
filtrado sigue en el servidor. Usa el `Dialog` del proyecto (Base UI) con
un popup propio:

-   Desde sm, lateral derecho de 400 px; en el celular, pantalla
    completa. Fondo `rgb(8 20 13 / .55)` (`.panel-rubros-fondo`). Entra
    desde la derecha en 200 ms; sin animación con movimiento reducido.
-   Cabecera verde con puntos (`.panel-rubros-cabecera`), el ícono `List`,
    el título «Todos los rubros» y el botón de cerrar de 44 px.
-   Buscador «Buscá un rubro» que filtra mientras se escribe, sin
    importar tildes ni mayúsculas (`normalizarBusqueda`). Debajo, «10
    rubros con ofertas vigentes» (o «N rubros con «texto»») y cuántos van
    elegidos, en una región `aria-live`.
-   Lista en orden alfabético agrupada por letra (sin tilde: «Á» va en
    «A»). Cada fila mide 44 px: casilla, nombre y la cantidad de ofertas
    en un badge (`primary` al 12 %). Marcar una fila no cierra el panel.
    Solo aparecen los rubros con ofertas vigentes.
-   Sin coincidencias: «No hay rubros que coincidan con «texto».»
-   Abajo, fijos: «Limpiar rubros» (tonal: `primary` al 12 %, texto
    `primary-hover`) y «Ver N ofertas» (primario), que aplica la selección
    y cierra el panel. Abre con la selección instantánea vigente y aplica
    con ella (las tarjetas se marcan al cerrar). N se muestra solo cuando se sabe sin otra
    consulta (la misma selección de la URL, o un solo rubro sin texto ni
    modalidad); si no, «Ver ofertas».
-   Accesibilidad: `role="dialog"`, `aria-modal="true"`, título asociado,
    foco atrapado, cierre con Escape o tocando afuera y el foco de vuelta
    en «Ver todos». Al abrir con mouse o teclado el foco va al buscador;
    con el dedo, al botón de cerrar (no abre el teclado).

### Resultados

-   A la izquierda, la cantidad («4 ofertas», h2). A la derecha (debajo en
    celular), «Modalidad» con Todas, Presencial, Híbrido y Remoto: links
    de 44 px y radio 22; apagados con borde `border-campo` y fondo
    blanco, prendidos con fondo `primary`, texto blanco y `aria-current`.
-   Filtros activos: un chip por rubro, modalidad y texto («texto»), de
    44 px, radio 22, borde `primary`, fondo `opcion-elegida` y texto
    `primary-hover`, con una cruz; cada chip es un link que quita ese
    filtro. Al final, el link «Limpiar todo».
-   Grilla de `TarjetaOferta` en 2 columnas desde 576 px de ancho del
    contenedor y 1 en celular (nunca 3), con la paginación debajo.
-   Sin resultados: el estado vacío del directorio (ver «Estado vacío del
    directorio público de ofertas»).

## Bandas entre secciones

"Cómo funciona" (visitante) y "Tu actividad" (postulante con sesión) van
en una `.banda-inicio`: a todo el ancho del contenido (margen negativo
igual a `--relleno-contenido`, sin scroll horizontal), fondo `rgb(0 104
51 / .07)` y borde superior de 4 px `accent`. Si la banda es la última
sección, llega hasta el final de la página.

El objetivo visual principal debe ser facilitar el acceso a las ofertas
laborales.

------------------------------------------------------------------------

# 27. Login

El login debe sentirse parte del mismo producto.

Sin navegación. Página: `src/app/auth/login/page.tsx`; formulario:
`src/components/auth/login-form.tsx`; clases `.login-*` y `.auth-*` de
`globals.css`.

Desktop (desde lg), dos columnas a pantalla completa (`100svh`). El
panel verde es `PanelMarca` (`src/components/auth/panel-marca.tsx`,
props `volanta`, `titulo` y `bajada`), compartido con el registro:

``` text
┌────────────────────────┬──────────────────────────────┐
│ [logo blanco]          │   ← Volver                   │
│                 ▢      │  ┌────────────────────────┐  │
│ TALENTO LOCAL, …    ▢  │  │ [logo verde]           │  │
│ Un nuevo               │  │ TU ESPACIO PARA AVANZAR│  │
│ camino            ▢    │  │ Tu próximo trabajo …   │  │
│ empieza acá.           │  │ [correo] [contraseña]  │  │
│ Conectamos a …   ▢     │  │ [ Iniciar sesión ]     │  │
│ ↗ Tu talento puede …   │  │ ¿Nuevo? Registrate     │  │
└────────────────────────┴──┴────────────────────────┴──┘
```

-   **Panel verde:** 640 px (42 %, mínimo 360 px, en pantallas más
    chicas), `primary` con patrón de puntos (`rgba(255,255,255,.09)`
    cada 28 px), padding 72 px 72 px 28 px. Volanta 12 px 700
    letter-spacing .14em (`login-suave`); título en Georgia 400 hasta
    92 px, interlineado .98; bajada 17 px, interlineado 1.6,
    `sidebar-texto`, máximo 360 px. Abajo, ícono de gráfico ascendente y
    "Tu talento puede llegar más lejos".
-   **Decoración** (`aria-hidden`): brillo circular difuso que pulsa
    (8 s), anillo grande abajo a la derecha y seis íconos flotantes
    (48 px, radio 12, blanco al 10 %) que suben 10 px y bajan en 6 s.
    Los dos que quedan al costado del título se ocultan por debajo de
    1280 px.
-   **Columna derecha:** fondo `fondo-auth`, contenido centrado de
    460 px. Tarjeta blanca radio 24, padding 40, sombra
    `0 24px 60px rgba(0,40,20,.10)`, gap 22: logo verde de 120 px,
    volanta, título Georgia 42 px, campos de 52 px con ícono (Mail,
    Lock; botón de mostrar contraseña de 44 × 44), botón primario de
    52 px con radio 12 y sombra. Mensajes con `Aviso` (info para avisos
    de sesión, danger para errores).
-   **Sin asteriscos:** "Correo electrónico" y "Contraseña" no llevan
    `<Obligatorio />`. Son dos campos y los dos son obligatorios, así que
    la marca no distingue nada; siguen con `required` y con los mismos
    mensajes de error. El resto de los formularios marca los obligatorios
    como siempre.
-   **Registrate:** botón con `aria-expanded` y `aria-controls` que
    despliega dos opciones (filas de 64 px, borde 1,5 px `border-strong`,
    radio 14, ícono en un cuadrado verde de 44 px, hover borde verde)
    hacia `/auth/registro` y `/auth/registro?tipo=empresa`, más
    "Cancelar".
-   **Animación de las opciones** (`.login-registro-plegable` en
    `globals.css`): al abrir, el bloque crece de 0 a su alto con
    `grid-template-rows` (0fr → 1fr, 250 ms ease-out) y lo de abajo se
    corre con él; cada fila (la de "Cancelar", Postulante y Empresa) entra
    con opacidad 0 → 1 y de −8 px a 0, 40 ms después de la anterior. Al
    cerrar ("Cancelar" o "Registrate" de nuevo), lo inverso de abajo hacia
    arriba en 200 ms ease-in. Al quitar `hidden`, `@starting-style` hace
    que la transición parta del bloque cerrado. Mientras está cerrado o
    cerrándose el bloque es `inert` (no se enfoca con Tab) y queda
    `hidden` recién al terminar (`transitionend`, con un respaldo de
    320 ms). "Cancelar" devuelve el foco a "Registrate". Apretarlo varias
    veces seguidas revierte la transición desde donde esté. Con movimiento
    reducido aparece y desaparece sin animación.
-   **Animaciones de entrada** (sin movimiento reducido): título y tarjeta
    suben 16 px con fundido en 700 ms (la tarjeta 150 ms después).

Celular y tablet (menos de lg): el mismo `PanelMarca` arriba y más corto
que en el registro y en recuperar la contraseña (ver "Panel en el
celular"), y debajo la tarjeta a todo el ancho con padding 24 px, sin el
logo verde (ya está en el panel) y título de 34 px. A 375 × 667 el botón
"Iniciar sesión" queda unos 50 px debajo del borde: alcanza con
desplazar un poco.

## Panel en el celular

`PanelMarca` se ve igual en todas las pantallas que lo usan (todas las
de /auth); no hay una prop para activarlo.
Por debajo de lg va arriba: padding 8 × 16 × 20 (16 × 24 × 36 en
tablet), gap 10, "Volver" en blanco (`LinkVolverAuth claro`, prop
`volver`), el logo de 148 px, la volanta y el título de 32 px (42 px en
tablet) sin los saltos de línea, sin la bajada, los íconos ni la nota.
Mide 235 px a 375 px de ancho. Cada pantalla pone el otro "Volver" en la
columna del formulario solo desde lg (`hidden lg:block`), así nunca se
ven dos.

## Registro

La misma estructura que el login (`src/app/auth/registro/page.tsx`):
`PanelMarca` a la izquierda y, a la derecha, la columna clara con
"Volver" y el formulario en una tarjeta de 720 px con el logo verde.
Desde lg el panel queda fijo (`sticky`, alto de la ventana) mientras el
formulario se desplaza.

-   Postulante: "Talento local, nuevas oportunidades" / "Sumate al Portal
    de Empleo." / "Cargá tus datos una vez y postulate a las ofertas de
    empresas de la ciudad."
-   Empresa: "Empresas de Funes" / "Encontrá a tu próximo equipo en
    Funes." / "Publicá tus ofertas y recibí candidatos preseleccionados
    por la Oficina de Empleo."
-   Celular: el panel va arriba y más corto, igual que en el login (ver
    "Panel en el celular"). Debajo, la tarjeta del formulario.
-   Sin animaciones con movimiento reducido.

Título de la tarjeta en Georgia (`.login-titulo`): "Crear tu cuenta de
postulante" o "Registrar tu empresa", con "Completá tus datos. Te vamos a
mandar un email para confirmar la cuenta." Los campos van en secciones
numeradas planas (`SeccionNumerada variante="plana"`) separadas por una
línea: el postulante tiene "Datos personales" y "Datos de acceso"; la
empresa, "Datos de la empresa", "Persona responsable" y "Datos de acceso".
Desde sm, dos columnas por sección (domicilio, localidad, descripción y la
zona del comprobante a todo el ancho); en el celular, una. El comprobante
de domicilio es una zona de carga con borde punteado. "Mínimo 8
caracteres." va como ayuda de la contraseña, con un botón de 44 px para
mostrarla u ocultarla; debajo de "Repetir contraseña", "Las contraseñas
coinciden" en verde o "Las contraseñas no coinciden." en rojo. El CUIT
muestra "CUIT válido" en vivo. El rubro de la empresa y la localidad del
postulante usan `Combobox` (sección 16). "Volver" lleva a la pantalla
inmediatamente anterior aunque sea de /auth (login → "Registrate" →
registro → "Volver" vuelve al login; `LinkVolverAuth saltearAuth={false}`)
y, sin pantalla anterior, al inicio. "Crear cuenta" es primario a todo el ancho
(52 px) y abajo va "¿Ya tenés cuenta? Iniciá sesión acá". Las piezas
comunes están en `src/components/auth/partes-registro.tsx`.

## Pantallas de una tarjeta (`PantallaAuth`)

Todas las pantallas de /auth tienen el panel verde. Las de una sola
tarjeta (recuperar la contraseña, verificar el email y aceptar la
invitación) usan `PantallaAuth` (`src/components/auth/pantalla-auth.tsx`):
la estructura del login, con `PanelMarca` a la izquierda (arriba en el
celular), la columna clara con "Volver" desde lg y la tarjeta de 460 px
con el logo verde desde lg. Props: `panel` (volanta, título y bajada),
`volverHref` (destino de "Volver" sin pantalla anterior; por defecto el
inicio) y, para la tarjeta, `titulo`, `bajada`, `icono` y `tonoIcono`.

-   Encabezado de la tarjeta (`EncabezadoTarjetaAuth`): el ícono en un
    círculo de 56 px (verde claro; `danger` con el ícono blanco para un
    link inválido), el título en Georgia (`.login-titulo`) y la bajada
    de 15 px.
-   Las mismas animaciones de entrada que el login (`.login-entrada` y
    `--demorada`), sin animación con movimiento reducido.
-   Campos, mostrar u ocultar la contraseña, errores y botón principal
    con las clases del login: `etiqueta-campo`, `login-campo`,
    `login-campo-icono`, `campo login-input`, `login-ver-contrasena` y
    `btn-primario login-enviar` (52 px). "Las contraseñas coinciden" o
    "no coinciden" en 14 px, como en el registro.

### Verificar el email

-   Postulante (`/auth/verificar-email`): "Ya casi estás" / "Confirmá tu
    email y empezá a postularte." / "Te mandamos un link para activar tu
    cuenta del Portal de Empleo." Tarjeta "Revisá tu correo" con el
    sobre, el aviso de spam, el aviso del comprobante si no se subió y el
    recuadro "¿Qué sigue después de confirmar?".
-   Empresa (`/auth/verificar-email-empresa`): "Empresas de Funes" /
    "Confirmá tu email y esperá la aprobación." / "La Oficina de Empleo
    revisa cada empresa antes de que pueda publicar ofertas." Los dos
    pasos van numerados con círculos verdes de 28 px, título de 15 px 700
    y texto de 14 px, como las secciones numeradas. Debajo, el aviso de
    spam.
-   Aviso de spam (`AvisoSpam`, `src/components/auth/aviso-spam.tsx`):
    `Aviso` `info` debajo del texto principal de verificar el email (las
    dos) y de "Revisá tu email" (reset enviado): "Si no ves el correo en
    unos minutos, revisá la carpeta de spam o correo no deseado, y
    marcalo como «No es spam» para recibir los próximos."

### Aceptar la invitación

`/auth/aceptar-invitacion`: "Oficina de Empleo" / "Sumate al equipo de
la Oficina." / "Elegí tu contraseña para entrar al panel de la Oficina
de Empleo." La tarjeta es el formulario de la contraseña nueva con el
candado arriba ("Activá tu cuenta"); con el link inválido, el ícono de
alerta en rojo y "Ir a iniciar sesión" primario a todo el ancho.

## Recuperar la contraseña

`/auth/recuperar-contrasena`, `/auth/reset-enviado` y
`/auth/nueva-contrasena` usan `PantallaRecuperacion`
(`src/components/auth/pantalla-recuperacion.tsx`), que es `PantallaAuth`
con el mismo panel en las tres, para que se lean como un solo recorrido:
"Recuperá tu acceso" / "Volvé a entrar al Portal de Empleo." / "Te
mandamos un email con un link para crear una contraseña nueva."

-   Títulos de la tarjeta en Georgia (`.login-titulo`), con la bajada en
    15 px debajo: "Recuperar contraseña", "Revisá tu email" (con un sobre
    en un círculo verde claro de 56 px arriba, y el aviso de spam debajo
    de la bajada) y "Elegí una contraseña nueva".
-   "Volver" como en el login: a la pantalla anterior y, si no la hay, al
    login.
-   Las mismas animaciones de entrada que el login.
-   Los campos tienen el mismo estilo y tamaño que los del login (ver
    arriba); validaciones y mensajes no cambiaron. El formulario de la
    contraseña nueva es el mismo que el de la invitación de la oficina;
    en la recuperación va sin ícono.

Evitar:

-   mensajes que asuman género;
-   iconografía decorativa difícil de interpretar;
-   cards flotantes innecesarias;
-   fondos visualmente cargados.

------------------------------------------------------------------------

# 28. Empty states

Todo listado debe definir su estado vacío.

Un empty state puede contener:

-   icono;
-   título;
-   explicación breve;
-   acción, solamente si existe una acción útil.

Ejemplo:

``` text
Todavía no publicaste ofertas

Cuando publiques una búsqueda laboral,
aparecerá en este espacio.

[Publicar una oferta]
```

## Decoración

`EstadoVacio` (`src/components/ui/estado-listado.tsx`) y el estado vacío
de `/ofertas` (`empty-job-results.tsx`) llevan las clases
`.estado-vacio` (tarjeta) y `.estado-vacio-icono` (círculo del ícono):

-   tarjeta con `position: relative`, `isolation: isolate`, `overflow:
    hidden` y fondo `linear-gradient(180deg, rgb(0 104 51 / .08),
    transparent 220px)` sobre blanco;
-   puntos verdes al 16 % cada 20 px, en una capa de 150 px detrás del
    ícono, enmascarada con `radial-gradient(ellipse 300px 60px at 50%
    100px, #000 30%, transparent 100%)`. La capa sale del ícono, así que
    queda centrada en él sea cual sea el padding, y termina antes del
    título;
-   halo del ícono: `box-shadow: 0 0 0 10px rgb(0 104 51 / .10)`. El
    tamaño y el color del círculo no cambian;
-   escudo de agua (`escudo-verde.png`): 220 px (150 en celular), al
    8 %, girado −8°, a −40 px de la derecha y −50 px de arriba (−60 / −70
    en celular).

`ErrorListado` y el error de carga de `/ofertas` no llevan decoración.

------------------------------------------------------------------------

# 29. Loading

Preferir skeletons que respeten la estructura final.

Evitar spinners grandes como única respuesta para pantallas completas.

Las acciones puntuales pueden usar spinner dentro del botón.

------------------------------------------------------------------------

# 30. Feedback

Toda mutación debe comunicar resultado.

Usar:

-   toast para confirmaciones no bloqueantes;
-   error inline para validación;
-   aviso para información persistente;
-   dialog para confirmaciones críticas.

No depender exclusivamente del color para comunicar estados.

## Aviso

Componente `src/components/ui/aviso.tsx`, tonos `info`, `success`,
`warning` y `danger`:

-   fondo sólido del token y texto blanco (`warning`: `accent` con
    `accent-foreground`);
-   radio 12 px, padding 14 × 16;
-   ícono de Lucide de 20 px a la izquierda (uno por tono, se puede
    cambiar con `icono`);
-   15 px con interlineado 1,45; `titulo` opcional en negrita;
-   links subrayados que heredan el color del texto;
-   `role="status"` para info, success y warning; `role="alert"` para
    danger.

Las notas neutras (por ejemplo "No fuiste seleccionado") no son avisos:
dentro de una tarjeta van como franja neutra.

## Franja

`src/components/ui/franja.tsx`: información dentro de una tarjeta (el
estado de una postulación, un aviso sobre la oferta, el motivo de un
rechazo). No se anuncia sola (sin `role`). Padding 12 × 14, radio 12,
15 px con interlineado 1,45, ícono de 20 px y `titulo` en negrita al
principio, en la misma línea que el texto.

  Tono       Fondo                                       Texto
  ---------- ------------------------------------------- ----------------------
  `info`     `info`                                      blanco
  `ok`       `success`                                   blanco
  `neutra`   blanco, borde interno 1,5 px `muted-icon`   `foreground`
  `aviso`    blanco, borde interno 2 px `accent`         `invitacion-titulo`
  `error`    `danger`                                    blanco

En Mis postulaciones: pre-entrevista y entrevista coordinada en `info`,
"¡Fuiste seleccionado…!" en `ok`, "No fuiste seleccionado…", "La
empresa retiró la oferta…" y "Retiraste esta postulación…" en `neutra`,
"Modificada después de tu postulación" en `aviso`. Ahí cada franja mide
lo que ocupa su texto (`w-fit max-w-full`): no llega al borde derecho de
la tarjeta y en el celular no se sale.

En las tarjetas de Mis postulaciones, las franjas van debajo de las tres
columnas, a todo el ancho de la tarjeta (680 px como máximo desde 768 px
de ancho disponible), una debajo de la otra con 12 px de separación; la
acción queda en su columna (sección 25, «Tarjetas de Mis postulaciones»).

En las fichas de la empresa y de la oficina: el cartel de entrevista
coordinada (abajo) en `info`; el resultado final del proceso
en `ok` (seleccionado o contratado) o `neutra` (no seleccionado, proceso
cerrado, retirada); "Modificada tras la postulación" y las ofertas
vencidas del panel de la empresa en `aviso`.

### Cartel de entrevista coordinada

`src/components/entrevistas/cartel-entrevista.tsx` (`CartelEntrevista`): una
`Franja` `info` con el ícono de calendario y reloj, el título en negrita
("Entrevista coordinada" en la empresa, "Pre-entrevista coordinada" en la
oficina) y una lista de datos con la etiqueta en 600: **Fecha** en formato
largo ("Martes 3 de noviembre, 10:30 h"), **Modalidad** (Presencial u
Online), **Lugar** (si hay) o **Link** (el link completo, subrayado en
blanco, que se abre en otra pestaña y lo anuncia a los lectores de
pantalla) y las **notas** si existen (la nota interna de la oficina; la
entrevista de la empresa no tiene notas). Debajo del cartel, el botón
secundario "Reprogramar" a todo el ancho.

"Reprogramar" reemplaza el cartel por el mismo formulario de coordinar,
precargado (la fecha solo si todavía no pasó), con "Guardar cambios"
(secundario) y "Cancelar" (neutro) debajo, a todo el ancho; "Cancelar"
vuelve al cartel. Al guardar, el cartel vuelve con los datos nuevos.

En Mis postulaciones, las franjas de pre-entrevista y de entrevista muestran
la fecha larga y debajo "Presencial · <lugar>" u "Online · <link>", con el
link clickeable (`ModalidadYLugar`).

## Cita

`src/components/ui/cita.tsx` (`Cita`): la nota de la Oficina de Empleo.
`blockquote` de 16 px con interlineado 1,6, borde izquierdo de 3 px
`primary` y padding 4 × 16; la firma debajo (`figcaption`, 13 px
`muted-foreground`): quién y cuándo, si se sabe ("Oficina de Empleo · 3 de
octubre de 2026").

## Línea de tiempo

`src/components/ui/linea-de-tiempo.tsx` (`LineaDeTiempo`): lista ordenada
(`ol`) con un punto de 12 px `muted-icon` por evento y una línea vertical
de 2 px `border` que los une. El último (el más reciente) va en `primary`
con un anillo verde translúcido de 4 px. Título del evento en 15 px 700 y
detalle (quién y cuándo) en 14 px `muted-foreground`. Historial de estados
de la ficha de una postulación.

Para mostrar pasos, cada evento puede llevar `estado`: "hecho" (punto
`muted-icon`), "actual" (el resaltado, con `aria-current="step"`) y
"pendiente" (punto hueco con borde de 2 px `muted-icon` y título en
`muted-foreground`). Lo usa la cuenta de empresa en revisión.

Con ícono (`icono` y `claseIcono` en el evento): en lugar del punto, el
ícono blanco en un cuadrado de 44 px del color del estado, unido al
siguiente por una línea de 2 px `secondary-hover` (`#E3E9E5`); `extra`
(un badge) va a la derecha del texto, o debajo si el contenedor mide
menos de 28 rem. Lo usan los últimos movimientos del panel del
postulante. Los demás usos no cambian.

`variante="historial"` (revisión de la oficina): ícono de 40 px, título en
800 y `nota` para el motivo de un rechazo. Ver "Pantallas de la Oficina
(ronda 9)".

## Archivo en una tarjeta

`src/components/ui/fila-archivo.tsx` (`FilaArchivo`): fila con borde y
radio 12; ícono en un cuadrado `secondary` de 40 px, nombre (15 px 700),
detalle ("Cargado el …") y "Ver CV" neutro a la derecha (a todo el ancho
en el celular), que abre la URL firmada en otra pestaña.

## Formulario en secciones numeradas

`src/components/ui/seccion-numerada.tsx` (`SeccionNumerada`): el número en
un círculo `primary` y el título 800, con una bajada opcional
(`descripcion`) y los campos debajo. Variante "tarjeta" (cada sección en
su `.tarjeta`, padding 24; 20 × 16 en el celular): círculo de 34 px
(15 px 800 blanco), título de 19 px y bajada de 14 px `muted-foreground`;
la usa el formulario de oferta. Variante "plana" (registro): círculo de
28 px y título de 18 px. `classNameCuerpo` da clases al contenedor de los
campos (por ejemplo, para que crezca con la sección).

## Formulario de oferta (Publicar y Editar)

`src/app/empresa/(panel)/ofertas/_components/oferta-form.tsx`, un solo
componente para `/empresa/ofertas/nueva` y `/empresa/ofertas/[id]/editar`.

### Encabezado

-   `BotonVolver destacado` arriba y `EncabezadoPagina banda botonesBlancos`.
-   Publicar: "Publicar oferta" y la bajada de siempre.
-   Editar: "Editar oferta" ("Completar borrador" si es un borrador) y la
    bajada "{título} · {estado} el {fecha}": "Publicada el …" (o
    "Vencida el …"), "Rechazada el …" o "Borrador guardado el …".
-   Debajo de la banda, la `Franja` amarilla "Al guardar, la oferta vuelve
    a revisión…" (oferta publicada) o la `Franja` roja del rechazo, con
    "Corregir y reenviar".

### Campos

Clase `.formulario-oferta` en el `<form>`: dentro, `.campo` y
`.campo-grupo` llevan borde de 1,5 px `borde-campo-oferta` (`#7F9488`),
radio 12 y 48 px de alto mínimo; el foco, borde `primary` y outline de
3 px `rgb(0 104 51 / .35)`. El error sigue en `danger`. El asterisco de
obligatorio, `<Obligatorio />` en `danger` (`#B42318`).

### Secciones

1.  **El puesto**: título y descripción con su contador.
2.  **Rubros**: los elegidos como chips de 44 px (fondo
    `rgb(0 104 51 / .10)`, borde 1,5 px `rgb(0 104 51 / .35)`, texto
    `primary-hover` 15 px 600), cada uno con un "×" de 36 px
    (`aria-label="Quitar {rubro}"`). Al final, "+ Agregar rubro" (44 px,
    borde punteado `primary`), que muestra el `MultiCombobox` (`sinChips`,
    `abrirAlMontar`) con la lista abierta; al cerrarla, el buscador se
    oculta y el foco vuelve a "Agregar rubro". Sin rubros, el buscador
    queda a la vista (ahí va el foco del error). Al quitar un chip, el
    foco pasa al "×" siguiente o al buscador.
3.  **Condiciones**: modalidad y jornada en pastillas de 44 px
    (`clasePastilla`; la elegida en `primary` sólido) con
    `role="radiogroup"` y `role="radio"` + `aria-checked`, un solo paso de
    tabulación y las flechas, Inicio y Fin para cambiar. El valor viaja en
    un `input type="hidden"` con el `name` de siempre. Debajo, la ubicación
    de solo lectura: fondo `campo-lectura` (`#F3F5F4`), borde punteado
    `borde-campo-oferta`, con su ayuda.
4.  **Requisitos** (obligatorio, como siempre) y 5. **Beneficios
    (opcional)**, lado a lado desde `@4xl`.
6.  **Publicación**: vacantes (input de 160 px) y la duración en
    pastillas (15, 30, 45 y 60 días). Debajo, un recuadro
    `rgb(0 104 51 / .07)` con `Info`: en Publicar (y en borradores y
    rechazadas) "Si la Oficina la aprueba hoy, vence el …", que se
    recalcula al cambiar la duración (`venceSiSeApruebaEn`, con
    `aria-live="polite"`); al editar una publicada, "Vence el …" (o
    "Venció el …") con su `vence_en`, y que cambiar la duración no
    modifica el vencimiento actual.

### Distribución

-   Escritorio (desde xl): grid `minmax(0,1fr) 360px`, gap 20 × 28 px.
-   Fila 1: a la izquierda, El puesto y Rubros; a la derecha, la vista
    previa y la tarjeta de progreso. Las dos columnas miden lo mismo: la
    fila estira (`align-items: stretch`), El puesto y su textarea crecen
    (`flex: 1`, mínimo 132 px, sin `resize` en escritorio) y la vista
    previa también.
-   Rótulo "Vista previa" (12 px 800, mayúsculas, `neutral`): en
    escritorio, `position: absolute` con `bottom: calc(100% + 8px)`, para
    que no sume altura y los bordes de las dos columnas coincidan.
-   Fila 2, a todo el ancho: Condiciones; Requisitos y Beneficios lado a
    lado; Publicación.
-   Fila 3: los botones, sin tarjeta, a la derecha: "Cancelar" (`ghost`),
    "Guardar borrador" (`.btn-secundario`, solo en Publicar y en
    borradores) y "Enviar a revisión" (`.btn-primario` con `Send`); al
    editar una oferta enviada, "Cancelar" y "Guardar cambios". El `Aviso`
    de error del servidor va encima, a todo el ancho.
-   La vista previa ya no es sticky.
-   Celular: una columna en este orden: puesto, rubros, vista previa (con
    el rótulo arriba), progreso, condiciones, requisitos, beneficios,
    publicación y botones a todo el ancho (el principal arriba).

### Vista previa y progreso

-   `TarjetaOferta` inerte (`inert`) con lo que se va cargando. Lo que
    falta va como ejemplo en itálica: el título ("Título del puesto") en
    `texto-ejemplo` (`#6E7D74`, 4,3:1: alcanza por ser texto grande, 20 px
    700) y el rubro ("Rubro", 13 px) en `placeholder` para llegar a 4,5:1
    (clase `.vista-previa-oferta` con `data-sin-titulo` y `data-sin-rubro`).
-   Tarjeta "N de 6 secciones completas": `CircleCheck` `primary` en las
    completas y `Circle` `muted-foreground` en las pendientes, con
    "completa"/"pendiente" para lectores de pantalla. "Completa" usa las
    reglas de `validarOferta` (título de 5 caracteres o más, descripción
    de 30 o más, 1 a 5 rubros, al menos un requisito, vacantes y
    duración válidas); Beneficios, opcional, cuenta siempre como completa.

Si el envío tiene errores, arriba aparece un `Aviso` de error enfocado
("Faltan datos para enviar la oferta. Revisá los N campos marcados.") y
cada campo muestra el suyo en rojo.

## Formularios dentro de una tarjeta angosta

Coordinar una entrevista (empresa) o una pre-entrevista (oficina) va en la
tarjeta de gestión, no en un diálogo (`CamposEntrevista`,
`src/components/entrevistas/campos-entrevista.tsx`), a todo el ancho y en
este orden: `CampoFechaHora` (sección 15), "Modalidad" con dos
`OpcionRadio` lado a lado (Presencial / Online, Presencial por defecto) y,
según la modalidad, "Lugar" o "Link de la reunión" (los dos obligatorios).
El link usa `type="url"`, placeholder "https://meet.google.com/…" y la
ayuda "Pegá el link de Meet, Zoom o Teams." (13 px `muted-foreground`);
tiene que empezar con https:// y no tener espacios (el mismo control en el
navegador, el servidor y la base). La oficina suma la nota interna. Al
final, el botón secundario "Guardar …" a todo el ancho.

En la empresa, debajo, "Resultado" con la aclaración "Podés seleccionar al
candidato en cualquier momento, aunque no hayan tenido una entrevista o
todavía no haya pasado la fecha.", "Seleccionar" (primario) y "No
seleccionado" (peligro con borde). "Seleccionar" solo se deshabilita con
las vacantes cubiertas.

## Toasts

Sonner sin `richColors`: fondo `heading` por defecto y el tono sólido
según el tipo (success, info, error → danger, warning → accent), texto
blanco, radio 12 px.

## Texto de estado suelto

Sin fondo: `text-warning-text` para aviso, `text-danger` para error,
`text-primary` para éxito.

------------------------------------------------------------------------

# 31. Iconografía

Biblioteca estándar:

**Lucide React**

Reglas:

-   `16px` en controles pequeños;
-   `18–20px` en navegación;
-   `20–24px` en acciones destacadas;
-   grosor consistente;
-   evitar mezclar bibliotecas.

No utilizar emojis como iconos funcionales de producción.

------------------------------------------------------------------------

# 32. Responsive

Breakpoints según Tailwind.

## Mobile

-   sidebar → barra de 60 px y panel lateral (sección 12);
-   grids → una columna;
-   acciones de PageHeader → debajo del título;
-   cards → ancho completo;
-   tablas complejas → representación mobile específica;
-   filtros → reordenados sin perder accesibilidad.

## Tablet

Usar 1--2 columnas según contenido.

## Desktop

Aprovechar espacio sin estirar formularios y textos innecesariamente.

------------------------------------------------------------------------

# 33. Accesibilidad

Requisitos mínimos:

-   contraste suficiente;
-   navegación por teclado;
-   focus visible;
-   labels asociados a campos;
-   botones con nombre accesible;
-   iconos sin texto con `aria-label`;
-   estados no comunicados únicamente por color;
-   targets táctiles adecuados;
-   HTML semántico.

No eliminar outlines sin proporcionar un reemplazo visible.

------------------------------------------------------------------------

# 34. Componentes compartidos

La aplicación debe priorizar composición sobre duplicación.

Base recomendada:

``` text
components/
  ui/
    button
    input
    select
    dialog
    badge
    card
    table
    dropdown-menu
    command
    popover
    tooltip
    skeleton
    alert

  layout/
    AppSidebar
    AppHeader
    PageContainer
    PageHeader

  jobs/
    JobCard
    JobStatusBadge

  candidates/
    CandidateCard

  applications/
    ApplicationStatusBadge

  shared/
    EmptyState
    SearchInput
    FilterBar
    ConfirmDialog
```

Los nombres finales deben respetar las convenciones existentes del
repositorio. No crear duplicados si ya existe un componente equivalente.

------------------------------------------------------------------------

# 35. Reglas estrictas de implementación

1.  Utilizar shadcn/ui como base cuando exista un componente adecuado.
2.  Utilizar Tailwind para estilos cuando exista una utilidad
    equivalente.
3.  No distribuir valores HEX dentro de componentes.
4.  No duplicar componentes por rol si la diferencia puede resolverse
    mediante props/composición.
5.  No crear variantes visuales sin necesidad funcional.
6.  No usar estilos inline salvo necesidad técnica justificada.
7.  No mezclar bibliotecas de iconos.
8.  No usar emojis como iconografía funcional.
9.  Mantener estados `hover`, `focus`, `disabled`, `loading` y `error`.
10. Mantener responsive en cada componente.
11. No inventar estados de dominio desde UI.
12. No modificar la identidad visual según el rol.
13. No hacer hardcode de colores de estado en múltiples componentes.
14. No agregar animaciones que dificulten la interacción.
15. Respetar `prefers-reduced-motion` cuando existan animaciones.
16. Antes de crear un componente nuevo, verificar si existe uno
    reutilizable.

------------------------------------------------------------------------

# 36. Motion

La animación debe ser funcional y discreta.

Permitido:

-   fade;
-   pequeños desplazamientos;
-   expansión/colapso;
-   feedback de hover;
-   transiciones de sidebar;
-   aparición de dropdown/popover/dialog.

Duración habitual: `150–200ms`.

-   botones, campos, pestañas, filas y tarjetas clickeables: transición
    de color y sombra de 150--200 ms;
-   tarjetas clickeables: se elevan 2 px con sombra suave;
-   diálogos, popovers y el desplegable de `MultiCombobox`: fundido y
    escala de .97 a 1 en 180 ms.

El movimiento va dentro de `@media (prefers-reduced-motion:
no-preference)`; con `reduce`, `globals.css` anula transiciones y
animaciones. El brillo y los íconos del hero del inicio, además, tienen
`animation: none` explícito con `reduce`.

Evitar animaciones continuas en áreas administrativas.

------------------------------------------------------------------------

# 37. Criterios de aceptación del Design System

Una implementación se considera alineada cuando:

-   utiliza la paleta mediante tokens;
-   mantiene verde institucional + superficies claras;
-   utiliza componentes compartidos;
-   utiliza shadcn/ui como base;
-   utiliza Lucide para iconografía;
-   conserva jerarquía visual consistente;
-   funciona en desktop, tablet y mobile;
-   posee estados de interacción completos;
-   no duplica componentes sin justificación;
-   mantiene el mismo lenguaje visual en los tres roles;
-   respeta accesibilidad básica;
-   el escudo municipal se utiliza con contraste adecuado;
-   las ofertas laborales tienen mayor protagonismo que elementos
    decorativos.

------------------------------------------------------------------------

# 38. Validaciones antes de cerrar una pantalla

Para cada pantalla verificar:

-   ¿Existe un único objetivo visual principal?
-   ¿La acción principal es evidente?
-   ¿Los componentes ya existen o realmente necesitan crearse?
-   ¿Todos los colores provienen de tokens?
-   ¿Funciona correctamente en mobile?
-   ¿Los estados vacíos están definidos?
-   ¿Los estados loading están definidos?
-   ¿Los errores están definidos?
-   ¿Existe focus visible?
-   ¿Las acciones destructivas están claramente diferenciadas?
-   ¿La información secundaria compite visualmente con la principal?
-   ¿La pantalla mantiene la identidad del Portal de Empleo?

------------------------------------------------------------------------

# 39. Dirección visual final

El Portal Municipal de Empleo debe sentirse como un producto digital
municipal contemporáneo.

La identidad se construye con:

**verde institucional + blanco + fondos muy claros + tipografía limpia +
espaciado generoso + componentes simples + escudo municipal.**

El verde debe identificar y jerarquizar, no cubrir innecesariamente la
interfaz.

La landing pública puede ser más expresiva. Las áreas autenticadas deben
priorizar claridad, velocidad de lectura y operación.

Postulante, Empresa y Municipalidad deben percibirse como tres
experiencias dentro del mismo sistema, no como tres aplicaciones
distintas.

------------------------------------------------------------------------

# 40. Correos

Los avisos que manda el portal salen todos de `armarEmail`
(`src/lib/emails/plantilla.ts`): un asunto, un título, un mensaje y un
link opcional. El HTML está en `src/lib/emails/diseno.ts`, que también
genera las plantillas de Supabase (`docs/emails/supabase/`), así hay un
solo diseño (decisión 034).

``` text
            fondo #F4F7F5
  ┌──────────────────────────────────────┐  560 px máx., borde 1 px,
  │ [logo blanco 150 px]                 │  radio 16
  │ PORTAL DE EMPLEO          (verde)    │  franja primary, 24 × 32
  ├──────────────────────────────────────┤
  │ Título en Georgia 26 px              │  padding 32 (24 angosto)
  │ Mensaje 16/26 px                     │
  │ [ Ver en el portal ]                 │  48 px, radio 12
  │ Si el botón no funciona, copiá …     │  13 px gris + URL
  └──────────────────────────────────────┘
     pie 12 px gris, centrado
     Municipalidad de Funes · Oficina de Empleo
```

-   **Colores:** los valores de los tokens (`COLOR` en `diseno.ts`):
    `background`, `surface`, `border`, `primary`, `foreground`,
    `muted-foreground` y `login-suave` para "PORTAL DE EMPLEO". Los
    clientes de correo no leen variables CSS: si cambia un token, cambiarlo
    también ahí.
-   **Letra:** Public Sans si el cliente la carga (link a Google Fonts);
    si no, Arial o Helvetica. Georgia solo en el título.
-   **Botón:** una tabla con fondo `primary` y el link adentro (padding
    14 × 28, 16 px 700 blanco), para que se vea en los clientes que no
    respetan el padding de un `<a>`. Debajo va siempre la URL visible.
-   **Logo:** en los avisos va embebido en el correo (`src="cid:logo-funes"`;
    `transporte.ts` adjunta el PNG de `src/lib/emails/logo-correo.ts` en
    cada envío), porque muchos clientes bloquean las imágenes externas y en
    local la URL del sitio es `localhost`. Las plantillas de Supabase no
    pueden adjuntarlo: lo cargan de
    `{{ .SiteURL }}/images/logo-funes-blanco.png`, y la *Site URL* de
    Supabase tiene que ser la dirección de Vercel. Sin logo, el encabezado
    dice "Municipalidad de Funes" en texto.

Reglas:

-   Tablas con `role="presentation"` y estilos en línea; una sola media
    query, para anchos menores de 600 px.
-   Sin imágenes de fondo, sin SVG, sin variables CSS.
-   `meta color-scheme` light y un texto de vista previa oculto con el
    comienzo del mensaje.
-   Todo el contenido dinámico se escapa en `armarEmail` antes de armar el
    HTML.
-   Cada correo va también en texto plano: el nombre del portal, el
    asunto, el mensaje, "Ver en el portal: <URL>" y el pie.
-   Para ver los cambios: `npm run emails:vista-previa` y abrir
    `emails-vista-previa/index.html` (cada correo a 600 y 375 px). No
    manda correos.

------------------------------------------------------------------------

# 41. Footer

`src/components/layout/footer.tsx`, clases `.pie-*` de `globals.css`.
`AppShell` lo pone debajo de la página en todas las pantallas con
navegación (públicas y con sesión, los tres roles). Las de `/auth` no lo
llevan.

-   **No se ve al abrir:** `.app-contenido` es una columna flex con la
    página (`.app-pagina`) y el footer. `.app-pagina` lleva `flex: 1 0
    auto` y `min-height: 100dvh` en escritorio (`calc(100dvh - 60px)` en
    el celular, por la barra de arriba): el footer arranca justo debajo
    del borde de la ventana y aparece al hacer scroll. En las pantallas
    largas no cambia nada. Una `.banda-inicio` que es la última sección
    tapa el `--espacio-pie` y llega hasta el footer.
-   **Ancho:** todo el ancho del área de contenido, al lado de la sidebar,
    sin scroll horizontal.
-   **Forma y fondo:** `primary` (#006833) con puntos blancos al 9 % cada
    24 px (`radial-gradient(rgb(255 255 255 / .09) 1px, transparent
    1.5px)`), esquinas de arriba redondeadas de 28 px (24 en celular) y
    un acento `accent` (#F2B705) de 64 × 4 px pegado arriba, a 48 px de
    la izquierda (20 en celular).
-   **Marca de agua:** `escudo-blanco.png` de 400 px de ancho (230 en
    celular), al 9 %, girado −8°, recortado en la esquina inferior
    derecha (`right: -60px`, `bottom: -110px`; −60 / −50 en celular). El
    footer lleva `overflow: hidden`; la imagen, `alt=""`, `aria-hidden` y
    `pointer-events: none`.
-   **Columnas:** 3 desde que el footer mide 720 px (container query,
    porque la sidebar le quita ancho): `1.5fr 1fr 1.4fr`, gap 48 px,
    padding `56px 48px 0`. Debajo, una sobre otra con gap 40 px y padding
    `40px 20px 0` (desde 640 px de ventana se usa el padding de
    escritorio).
    1.  Marca: logo blanco de 180 px (160 en celular), "PORTAL DE EMPLEO"
        (12 px, 800, tracking .1em, `sidebar-suave` #CFE6D9) y "Ofertas de
        empresas de la ciudad, revisadas por la Oficina de Empleo." (15
        px, `sidebar-texto` #E3F0E8). Debajo, Instagram y Facebook en
        botones redondos de 44 px (`.pie-red`, borde blanco al 40 %, hover
        blanco al 12 %) con el ícono en SVG inline (lucide no trae
        marcas), `aria-label`, `target="_blank"` y `rel="noopener
        noreferrer"`.
    2.  "Portal" (`<nav>`): Ofertas de trabajo, Cómo funciona
        (`/#como-funciona`), Preguntas frecuentes y, sin sesión,
        "Ingresar" y "Crear cuenta" (abre el diálogo de registro); con
        sesión, "Mi panel" (el panel del rol). `.pie-link`: blanco, 15 px,
        600, alto mínimo de 38 px (44 en celular), subrayado al pasar el
        mouse.
    3.  "Oficina de Empleo": dirección (link a Google Maps en otra
        pestaña), teléfono (`tel:`), correo (`mailto:`) y horario, con
        `MapPin`, `Phone`, `Mail` y `Clock` de 18 px en `accent`
        (`.pie-dato`, 44 px de alto).
-   **Títulos de columna** (`.pie-titulo`): 13 px, 800, mayúsculas,
    tracking .1em, en blanco, con una rayita `accent` de 28 × 3 px
    debajo. El amarillo como texto sobre este verde no pasa AA: por eso
    el título va en blanco.
-   **Barra inferior** (`.pie-barra`): borde de arriba blanco al 22 %; a
    la izquierda "© 2026 Municipalidad de Funes · Santa Fe" (14 px,
    `sidebar-suave`) y a la derecha el botón "Volver arriba" (`.pie-arriba`,
    `ChevronUp`, 44 px de alto, borde blanco al 45 %, texto blanco). En
    el celular el botón va arriba del texto.
-   **Volver arriba:** scroll suave al inicio (instantáneo con
    `prefers-reduced-motion`) y deja el foco en el `<main>` de la página
    (o en `.app-pagina` si no tiene), con `tabindex="-1"` y sin anillo.
-   **Contraste:** blanco 6,9:1, `sidebar-texto` 5,9:1 y `sidebar-suave`
    5,3:1 sobre el verde. Foco de links y botones con anillo blanco al
    60 %.
-   Los datos de la Oficina salen de `src/lib/oficina.ts`, el único lugar
    donde están (también los usan `ContactoOficina` y las preguntas
    frecuentes).

# 42. Acordeón (`Acordeon`, `ItemAcordeon`)

`src/components/ui/acordeon.tsx`. Lo usa `/preguntas-frecuentes`.

-   `Acordeon`: una `.tarjeta` con los ítems separados por una línea
    `border`.
-   `ItemAcordeon`: `details`/`summary` nativos (teclado y lector de
    pantalla sin JavaScript). El `summary` es la pregunta en 16 px 700
    `heading` (hover `primary`), de al menos 44 px de alto, con padding
    14 × 16 (24 a los costados desde 640 px) y un `ChevronDown` de 20 px
    `muted-foreground` que gira 180° al abrirse (150 ms; sin animación con
    `prefers-reduced-motion`). Sin el marcador del navegador.
-   La respuesta va debajo en 15 px `texto-parrafo`, con interlineado
    amplio.
-   Foco: `--sombra-foco` sobre el `summary`.

## Preguntas frecuentes según el rol

`/preguntas-frecuentes` es pública. El servidor lee el rol de la sesión
(`obtenerUsuarioActual()`, sin exigirla) y elige las secciones:

-   sin sesión y Oficina: Postulantes, Empresas y Sobre el portal, con la
    bajada "Lo que más nos consultan sobre el Portal de Empleo.";
-   postulante: Postulantes y Sobre el portal ("Lo que más nos consultan
    los postulantes sobre el Portal de Empleo.");
-   empresa: Empresas y Sobre el portal ("Lo que más nos consultan las
    empresas sobre el Portal de Empleo.").

Si se ocultó alguna, debajo de las secciones va el link "Ver todas las
preguntas" (`?ver=todas`, link `primary` subrayado de 44 px de alto); con
ese parámetro se ven las tres y el link pasa a "Ver solo las mías". Las
preguntas no cambian y el bloque de contacto se ve siempre.

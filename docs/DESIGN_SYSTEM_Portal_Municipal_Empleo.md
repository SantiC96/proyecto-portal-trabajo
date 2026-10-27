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
    (sidebar, panel de marca de las pantallas de /auth; encabezado de
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

Todos superan AA (4,5:1) para texto de 13 px en negrita.

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

## Pantallas de la empresa y de la oficina

  Token               Valor       Uso
  ------------------- ----------- ---------------------------------------------
  `tabla-cabecera`    `#F3F5F4`   encabezado del componente `Tabla`
  `tabla-fila-hover`  `#FAFBFA`   hover de fila del componente `Tabla`
  `texto-pestana`     `#3D4A43`   pestañas inactivas; cantidad en cero de la tarjeta de pendiente (9,3:1 sobre blanco)
  `pastilla-gris`     `#DDE3DF`   fondo de la cantidad de las pestañas y de la tarjeta de pendiente en cero

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
-   Trébol de agua (`::after`, solo desde lg): 300 px, verde al 8 %,
    girado −12°, a 28 px de la derecha y 56 px por encima del borde.
-   `.app-contenido` lleva `position: relative` e `isolation: isolate`:
    la decoración va en `z-index: -1` dentro de él, detrás del contenido,
    y no recibe clics (`pointer-events: none`).
-   El inicio (`/`) no lo lleva: `AppShell` le pone
    `.app-contenido--inicio`, que deja el fondo liso, porque su
    decoración es el hero (sección 26).
-   Las tarjetas y tablas siguen blancas. El encabezado de página, la
    sidebar y la barra del celular no cambian.

El padding del contenido es la variable `--relleno-contenido` (16 / 24 /
32 px): la usan las bandas del inicio para llegar de borde a borde.

## Trébol

El trébol de Funes para las marcas de agua es una sola pieza: la variable
`--trebol` de `globals.css`, un SVG en data URI que se usa como máscara
(`mask: var(--trebol) center / contain no-repeat`), con el color en el
`background` del elemento (`--color-primary` al 8 %). Lo usan el fondo de
las pantallas y los estados vacíos. No es una imagen ni se copia en los
componentes.

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

`src/components/perfil/indice-secciones.tsx`: desde 768 px de ancho
disponible (`@3xl:`), una columna de 220 px a la izquierda, sticky, con
el título "En esta página" (13 px 700 en mayúsculas) y un link de 44 px
por sección. Marca la sección visible con `IntersectionObserver` y
`aria-current`: la activa va en verde, sobre blanco y con un borde
izquierdo de 3 px. Las secciones, a la derecha, ocupan el resto del
ancho. En el celular el índice no se muestra.

Cada sección del perfil es una tarjeta (`SeccionPerfil` en
`components/perfil/piezas.tsx`) con su título de 20 px 800 (18 en el
celular), una línea de ayuda opcional, los campos en una grilla de 2
columnas (1 en el celular) y su botón "Guardar" abajo a la derecha.
Campos del perfil: alto 48, borde 1,5 px `border-campo`, radio 10; label
15 px 700, ayuda 13 px, error 13 px 600 en `danger`.

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

## Reglas

-   Una sección no debe contener varios botones primarios con igual
    jerarquía salvo que representen acciones equivalentes.
-   "Cancelar" en los diálogos usa el botón neutro.
-   "Cerrar sesión" y toda acción destructiva usan el botón de peligro.
    Una destructiva de menor peso que convive con otras acciones
    ("Retirar postulación", "Eliminar" un CV) usa `.btn-peligro-borde`
    (`estiloBoton="peligroBorde"` en `DialogoConfirmacion`).
-   El botón de acento se reserva para la navegación (rediseño, PR 2).
-   Dentro de un aviso rojo, la acción usa el botón neutro (el verde no
    contrasta sobre el rojo).

------------------------------------------------------------------------

# 15. Campos

Clase `.campo` (la usan `Input`, `Textarea`, el select de
`CampoFechaHora` y el `Buscador`); `.campo-grupo` para contenedores que
se ven como un campo (los chips de `MultiCombobox`).

-   borde 1,5 px `border-strong`, radio 12 px, fondo blanco;
-   texto 16 px (evita el zoom automático de iOS);
-   placeholder `placeholder`;
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

------------------------------------------------------------------------

# 16. Select / Combobox

Usar `Select` para conjuntos acotados.

Usar `Combobox` cuando:

-   existen muchas opciones;
-   se requiere búsqueda;
-   se seleccionan categorías extensas.

Para selección múltiple, mostrar elementos seleccionados de manera clara
y removible (chip blanco con borde verde, como la etiqueta de rubro
verde): `MultiCombobox`.

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
-   13 px, 700, sin salto de línea;
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
-   variante `verde`: borde `primary` y texto `primary-hover`.

No convertir párrafos o información extensa en badges.

------------------------------------------------------------------------

# 21. Tonos por estado

**El componente visual no inventa estados**: los estados vienen del
dominio y cada helper los mapea a un tono en un único lugar.

  Dominio           Estado                                    Tono        Helper
  ----------------- ----------------------------------------- ----------- ------------------------------------------------
  Postulación       Recibida                                  neutral     `badgePostulacion` (`lib/mis-postulaciones.ts`)
                    En revisión                               info        y `BADGE_ESTADO_VISIBLE`
                    Enviada a la empresa / Derivada           teal        (`lib/admin/postulacion-estados.ts`)
                    Seleccionado / Contratado                 success
                    No seleccionado                           neutral
                    Oferta cerrada                            neutral
                    Retirada                                  neutral
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
  Contadores        Pendientes (tarjetas de pendiente)        warning     `TarjetaPendiente` (gris si es 0)
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
El título es «Aún no hay empleos que coincidan con tu búsqueda» y el
texto de apoyo es «Probá con otro rubro o modalidad, o quitá algún filtro
para ver más ofertas laborales.».
El texto de apoyo es de al menos 14 px y contraste AA. «Limpiar filtros» es la única acción principal y quita la búsqueda y los
filtros activos. La acción mantiene su ancho natural también en mobile.
Anunciar resultados vacíos con una región
`aria-live="polite"`; los errores se presentan por separado y permiten
reintentar.

El buscador y los filtros forman una tarjeta de ancho completo; los chips
de rubro y modalidad se envuelven en varias líneas, también en mobile.
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

La usan el detalle de una oferta de la empresa (candidatos derivados),
Ofertas, Empresas, Postulaciones y Comprobantes de la oficina.

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
escribe.

## Pastillas de filtro

`src/components/ui/pastilla-filtro.tsx` (`PastillaFiltro`,
`GrupoPastillas`, `clasePastilla()`):

-   40 px de alto (44 px en el celular), radio 20, borde 1,5 px
    `border-campo`, 15 px 600, texto `control-foreground`;
-   la activa: fondo `primary`, texto blanco;
-   cada grupo lleva su título de 13 px 700 y `role="group"`;
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
Una pastilla que solo admite un valor opcional (Modalidad) se desactiva al
tocarla de nuevo.

## Pestañas de estado

`PestanasEstado` (`src/components/ui/pestanas-estado.tsx`), con subrayado.
Es compartido: cambia en todas las pantallas que lo usan (Mis ofertas de la
empresa; Postulaciones, Ofertas, Empresas y Comprobantes de la oficina).

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

Filtros con label arriba (Postulaciones de la oficina): cada select con su
`.etiqueta-campo` y `.campo` de 48 px, el botón "Filtrar" neutro de 48 px y
"Mostrando X de N" a la derecha.

------------------------------------------------------------------------

# 24. Modal / Dialog

Usar `Dialog` de shadcn/ui: radio 16 px, sombra `--sombra-dialogo`,
título 800 en `heading`, los mismos botones que el resto del portal
(Cancelar neutro a la izquierda, acción a la derecha).

Estructura:

``` text
Título
Descripción opcional

Contenido

Cancelar                Acción
```

No utilizar modales para procesos largos que deberían ser una página.

## Elegir el tipo de cuenta (`RegisterModal`)

El diálogo de "Registrarme" (`src/components/auth/register-modal.tsx`)
usa el `Dialog` amplio a 480 px (casi todo el ancho en el celular):
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

`<DialogContent tamano="amplio">` (pantallas del postulante): ancho 540
px, radio 20, padding 28 (22 × 18 en el celular), título de 22 px 800 y
botón X de 44 px. Sin franja gris al pie: las acciones van a la derecha;
en el celular, a todo el ancho y apiladas, con la principal abajo.

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

## Tarjetas de indicadores (panel del postulante)

Cada tarjeta es un link (`.tarjeta-clickeable`, padding 20, gap 10): el
`Badge` del estado como etiqueta (con su tono) y, debajo, el ícono del
estado a la izquierda del número (36 px 800, interlineado 1, `heading`).
Son cinco y la grilla no deja huecos: en celular, 2 por fila y el último a
todo el ancho; desde 672 px de ancho disponible, 3 arriba y 2 abajo (grilla
de 6 columnas: cada cuadro de arriba ocupa 2 y cada uno de abajo, 3); desde
1024 px, los cinco en una fila. No hay cuadro de "Activas": repetía la suma
de En revisión y Enviadas a la empresa. Al pasar el mouse se eleva (sin movimiento con movimiento reducido); el foco, con
`sombra-foco`.

-   ícono de lucide de 20 px en un cuadrado de 40 px, radio 10
    (`radius-md`), fondo `secondary` (`#EEF1EF`), en el color de texto del
    tono de su badge (`claseTextoTono`), `aria-hidden`: En revisión
    `Search` (`info`), Enviadas a la empresa `Send` (`teal`), Seleccionadas `BadgeCheck` (`success`), No
    seleccionadas `CircleX` (`neutral`) y Retiradas `Undo2` (`neutral`);
-   si el contenido del cuadro mide menos de 7,5 rem (cuadros angostos,
    celulares de 320 px), el ícono va arriba del número (container query);
-   cada tarjeta lleva a Mis postulaciones filtrada por su estado
    (`/mis-postulaciones?estado=en-revision`, `derivadas`,
    `seleccionadas`, `no-seleccionadas`, `retiradas`), con el nombre
    accesible "3 postulaciones en revisión. Ver lista".

## Filtro por estado (Mis postulaciones)

`GrupoPastillas` "Estado" con `unaLinea` (`FilaDesplazable`: una sola
fila con scroll horizontal y flechas "Ver estados anteriores" / "Ver más
estados"), arriba de la lista y debajo de la leyenda de estados:
`PastillaFiltro` "Todas" y una por cada estado de las tarjetas del panel
(no hay pastilla "Activas"), con las mismas etiquetas y su cantidad al
lado (700, números tabulares). Las cantidades de cada estado son las de `indicadores_postulante()` y los
criterios de la lista filtrada son los mismos (`CRITERIO_FILTRO`,
`src/lib/mis-postulaciones.ts`). Cambiar de filtro vuelve a la página 1;
la paginación y "Mostrando X de N" son los de la lista filtrada. Un
`?estado=` no válido (por ejemplo, `activas` de un link viejo) muestra
todas. Un filtro sin resultados muestra `EstadoVacio` `sin-resultados` con un texto por
estado ("No tenés postulaciones retiradas.") y "Ver todas". Los cambios de
filtro no cuentan como pantallas distintas para "Volver".

## Filtro por procedencia (lista de postulantes de la oficina)

`GrupoPastillas` "Procedencia" con `unaLinea` (`FilaDesplazable`, flechas
"Ver opciones de procedencia anteriores" / "Ver más opciones de
procedencia"), debajo del buscador y de los rubros y arriba de "Limpiar
filtros": `PastillaFiltro` "Todos", "De Funes, verificados", "De Funes, sin
verificar" y "Otra localidad o sin informar", cada una con su cantidad al
lado (700, números tabulares). Las de nivel llevan antes un punto de 10 px
del color del badge de su separador (`success`, `accent`, `neutral`) con un
aro blanco de 2 px para que se vea sobre el verde de la activa; es
decorativo (`aria-hidden`), el nivel lo dice el texto.

-   Vive en la URL (`?procedencia=verificado | sin-verificar | otra`). Un
    valor no válido muestra todos. Cambiar de pastilla vuelve a la página
    1 y conserva la búsqueda y los rubros; cambiar la búsqueda o los
    rubros conserva la procedencia, y "Limpiar filtros" saca todo.
-   Las cantidades respetan la búsqueda y los rubros, no la procedencia
    elegida (son los mismos totales de los separadores). Mientras cargan,
    las pastillas se ven sin número.
-   Con un filtro, la lista muestra solo el separador de ese nivel.
-   Sin resultados por la procedencia sola: `EstadoVacio` `sin-resultados`
    con un texto por nivel ("No hay postulantes de Funes con el domicilio
    verificado.") y "Ver todos". Con búsqueda o rubros, el texto de
    siempre y "Limpiar filtros".

## Barra de progreso

`src/components/ui/barra-progreso.tsx`: alto 10, radio 5, fondo
`progreso-fondo`, relleno `primary`, `role="progressbar"` con
`aria-label` ("Perfil completo al 70%") y `aria-valuenow`. El porcentaje
visible va al lado, en 14 px 700.

## Invitaciones

Borde de 2 px `accent` sobre blanco, título `invitacion-titulo`, badge
warning y botón `.btn-oscuro` (fondo `accent-foreground`, texto blanco).

## Tarjeta de pendiente (panel de la oficina)

`src/components/ui/tarjeta-pendiente.tsx` (`TarjetaPendiente`). Toda la
tarjeta es un link (`.tarjeta`, padding 20, gap 14); en hover, el borde se
pone `primary`.

-   arriba: ícono blanco en un cuadrado `primary` de 44 px con radio 12 y,
    a la derecha, la cantidad en una pastilla de 36 px de alto, 20 px 800
    (`aria-label` "N pendientes"): `accent` con `accent-foreground` si es
    mayor a 0; `pastilla-gris` con `texto-pestana` si es 0;
-   el título en 17 px 800;
-   abajo, la acción en 15 px 700 verde con flecha.

Grilla de 3 columnas, 2 en tablet y 1 en el celular (según el ancho del
contenido).

## Tarjeta de acceso

`src/components/ui/tarjeta-acceso.tsx` (`TarjetaAcceso`): link con un ícono
en un cuadrado verde de 44 px, título de 17 px 800, descripción de 14 px,
un dato opcional (13 px 600, "3 cursos activos") y chevron. En hover, el
borde verde. Accesos del panel de la oficina y "Más herramientas" del panel
de la empresa, en 2 columnas (1 en el celular).

## Panel de la empresa

`EncabezadoPagina` "Hola, [razón social]" con "Mis ofertas" (neutro) y
"Publicar oferta" (primario). Si hay ofertas vencidas o por vencer, una
`Franja` de aviso con el link a Mis ofertas. Los indicadores de ofertas
usan las mismas tarjetas que el panel del postulante, sin ícono (badge
del estado y número de 36 px 800; 2 columnas en el celular, 3 en tablet y 5 en
pantallas anchas). "Candidatos por contactar": una tarjeta con una fila por
candidato (iniciales, nombre de 16 px 700, "[oferta] · derivado el
[fecha]", badge y "Ver candidato" neutro, a todo el ancho en el celular).

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
    enTarjeta`) en una tarjeta.

------------------------------------------------------------------------

## Indicadores (oficina y empresa)

`/admin/indicadores` y `/empresa/indicadores`: `EncabezadoPagina` con el
control segmentado del período a la derecha (debajo hasta xl), una fila de
tarjetas de número y los gráficos, cada uno en su `TarjetaGrafico`. Los
números salen de las funciones de la base (decisiones 019 y 021); la
página los pide en el servidor y los pasa a los gráficos por props.

### Control segmentado (`SelectorPeriodo`)

`src/components/indicadores/selector-periodo.tsx`. Fondo
`secondary-hover`, padding 4, radio 12. Cada opción es un link de 40 px
(44 en el celular), 14 px 700; la elegida en `surface` con texto `primary`
y una sombra suave, marcada con `aria-current` (en un link no vale
`aria-pressed`). "Últimos 30 días", "Últimos 90 días", "Este año" y
"Todo", con el mismo `?periodo=` de siempre. En el celular ocupa todo el
ancho, en dos filas.

### Tarjeta de número (`TarjetaNumero`)

`src/components/indicadores/tarjeta-numero.tsx`. `.tarjeta` con padding
20: un ícono blanco en un cuadrado `primary` de 48 px con radio 12, el
número en 36 px 800 (28 en el celular), la etiqueta en 15 px 700 y un
subtítulo de 13 px. Con `href`, toda la tarjeta es el link (chevron arriba
a la derecha). `GrillaNumeros`: 4 columnas, 2 en el celular.

### Tarjeta de gráfico (`TarjetaGrafico`)

`src/components/indicadores/tarjeta-grafico.tsx`. Padding 24 (18 × 16 en
el celular); título de 18 px 800 y descripción de 14 px `muted`; un valor
destacado opcional arriba a la derecha (30 px 800 con su etiqueta de 13
px). Debajo, **la conclusión**: una línea de 15 px 700 `primary-hover` con
un ícono, calculada con los datos ("Octubre fue el mes con más
postulaciones: 34", "La mayoría de tus candidatos están en proceso"). Al
final, **"Ver datos"** (`details`/`summary`, 44 px) despliega una tabla
con los mismos números: es la alternativa al gráfico para quien no lo ve.
`IndicadorChico` (ícono en un cuadrado `secondary` de 40 px, número de 22
px 800 y texto de 13 px) arma las tarjetas de resumen como "Proceso de la
Oficina".

### Gráficos

Componentes de cliente en `src/components/indicadores/`, sobre el chart
de shadcn/ui (`src/components/ui/chart.tsx`, Recharts) con los colores
ajustados a los tokens: tooltip en `surface` con anillo `border`, texto de
13 px, grilla `tabla-borde` y cursor `border-strong`. Todos llevan
`accessibilityLayer` y un `role="img"` con un `aria-label` que resume el
gráfico; no animan con `prefers-reduced-motion` (ni antes de conocer la
preferencia).

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
-   **Barras** (`BarrasOferta`): para comparar cantidades. Barras
    horizontales de 16 px por oferta (derivados `primary`, entrevistas
    `info`, seleccionados `accent`), con el valor al final de cada una y la
    misma escala en todas las ofertas; la leyenda (`LeyendaMedidasOferta`)
    va arriba de las tarjetas.

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
Contacto de la Oficina de Empleo
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
muestra "CUIT válido" en vivo. "Crear cuenta" es primario a todo el ancho
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
    sobre, el aviso del comprobante si no se subió y el recuadro "¿Qué
    sigue después de confirmar?".
-   Empresa (`/auth/verificar-email-empresa`): "Empresas de Funes" /
    "Confirmá tu email y esperá la aprobación." / "La Oficina de Empleo
    revisa cada empresa antes de que pueda publicar ofertas." Los dos
    pasos van numerados con círculos verdes de 28 px, título de 15 px 700
    y texto de 14 px, como las secciones numeradas.

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
    en un círculo verde claro de 56 px arriba) y "Elegí una contraseña
    nueva".
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
-   trébol de agua (`--trebol`): 220 px (150 en celular), verde al 8 %,
    girado −12°, a −40 px de la derecha y −50 px de arriba (−60 / −70 en
    celular).

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

Fila de aclaración y acción (Mis postulaciones): las franjas y el botón
"Retirar postulación" van en una misma fila. Desde 640 px (`sm`), las
franjas en una columna a la izquierda (una debajo de la otra, gap 12) y
el botón a la derecha (`ml-auto`, 40 px), centrados entre sí
(`items-center`): si hay varias franjas, el botón queda centrado respecto
del grupo. Si hay solo franjas o solo el botón, el botón sigue a la
derecha. En el celular, una debajo de la otra: primero las franjas y
después el botón a todo el ancho (44 px).

En las fichas de la empresa y de la oficina: "Entrevista coordinada:" y
"Coordinada:" (pre-entrevista) en `info`; el resultado final del proceso
en `ok` (seleccionado o contratado) o `neutra` (no seleccionado, proceso
cerrado, retirada); "Modificada tras la postulación" y las ofertas
vencidas del panel de la empresa en `aviso`.

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

## Archivo en una tarjeta

`src/components/ui/fila-archivo.tsx` (`FilaArchivo`): fila con borde y
radio 12; ícono en un cuadrado `secondary` de 40 px, nombre (15 px 700),
detalle ("Cargado el …") y "Ver CV" neutro a la derecha (a todo el ancho
en el celular), que abre la URL firmada en otra pestaña.

## Formulario en secciones numeradas

`src/components/ui/seccion-numerada.tsx` (`SeccionNumerada`): el número en
un círculo `primary` de 28 px (14 px 800 blanco) y el título de 18 px 800;
los campos debajo. Variante "tarjeta" (cada sección en su `.tarjeta`,
padding 24; 20 × 16 en el celular) para el formulario de oferta y "plana"
para el registro. Los campos usan `.campo` y `.etiqueta-campo`; las
opciones cortas (modalidad, jornada, duración) son radios con forma de
pastilla (`clasePastilla`). Si el envío tiene errores, arriba aparece un
`Aviso` de error enfocado ("Faltan datos para enviar la oferta. Revisá los
N campos marcados.") y cada campo muestra el suyo en rojo.

El formulario de oferta tiene seis secciones (El puesto, Rubros,
Condiciones, Requisitos, Beneficios y Publicación) y un pie con Cancelar, "Guardar borrador" (neutro) y "Enviar a revisión"
(primario). El pie (y el `Aviso` de error del servidor, si hay) va en la
columna del formulario: mide lo mismo que las tarjetas de la izquierda,
no pasa por debajo de la vista previa; en el celular, a todo el ancho.
Arriba, según el caso, una `Franja` de error con el motivo del rechazo o
una de aviso al editar una oferta publicada; van fuera de las columnas y
no corren la vista previa.

### Vista previa

En pantallas anchas (desde xl), una columna lateral sticky de 360 px: la
`TarjetaOferta` con lo que se va cargando (título, empresa, rubros,
modalidad, jornada y ubicación), inerte (`inert`: no se enfoca ni se lee,
es una copia del formulario), y debajo el rótulo "Vista previa" y la nota
"La Oficina de Empleo revisa cada oferta antes de publicarla." La tarjeta
va primero para que empiece a la misma altura que "1. El puesto". En el
celular y en tablet no se muestra.

## Formularios dentro de una tarjeta angosta

Coordinar una entrevista (empresa) o una pre-entrevista (oficina) va en la
tarjeta de gestión, no en un diálogo: `<CampoFechaHora compacto />` pone
fecha (campo de fecha del navegador, desde hoy) y hora lado a lado, el
lugar debajo a todo el ancho y el botón secundario "Guardar …" a todo el
ancho. Mismas validaciones y mensajes que el diálogo con calendario.

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

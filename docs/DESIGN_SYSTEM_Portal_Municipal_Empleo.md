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
  `texto-volver`        `#2E4337`   link "Volver al inicio" de /auth
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

`border-tab` (`#C6D8CD`) también es el borde de las pastillas de rubro y
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
`.btn-neutro`, `.btn-peligro`, `.btn-acento`, `.campo`, `.campo-grupo`,
`.etiqueta-campo`, `.tarjeta` y `.tarjeta-clickeable`.

------------------------------------------------------------------------

# 7. Tipografía

## Familias

**Body y títulos (token `font-sans`):** Public Sans, cargada con
`next/font/google` en `src/app/layout.tsx` (pesos 400, 500, 600, 700 y
800; subset latin; `display: swap`) y expuesta como `--font-public-sans`.

**Display (token `font-display`):** `Georgia, "Times New Roman", serif`

Excepción documentada: solo para los títulos grandes del login. No usar
en otros contextos ni en la interfaz autenticada.

No introducir familias tipográficas adicionales.

El `body` usa `-webkit-font-smoothing: antialiased`.

## Escala

  Uso                   Tamaño       Peso   Color
  -------------------- ------------ ------ -----------
  Título de página      24--30 px    800    `heading`
  Título de sección     20 px        800    `heading`
  Body                  15--16 px    400    `foreground`
  Label                 15 px        600    `control-foreground`
  Botón                 15 px        700
  Badge                 13 px        700
  Caption               12--14 px    400--500

Los `h1` y `h2` toman el peso 800 y el color `heading` desde
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

Borde de 1 px `border`, sin sombra. Una tarjeta clickeable se eleva 2 px
con `--sombra-tarjeta-hover` al pasar el mouse.

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
-   Sin `max-width` global: cada página decide su ancho.
-   Las páginas no agregan padding propio ni `mx-auto max-w-*`: el
    margen lo pone `.app-contenido`.
-   Listas y paneles: todo el ancho.
-   Textos largos, formularios y detalles: clase `.contenido-lectura`
    (`max-width: 720px`), o `.contenido-lectura-ancho` (`960px`) si el
    formulario o el detalle tiene dos columnas. Alineados a la izquierda.
-   Para pasar de una a varias columnas dentro del contenido se prefieren
    container queries (`@container`, `@xl:`, `@4xl:`) a los breakpoints
    de la ventana: la sidebar le quita ancho al contenido.

Los formularios no deben expandirse innecesariamente a todo el viewport.

## PageContainer

Todas las páginas internas deben utilizar un contenedor compartido.

Responsabilidades:

-   ancho máximo;
-   padding responsive;
-   separación vertical;
-   alineación.

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
(`src/components/ui/encabezado-pagina.tsx`): título de 32 px 800,
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
  `.btn-acento`      `accent`           `accent`        ---                     `accent-foreground`   `accent-hover`

`ghost` y `link` quedan para acciones de baja jerarquía y botones de
ícono (44 × 44).

## Reglas

-   Una sección no debe contener varios botones primarios con igual
    jerarquía salvo que representen acciones equivalentes.
-   "Cancelar" en los diálogos usa el botón neutro.
-   "Cerrar sesión" y toda acción destructiva usan el botón de peligro.
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
verde).

------------------------------------------------------------------------

# 17. Card

Clase `.tarjeta`:

-   superficie blanca;
-   borde 1 px `border`;
-   radius 16 px;
-   sin sombra.

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
clickeable, padding 24, gap 14:

``` text
┌──────────────────────────────────────┐
│ [Gastronomía +1] [Presencial] [Te invitaron] │
│ Ayudante de cocina                   │  20 px 700, hasta 2 renglones
│ Restaurante El Molino                │  15 px 600 texto-bajada
│ 📍 Funes    🕒 Jornada completa       │  14 px muted, íconos 16 px
│ [ Ver oferta ]                       │  secundario (primario: "Postularme")
└──────────────────────────────────────┘
```

-   Etiquetas: rubro (`EtiquetaRubro verde`, el primero y "+N"),
    modalidad (`EtiquetaRubro`) y badges extra (`Te invitaron` warning,
    coincidencia).
-   El título es el link y cubre la tarjeta (un paso de teclado por
    oferta); el botón de abajo es visual. Una acción extra con su propio
    link (`Buscar postulantes` de la oficina) va por encima.
-   El listado `/ofertas` sigue usando `JobCard`.

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
                    Modificada                                info
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
  Contadores        Pendientes (pestañas, tarjetas)           warning     `ContadoresEstado`, `PestanasEstado`

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
    `.06em`, color `neutral`, fondo `tabla-encabezado`. Filas en grilla
    (las mismas columnas que el encabezado), padding 12 × 20, gap 16,
    borde superior `tabla-borde`, hover `tabla-hover`. La acción va a la
    derecha (botón neutro de 40 px y 14 px).
-   Separadores de grupo: fila con fondo `tabla-separador`, el badge del
    grupo, el título en 14 px 700 y "· N" con el total del grupo según los
    filtros.
-   Más angosto: cada fila es una tarjeta (foto y nombre arriba, datos
    debajo, badges que bajan de renglón y la acción a todo el ancho); los
    separadores quedan como franjas redondeadas.
-   El encabezado de columnas es visual (`aria-hidden`); cada celda lleva
    su rótulo para lectores de pantalla.
-   Paginación con números: `<Paginacion variante="numeros" />`
    ("Página N de M" a la izquierda; Anterior, números y Siguiente de 44
    px a la derecha; la actual en verde y "…" si son muchas). El total
    ("Mostrando X–Y de N") va en la fila de filtros.

------------------------------------------------------------------------

# 23. Filtros

Los filtros deben ubicarse cerca del listado que afectan.

Orden recomendado:

``` text
[Buscar........................] [Categoría ▼] [Estado ▼] [Más filtros]
```

Los filtros activos deben ser visibles y fáciles de limpiar.

No esconder filtros básicos detrás de un modal en desktop.

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
`Badge` del estado como etiqueta (con su tono) y el número debajo (36 px
800, interlineado 1, `heading`). 2 columnas en celular, 3 en tablet y una
fila en pantallas anchas. Al pasar el mouse se eleva.

## Barra de progreso

`src/components/ui/barra-progreso.tsx`: alto 10, radio 5, fondo
`progreso-fondo`, relleno `primary`, `role="progressbar"` con
`aria-label` ("Perfil completo al 70%") y `aria-valuenow`. El porcentaje
visible va al lado, en 14 px 700.

## Invitaciones

Borde de 2 px `accent` sobre blanco, título `invitacion-titulo`, badge
warning y botón `.btn-oscuro` (fondo `accent-foreground`, texto blanco).

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
Bloque principal: volanta, título, bajada, buscador y rubros
Últimas ofertas (carrusel)
Tu actividad (solo postulante con sesión)
Cómo funciona (solo sin sesión)
Contacto de la Oficina de Empleo
```

Gap de 48 px entre secciones; títulos de sección de 26 px 800. El bloque
principal es una tarjeta blanca de radio 24 (padding 56 / 56 / 48, 24 en
celular). El buscador (`role="search"`, hasta 960 px) lleva a `/ofertas`
con `q` y `categoria`.

El objetivo visual principal debe ser facilitar el acceso a las ofertas
laborales.

------------------------------------------------------------------------

# 27. Login

El login debe sentirse parte del mismo producto.

Sin navegación. Página: `src/app/auth/login/page.tsx`; formulario:
`src/components/auth/login-form.tsx`; clases `.login-*` y `.auth-*` de
`globals.css`.

Desktop (desde lg), dos columnas a pantalla completa (`100svh`):

``` text
┌────────────────────────┬──────────────────────────────┐
│ [logo blanco]          │   ← Volver al inicio         │
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
-   **Registrate:** botón con `aria-expanded` que despliega dos opciones
    (filas de 64 px, borde 1,5 px `border-strong`, radio 14, ícono en un
    cuadrado verde de 44 px, hover borde verde) hacia
    `/auth/registro` y `/auth/registro?tipo=empresa`.
-   **Animaciones** (sin movimiento reducido): título y tarjeta suben
    16 px con fundido en 700 ms (la tarjeta 150 ms después); las
    opciones de registro aparecen en 250 ms.

Celular: sin el panel verde, fondo `fondo-auth`, tarjeta a todo el ancho
con padding 24 px y título de 34 px.

## Demás pantallas de /auth

Registro, recuperar y nueva contraseña, reset enviado, verificar email
e invitación usan `AuthShell` (`src/components/auth/auth-shell.tsx`):
fondo `fondo-auth`, "Volver al inicio", y el contenido en la misma
tarjeta que el login con el logo verde arriba. Ancho 460 px; el registro,
640 px.

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
van sobre `surface-tinted` con borde `border` y texto
`muted-foreground-strong`.

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
animaciones.

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

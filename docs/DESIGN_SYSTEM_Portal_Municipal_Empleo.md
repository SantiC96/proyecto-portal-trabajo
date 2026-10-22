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
  `brand-subtle`    `#B9DCC7`   blobs y órbitas del panel login intro

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

## Desktop autenticado

Estructura recomendada:

``` text
┌───────────────┬─────────────────────────────────────────┐
│               │ Header / contexto / usuario             │
│   Sidebar     ├─────────────────────────────────────────┤
│               │                                         │
│               │              Page content               │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

## Contenido

Ancho máximo recomendado para páginas de contenido:

`max-w-7xl`

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

## Apariencia

-   fondo `brand-900` o `brand-800`;
-   escudo blanco;
-   texto blanco o blanco atenuado;
-   íconos Lucide;
-   item activo claramente visible;
-   separadores mínimos.

## Item normal

Fondo transparente.

## Hover

Fondo blanco con baja opacidad.

## Item activo

Debe diferenciarse mediante fondo claro/translúcido y mayor contraste,
no únicamente mediante cambio de color del texto.

## Marca

Parte superior:

``` text
[Escudo] MUNICIPALIDAD
         DE FUNES
         Portal de Empleo
```

En modo compacto puede quedar únicamente el escudo.

------------------------------------------------------------------------

# 13. Header de página

Componente compartido: `PageHeader`.

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

En mobile no forzar tablas ilegibles: utilizar cards o una
representación responsive definida.

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
Navbar
Hero
Buscador de ofertas
Categorías / accesos
Ofertas destacadas o recientes
Cómo funciona
Bloque institucional
Footer
```

El objetivo visual principal debe ser facilitar el acceso a las ofertas
laborales.

------------------------------------------------------------------------

# 27. Login

El login debe sentirse parte del mismo producto.

Desktop:

``` text
┌────────────────────────┬──────────────────────────────┐
│                        │                              │
│ Identidad institucional│          Login              │
│ / mensaje / gráfica    │                              │
│                        │                              │
└────────────────────────┴──────────────────────────────┘
```

En mobile se prioriza el formulario y la marca se simplifica.

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

-   sidebar → navegación móvil;
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

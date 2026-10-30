# 032 — Gráficos de los indicadores

**Fecha:** 2026-10-23
**Estado:** Vigente
**Migración:** 061 (`postulaciones_por_periodo`, punto 6) y 066 (`indicadores_comparados`, `series_indicadores` y `estado_postulaciones_periodo`, punto 8)

---

## Contexto

Los indicadores de la oficina (decisión 019) y de la empresa (decisión 021) eran grupos de números y dos gráficos de barras hechos con CSS. La oficina usa esa pantalla para informar al municipio: necesita ver de un vistazo cómo se reparten las postulaciones, qué pasó con las derivaciones y cómo vienen los meses, y poder contarlo. La tercera ronda del rediseño pide gráficos de área, de dona y de barras. Los datos no cambian: siguen saliendo de las mismas funciones de la base (`indicadores_portal`, `postulaciones_por_mes`, `postulaciones_por_rubro`, `indicadores_empresa` e `indicadores_por_oferta_empresa`).

---

## Decisiones tomadas

### 1. shadcn charts (Recharts) y no MUI X Charts

El componente de gráficos de shadcn/ui (`npx shadcn add chart`) agrega `src/components/ui/chart.tsx` (`ChartContainer`, `ChartTooltip`, `ChartLegend`) sobre Recharts 3.

- El proyecto ya usa shadcn/ui con Tailwind y tokens propios. `chart.tsx` es código nuestro: se ajustó a los tokens como el popover (tooltip en `surface` con anillo `border`, grilla `tabla-borde`, sin `bg-background` ni `font-mono`), sin un tema aparte.
- MUI X trae su sistema de estilos (Emotion y el tema de Material UI). Para que se viera como el resto habría que mantener un segundo tema en paralelo a los tokens, y suma mucho peso a pantallas que hoy no usan nada de MUI.
- Recharts es SVG y se compone con elementos (`<Area>`, `<Pie>`, `<Bar>`): cada gráfico del diseño es un componente chico, y tiene `accessibilityLayer` para recorrerlo con el teclado.

Se instaló solo `recharts` (lo agrega el comando). El comando también creó `components/ui/card.tsx`, que `chart.tsx` no usa: se borró, porque el portal ya tiene `.tarjeta`.

### 2. Dona solo con pocas partes; barras para comparar

- **Dona** cuando las partes suman un total que importa y son pocas (hasta seis, el largo de la paleta): rubros (los 5 con más postulaciones y "Otros rubros"), resultado de las derivaciones, empresas por estado, ofertas por estado y candidatos por resultado. Con más partes los ángulos chicos no se distinguen; por eso `postulaciones_por_rubro` se pide con `p_limite` 5.
- **Barras** cuando hay que comparar cantidades entre sí: derivados, entrevistas y seleccionados de cada oferta, con la misma escala en todas las ofertas para que se puedan comparar las tarjetas.
- **Área** para una sola serie en el tiempo (las postulaciones del período elegido, punto 6).
- La paleta va siempre en el mismo orden y cada parte toma el color de su posición, no de su tamaño: el mismo dato tiene el mismo color cada vez.

### 3. Los gráficos son componentes de cliente con datos del servidor

Recharts mide el contenedor y dibuja en el navegador, así que `GraficoArea`, `GraficoDona` y `BarrasOferta` llevan `"use client"`. Las páginas siguen siendo Server Components: piden los datos con la sesión del usuario (RLS y las funciones de la base deciden qué ve cada rol), calculan las partes, la conclusión y la tabla, y pasan solo los números por props. El cliente no consulta nada ni recibe más datos que los que se muestran. La tarjeta, la conclusión y "Ver datos" son HTML del servidor: se leen aunque el gráfico todavía no se haya dibujado.

### 4. Accesibilidad: resumen, conclusión y tabla

Un gráfico solo no alcanza para todos:

- **Resumen:** cada gráfico va en un `role="img"` con un `aria-label` que dice qué muestra y sus números ("Gráfico de dona. Empresas por estado. Total: 12. Aprobadas: 9 (75 %)…").
- **Conclusión:** una línea calculada con los datos arriba del gráfico ("Octubre fue el mes con más postulaciones: 34"). Es lo primero que se lee y no depende del color.
- **Tabla:** "Ver datos" (`details`/`summary`) despliega una tabla con los mismos números. Es la alternativa para lectores de pantalla, para quien no distingue los colores y para copiar los números a un informe.
- Las leyendas muestran nombre, cantidad y porcentaje junto al color, porque el amarillo y el gris de la paleta no llegan a 3:1 contra el blanco.
- `accessibilityLayer` permite recorrer el gráfico con el teclado y ver el tooltip.
- Con `prefers-reduced-motion` no hay animación de entrada; en el servidor y durante la hidratación tampoco (`useMovimientoReducido`), para no animar antes de conocer la preferencia.

### 5. Modo de datos de ejemplo, sin marcas en pantalla

Con pocos datos reales los gráficos se ven vacíos y no sirven para mostrar en una presentación cómo se usa la pantalla. La variable de entorno de servidor `INDICADORES_DE_EJEMPLO=true` hace que `obtenerIndicadores()` y `obtenerIndicadoresEmpresa()` devuelvan los datos de `src/lib/indicadores-ejemplo.ts` en lugar de llamar a las funciones de la base.

- **Por qué así y no cargando datos en la base:** datos ficticios en la base se mezclarían con los reales, dispararían avisos y correos, y habría que borrarlos después. Con la variable no se escribe nada y se apaga sin dejar rastro.
- **Mismos tipos, mismas pantallas:** el módulo devuelve exactamente lo que devuelven las funciones de la base, así que las páginas, la conclusión, "Ver datos" y los gráficos no cambian. Los datos salen de una lista de postulaciones y derivaciones con fecha (siempre la misma para cada mes) contada por período: cada período contiene al más corto, las tarjetas coinciden con los gráficos y las contrataciones nunca superan a las derivaciones. Para eso, un resultado de la empresa se cuenta en el período de su derivación (la base lo cuenta por la fecha del resultado).
- **Días con variación creíble:** las postulaciones de cada mes se reparten entre sus días según el día de la semana (menos los sábados y domingos) con una variación fija por día, por resto mayor, así que el total del mes no cambia. El gráfico de área cuenta esa misma lista por día, semana o mes: las semanas y los meses son la suma de los días y el total coincide con la tarjeta "Postulaciones nuevas" en cada período.
- **Sin marcas en pantalla:** con el modo prendido, las pantallas se ven exactamente igual que con los datos reales: no hay aviso ni etiqueta "Ejemplo" en ninguna tarjeta. Se sacaron para que la presentación muestre la pantalla tal como la va a usar la Oficina. La contracara es que nada en la pantalla, en una captura o en una foto distingue los datos ficticios de los reales.
- **Hay que apagarlo después de cada presentación:** un número ficticio que se confunde con uno real es un error grave en una pantalla pensada para informar al municipio. Como la pantalla no lo avisa, la variable se prende solo para la presentación (de preferencia en un entorno aparte, como *Preview*) y se apaga en cuanto termina, volviendo a desplegar. No hay link ni parámetro para cambiar a los datos reales: mientras la variable esté prendida, los indicadores son siempre de ejemplo.
- **Alcance:** solo las dos pantallas de indicadores. La sesión y el rol se siguen exigiendo, y ninguna otra pantalla, contador ni acción cambia. En las tarjetas por oferta de la empresa el título no lleva link, porque esas ofertas no existen.
- **Activación:** es de servidor (sin `NEXT_PUBLIC_`). En Vercel, después de prenderla o apagarla hay que volver a desplegar.

### 6. El gráfico de área sigue al período elegido

Antes el área mostraba siempre los últimos 12 meses (`postulaciones_por_mes()`), aunque el resto de la pantalla mostrara 30 días: el total no coincidía con la tarjeta "Postulaciones nuevas" y la conclusión hablaba de otro lapso. Ahora usa `postulaciones_por_periodo(p_desde, p_agrupacion)` (migración 061), con el mismo `p_desde` que las tarjetas:

| Período | Agrupación | Puntos | Eje X |
| --- | --- | --- | --- |
| Últimos 30 días | Día | 31 (el día de hace 30 días y hoy, los dos parciales) | "12 oct" |
| Últimos 90 días | Semana, de lunes a domingo | 13 o 14 | "6 oct" (primer día contado de la semana) |
| Este año | Mes | De enero al mes actual | "oct" |
| Desde el inicio | Mes | Del mes de la primera postulación al actual | "oct"; la primera etiqueta y la primera de cada año con el año ("ene 26") |

- **El total coincide con la tarjeta:** la función cuenta lo mismo que `postulaciones_nuevas` de `indicadores_portal` (`created_at >= p_desde`, sin excluir ninguna). Por eso el primer día, semana o mes puede ser parcial: "últimos 30 días" son 30 × 24 horas desde ahora, que tocan 31 fechas.
- **Los vacíos en 0:** `generate_series` arma todos los días, semanas o meses y los que no tienen postulaciones van en 0, igual que en `postulaciones_por_mes()`.
- **Textos que siguen a la agrupación:** el título ("Postulaciones por día / semana / mes"), la descripción con el alcance, la conclusión (el día, la semana o el mes con más postulaciones; el más reciente gana los empates), el tooltip (la fecha completa con el día de la semana, el rango de la semana —recortado al período en la primera y la última— o el mes) y "Ver datos".
- **Eje X sin pisarse:** `GraficoArea` mide su ancho y elige a mano qué fechas mostrar (`ticks`), siempre con la primera y la última: 30 días, una cada 5 días en escritorio y cada 7 en celular (menos de 480 px de gráfico); 90 días, todas las semanas en escritorio y una de cada dos en celular; meses, todos en escritorio y uno de cada dos en celular. La anteúltima se saca si queda a menos de medio paso de la última. Si con ese paso las etiquetas se pisan (por ejemplo, 14 semanas en 375 px), el paso crece de a uno. Las etiquetas van centradas en su punto, en 13 px `muted-foreground` y cifras tabulares, con una marca de 5 px que baja desde la grilla; los márgenes del área (12 y 24 px) dejan lugar a la primera y la última. En meses que cruzan de año, el año va en las etiquetas que se ven, no en meses ocultos.
- **Rango debajo del eje:** a la derecha, en 12 px `muted-foreground`, el período completo del primer día contado a hoy ("Del 25 de septiembre al 25 de octubre de 2026").
- `postulaciones_por_mes()` queda en la base sin cambios y sin uso en el código.

### 7. Eje Y con valores redondos

El área muestra el eje Y a la izquierda con 3 a 5 valores redondos (`escalaRedonda`: pasos de 1, 2, 5, 10, 20, 50…), en 13 px, color `muted-foreground` y cifras tabulares, sin línea de eje. La grilla horizontal se alinea con esos valores y el ancho del eje se ajusta al número más largo (`width="auto"`). Las barras por oferta de la empresa no llevan eje: cada barra muestra su valor al final y un eje en una tarjeta de 112 px de alto la recargaría.

### 8. Rediseño de la oficina: comparación, tendencia y estado (ronda 6)

`/admin/indicadores` se rediseñó según la ronda 6. Los indicadores de la empresa no cambian: los componentes compartidos (`TarjetaGrafico`, `GraficoDona`, `Tabla`, `EncabezadoPagina`) ganaron props opcionales y sin ellas se ven igual.

- **Selector de período desplegable** (`SelectorPeriodoDesplegable`): un botón con el período elegido abre la lista; cada opción sigue siendo un link con `?periodo=`, así el período se resuelve en el servidor. Patrón *disclosure* (botón con `aria-expanded` y `aria-controls`; Escape cierra y devuelve el foco; la opción actual con `aria-current`). Sin JavaScript, los links se ven en una fila (`noscript`). "Todo" pasa a llamarse "Desde el inicio". La empresa sigue con el control segmentado.
- **Comparación con el período anterior** (migración 066, `indicadores_comparados`): el período anterior es el de la misma duración inmediatamente antes (`[p_desde − (ahora − p_desde), p_desde)`); "Este año" se compara con los mismos días antes del 1 de enero, no con el mismo tramo del año pasado. "Desde el inicio" no tiene anterior. La variación es un porcentaje del anterior redondeado a entero ("Sin cambios" si da 0; "Nuevo en este período" si el anterior fue 0); la de la tasa, en puntos porcentuales con un decimal.
- **Qué compara cada tarjeta:** las postulaciones y las contrataciones, su propio valor. "Postulantes registrados" muestra el total y compara los registros nuevos; "Ofertas vigentes" muestra las de hoy y compara las **publicadas** en cada período, porque la base no guarda qué ofertas estaban vigentes en una fecha pasada (no hay historial de estado ni fecha de cierre, y `vence_en` cambia al renovar). Por eso esas dos tarjetas dicen debajo sobre qué se calculó ("24 nuevos en el período", "24 publicadas en el período").
- **Tasa de contratación:** contrataciones sobre postulaciones nuevas del mismo período. Es una razón entre cantidades del período: una contratación puede venir de una postulación anterior. No es la tasa de `indicadores_portal` (contrataciones sobre resultados finales), que quedó sin uso en la pantalla.
- **Mini líneas y evolución general** (`series_indicadores`): las mismas filas que `postulaciones_por_periodo` (día, semana o mes según el período, vacíos en 0) con cuatro columnas; la suma de cada una coincide con su tarjeta. Las mini líneas son SVG del servidor (120 × 44, `aria-hidden`: el dato está en el texto). La evolución general es `GraficoArea` con dos series: postulaciones (`primary`, 2,5 px, área al 16 %) y contrataciones (verde claro, 2 px), con un punto en cada valor, 5 marcas en el eje Y (`escalaDeCinco`) y el tooltip con la fecha y los dos valores.
- **Estado de las postulaciones** (`estado_postulaciones_periodo`): las creadas en el período, según su estado de hoy: en revisión (recibida y en revisión), derivadas (pendientes, en proceso o contratadas) y rechazadas (por la Oficina o por la empresa). Las retiradas por el postulante y las de ofertas que la empresa retiró **no van en la dona**: no son una revisión, una derivación ni un rechazo (decisiones 024 y 025). La función las devuelve aparte y la tarjeta dice cuántas quedaron afuera, para que la diferencia con "Postulaciones nuevas" no quede sin explicar. Dona de 190 px (`GraficoDona variante="resumen"`).
- **Ofertas por área:** los 4 rubros con más ofertas vigentes y el resto en "Otros", de `contar_ofertas_vigentes_por_rubro` (065); una oferta con varios rubros cuenta en cada uno. Las barras son HTML del servidor (`BarrasVerticales`), no Recharts: cada valor está escrito (no hace falta tooltip) y los nombres pasan de línea entre palabras. Son verticales desde 32 rem de ancho de la tarjeta y horizontales más angosta: en la columna de 1440 px cada barra vertical mide unos 46 px y "Administración" o "Gastronomía" se cortaban a mitad de palabra.
- **Últimas postulaciones:** las 5 más recientes con una consulta común (la Oficina ya las lee por RLS), en `Tabla variante="incrustada"` (tabla desde 320 px de ancho de la tarjeta). Los estados de la dona llevan sus colores (En revisión, que junta recibidas y en revisión; Derivada; Rechazada) y los demás el badge de siempre. Cada fila lleva a la ficha; en el modo de ejemplo, no.
- **Colores nuevos, solo en estos gráficos:** verde claro `#8CC63F` (`grafico-verde-claro`) y gris `#C5CEC8` (`grafico-gris`). Ninguno llega a 3:1 contra el blanco: siempre van con su nombre y su número al lado, y está "Ver datos". Como fondo de badge, con texto `heading` (#0F2A1B) superan 7:1.
- **Lo de antes, debajo:** postulaciones por rubro, resultado de las derivaciones, empresas y proceso de la Oficina, con el estilo de las tarjetas nuevas (radio 18 y el ícono junto al título), en la misma grilla.
- **Modo de ejemplo:** genera además registros de postulantes, ofertas con fecha de publicación, duración y rubros, y retiros, y cuenta el período anterior igual que el actual. La historia pasó de 12 a 24 meses para que "Este año" tenga con qué compararse.

### 9. Aparición al hacer scroll

`AparecerAlScroll` (cliente) envuelve cada tarjeta o fila. Antes de pintar (`useLayoutEffect`) mira si está debajo de la pantalla: solo en ese caso le pone `data-aparecer="oculto"` y la observa con `IntersectionObserver`; al entrar pasa a `"visible"` (opacidad de 0 a 1 y 16 px hacia arriba, 400 ms) y deja de observarla. Lo que ya está a la vista al cargar, o arriba (al volver con el scroll guardado), no se toca.

- El contenido sigue siendo HTML del servidor: el componente solo cambia un atributo, que React no maneja (no lo pisa un nuevo render).
- Sin JavaScript, sin `IntersectionObserver`, con `prefers-reduced-motion` o al imprimir, todo se ve directamente: el estado oculto solo existe en CSS bajo `prefers-reduced-motion: no-preference`.
- `translate` y `opacity` no mueven el layout: el CLS medido en Chrome fue 0 a 1440 y 375 px.
- Si el foco del teclado entra a una tarjeta oculta, el navegador la lleva a la vista y aparece.

---

## Consecuencias

- Una dependencia nueva (`recharts`). Un gráfico nuevo se arma con `chart.tsx` y los componentes de `src/components/indicadores/`, dentro de una `TarjetaGrafico` con su conclusión y su tabla.
- "En proceso" (derivaciones de la oficina y candidatos de la empresa) es una resta de cantidades del período (derivados menos los resultados, mínimo 0): un resultado del período puede venir de una derivación anterior, así que es una aproximación.
- Las funciones `postulaciones_por_mes()` (047) y `postulaciones_por_periodo()` (061) quedaron sin uso en el código desde la 066; también la columna `tasa_contratacion` de `indicadores_portal`. Se pueden sumar a la limpieza.

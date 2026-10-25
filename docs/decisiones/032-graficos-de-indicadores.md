# 032 — Gráficos de los indicadores

**Fecha:** 2026-10-23
**Estado:** Vigente
**Migración:** 061 (`postulaciones_por_periodo`, punto 6)

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

---

## Consecuencias

- Una dependencia nueva (`recharts`). Un gráfico nuevo se arma con `chart.tsx` y los componentes de `src/components/indicadores/`, dentro de una `TarjetaGrafico` con su conclusión y su tabla.
- "En proceso" (derivaciones de la oficina y candidatos de la empresa) es una resta de cantidades del período (derivados menos los resultados, mínimo 0): un resultado del período puede venir de una derivación anterior, así que es una aproximación.

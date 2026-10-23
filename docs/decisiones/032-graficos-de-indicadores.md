# 032 — Gráficos de los indicadores

**Fecha:** 2026-10-23
**Estado:** Vigente
**Migración:** ninguna

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
- **Área** para una sola serie en el tiempo (postulaciones de los últimos 12 meses).
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

---

## Consecuencias

- Una dependencia nueva (`recharts`). Un gráfico nuevo se arma con `chart.tsx` y los componentes de `src/components/indicadores/`, dentro de una `TarjetaGrafico` con su conclusión y su tabla.
- "En proceso" (derivaciones de la oficina y candidatos de la empresa) es una resta de cantidades del período (derivados menos los resultados, mínimo 0): un resultado del período puede venir de una derivación anterior, así que es una aproximación.

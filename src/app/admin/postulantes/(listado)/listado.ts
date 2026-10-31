import type { NivelPrioridad } from "@/lib/procedencia";

// Filtros y grilla del listado: los usan la página y su esqueleto.

// Filtro ?procedencia=: un valor por nivel. Sin el parámetro, o con uno que no
// está acá, se ven todos.
export const FILTROS_PROCEDENCIA: {
  valor: string;
  nivel: NivelPrioridad;
  etiqueta: string;
  vacio: string;
}[] = [
  {
    valor: "verificado",
    nivel: 1,
    etiqueta: "De Funes, verificados",
    vacio: "No hay postulantes de Funes con el domicilio verificado.",
  },
  {
    valor: "sin-verificar",
    nivel: 2,
    etiqueta: "De Funes, sin verificar",
    vacio: "No hay postulantes de Funes sin verificar.",
  },
  {
    valor: "otra",
    nivel: 3,
    etiqueta: "Otra localidad o sin informar",
    vacio: "No hay postulantes de otra localidad o sin localidad informada.",
  },
];

// Tabla desde 896 px de ancho disponible (la sidebar le quita ancho al
// contenido); más angosto, cada postulante es una tarjeta. Misma técnica que
// el componente Tabla: una sola grilla y, adentro, encabezado, grupos y filas
// con subgrid, para que las columnas midan lo mismo en todas las filas y los
// rótulos queden sobre su columna. No usa Tabla porque las filas van
// agrupadas por nivel con una franja entre grupos.
// Postulante | DNI | Localidad | Rubros | CV | acciones.
export const GRILLA =
  "@4xl:grid @4xl:grid-cols-[minmax(0,1.6fr)_minmax(max-content,.8fr)_minmax(0,1.3fr)_minmax(0,1.7fr)_minmax(max-content,.8fr)_minmax(max-content,.7fr)] @4xl:gap-x-4 @4xl:gap-y-0";
export const SUBGRILLA =
  "@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0";

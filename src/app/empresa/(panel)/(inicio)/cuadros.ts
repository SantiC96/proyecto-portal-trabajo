import type { FiltroOfertas } from "@/lib/empresa/filtro-ofertas";
import type { EstadoOfertaEmpresa } from "@/lib/oferta-estados";

/**
 * Cuadros por estado: cada uno lleva a Mis ofertas con ese filtro y cuenta
 * con el mismo criterio. `accesible`: singular y plural del nombre accesible.
 */
export const CUADROS: {
  filtro: FiltroOfertas;
  estado: EstadoOfertaEmpresa;
  etiqueta: string;
  accesible: [string, string];
}[] = [
  { filtro: "publicada", estado: "activa", etiqueta: "Publicadas", accesible: ["publicada", "publicadas"] },
  {
    filtro: "pendiente",
    estado: "pendiente_aprobacion",
    etiqueta: "En revisión",
    accesible: ["en revisión", "en revisión"],
  },
  { filtro: "rechazada", estado: "rechazada", etiqueta: "Rechazadas", accesible: ["rechazada", "rechazadas"] },
  { filtro: "cerrada", estado: "cerrada", etiqueta: "Cerradas", accesible: ["cerrada", "cerradas"] },
  { filtro: "vencida", estado: "vencida", etiqueta: "Vencidas", accesible: ["vencida", "vencidas"] },
];

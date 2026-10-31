import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { PanelRubros } from "@/components/public/panel-rubros";
import { TarjetaRubro } from "@/components/public/seleccion-filtros-ofertas";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FilaDesplazable } from "@/components/ui/fila-desplazable";
import { obtenerUsuarioActual } from "@/lib/auth";
import {
  contarOfertasVigentesPorRubro,
  type FiltrosOfertasPublicas,
  type ResultadoOfertasPublicas,
} from "@/lib/ofertas";
import { hrefSeccionPerfil, SECCION_PERFIL } from "@/lib/perfil-secciones";
import { obtenerRubrosDelPerfil } from "@/lib/postulante/panel";
import { elegirRubrosDestacados } from "@/lib/rubros-destacados";
import { iconoRubro } from "@/lib/rubros-iconos";

const ID_TITULO = "explorar-rubros-titulo";

type Props = {
  /** Todos los rubros por nombre (tabla categorias), en orden. */
  categorias: string[];
  filtros: FiltrosOfertasPublicas;
  resultado: Promise<ResultadoOfertasPublicas>;
};

/**
 * "Explorá por rubro" de /ofertas: "Todos", seis rubros con ofertas vigentes
 * (primero los del perfil del postulante; ver elegirRubrosDestacados) y "Ver
 * todos", que abre el panel con el resto. Cada tarjeta es un link que agrega
 * o saca su rubro de ?categoria= y conserva los demás filtros; se marca al
 * instante (TarjetaRubro de SeleccionFiltrosOfertas).
 */
export async function ExplorarRubros({ categorias, filtros, resultado }: Props) {
  const usuario = await obtenerUsuarioActual();
  const esPostulante = usuario?.perfil?.rol === "postulante";

  const [conteo, perfil, datos] = await Promise.all([
    contarOfertasVigentesPorRubro(),
    // Sin los rubros del perfil, el orden de siempre (los que tienen más ofertas).
    esPostulante ? obtenerRubrosDelPerfil() : null,
    resultado,
  ]);

  const encabezado = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id={ID_TITULO} className="min-w-0 text-xl text-heading sm:text-[22px]">
        Explorá por rubro
      </h2>
      {esPostulante && (
        <Link
          href={hrefSeccionPerfil(SECCION_PERFIL.rubros)}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
        >
          Editar mis rubros
        </Link>
      )}
    </div>
  );

  if (!conteo.ok) {
    return (
      <section aria-labelledby={ID_TITULO} className="flex flex-col gap-4">
        {encabezado}
        <p role="alert" className="text-[15px] text-danger">
          No pudimos cargar los rubros. Podés seguir buscando por texto o modalidad. Código:{" "}
          <span className="font-mono">{conteo.refError}</span>
        </p>
      </section>
    );
  }

  const destacados = elegirRubrosDestacados(conteo.rubros, perfil?.data ?? null);

  return (
    <section aria-labelledby={ID_TITULO} className="@container flex flex-col gap-4">
      {encabezado}
      <FilaDesplazable
        etiquetaId={ID_TITULO}
        textoAnteriores="Ver rubros anteriores"
        textoSiguientes="Ver más rubros"
        fondo="background"
        className="fila-rubros gap-3"
      >
        <TarjetaRubro valor={null} icono={<LayoutGrid aria-hidden="true" />} nombre="Todos" />
        {destacados.map((rubro) => {
          const Icono = iconoRubro(rubro.nombre);
          return (
            <TarjetaRubro
              key={rubro.id}
              valor={rubro.nombre}
              icono={<Icono aria-hidden="true" />}
              nombre={rubro.nombre}
              detalle={`${rubro.cantidad} ${rubro.cantidad === 1 ? "oferta" : "ofertas"}`}
            />
          );
        })}
        <PanelRubros
          rubros={conteo.rubros}
          catalogo={categorias}
          elegidos={filtros.categorias}
          destacados={destacados.map((r) => r.nombre)}
          totalActual={datos.ok ? datos.total : null}
          hayOtrosFiltros={filtros.q !== "" || filtros.modalidades.length > 0}
        />
      </FilaDesplazable>
    </section>
  );
}

/** Mientras cargan los rubros: el título y ocho tarjetas vacías. */
export function EsqueletoExplorarRubros() {
  return (
    <div className="@container flex flex-col gap-4" aria-busy="true">
      <Esqueleto className="h-6 w-48" />
      <div className="fila-rubros -mx-4 flex gap-3 overflow-hidden px-4 py-1 sm:mx-0 sm:px-0">
        {Array.from({ length: 8 }, (_, i) => (
          <Esqueleto
            key={i}
            className="h-[104px] w-[112px] shrink-0 rounded-2xl @5xl:h-[120px] @5xl:w-auto"
          />
        ))}
      </div>
    </div>
  );
}

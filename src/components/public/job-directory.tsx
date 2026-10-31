import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, UserSearch, X } from "lucide-react";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { BandaOfertas } from "@/components/public/banda-ofertas";
import { EmptyJobResults, type SugerenciaModalidad } from "@/components/public/empty-job-results";
import { EsqueletoExplorarRubros, ExplorarRubros } from "@/components/public/explorar-rubros";
import {
  PastillaModalidad,
  ResultadosPendientes,
  SeleccionFiltrosOfertas,
} from "@/components/public/seleccion-filtros-ofertas";
import { Badge } from "@/components/ui/badge";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio } from "@/components/ui/estado-listado";
import { EsqueletoTarjeta } from "@/components/ui/esqueleto";
import {
  MODALIDADES,
  buscarOfertasPublicas,
  contarOfertasPorModalidad,
  hayFiltrosOfertas,
  type FiltrosOfertasPublicas,
  type ResultadoOfertasPublicas,
} from "@/lib/ofertas";
import { hrefFiltrosOfertas, listaConO } from "@/lib/filtros-ofertas";
import { hrefConParams, type ParamsUrl } from "@/lib/paginacion";
import { esOficinaActiva, obtenerUsuarioActual } from "@/lib/auth";
import { rutaBuscarPostulantes } from "@/lib/invitaciones";
import { obtenerInvitacionesPendientes } from "@/lib/postulante/panel";

const ANCLA = "ofertas";

interface JobDirectoryProps {
  ruta: string;
  searchParams: ParamsUrl;
  categorias: string[];
  filtros: FiltrosOfertasPublicas;
}

/**
 * Listado público de ofertas (/ofertas): banda verde con el buscador,
 * "Explorá por rubro", modalidades, filtros activos, grilla y paginación.
 * Todos los filtros viven en la URL y se aplican en el servidor; rubros y
 * modalidades se marcan al instante (SeleccionFiltrosOfertas).
 */
export function JobDirectory({ ruta, searchParams, categorias, filtros }: JobDirectoryProps) {
  // Una sola consulta compartida por los contadores, el panel de rubros y la grilla.
  const resultado = buscarOfertasPublicas(filtros);
  // La clave cambia con cada búsqueda/página: el Suspense se vuelve a montar y
  // muestra el esqueleto mientras llega el resultado nuevo.
  const clave = JSON.stringify(filtros);

  return (
    <SeleccionFiltrosOfertas
      ruta={ruta}
      searchParams={searchParams}
      catalogo={{ categorias, modalidades: MODALIDADES }}
      seleccion={{ categorias: filtros.categorias, modalidades: filtros.modalidades }}
    >
      <section id={ANCLA} className="flex scroll-mt-20 flex-col gap-8">
        <BandaOfertas
          cantidad={
            <Suspense
              key={clave}
              fallback={<span className="inline-block h-4 w-64 max-w-full rounded bg-white/20" />}
            >
              <ContadorOfertas resultado={resultado} filtros={filtros} />
            </Suspense>
          }
        />

        <Suspense fallback={<EsqueletoExplorarRubros />}>
          <ExplorarRubros
            categorias={categorias}
            filtros={filtros}
            resultado={resultado}
          />
        </Suspense>

        <section aria-labelledby="resultados-titulo" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 id="resultados-titulo" className="text-xl text-heading sm:text-[22px]">
              <Suspense
                key={clave}
                fallback={<span className="inline-block h-6 w-28 rounded bg-secondary-hover align-middle" />}
              >
                <CantidadResultados resultado={resultado} />
              </Suspense>
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span id="filtro-modalidad" className="text-[13px] font-bold text-muted-foreground-strong">
                Modalidad
              </span>
              <div role="group" aria-labelledby="filtro-modalidad" className="flex flex-wrap gap-2">
                <PastillaModalidad valor={null}>Todas</PastillaModalidad>
                {MODALIDADES.map((m) => (
                  <PastillaModalidad key={m} valor={m}>
                    {m}
                  </PastillaModalidad>
                ))}
              </div>
            </div>
          </div>

          <FiltrosActivos ruta={ruta} searchParams={searchParams} filtros={filtros} />

          <ResultadosPendientes>
            <Suspense key={clave} fallback={<EsqueletoResultados />}>
              <ResultadosOfertas
                resultado={resultado}
                ruta={ruta}
                searchParams={searchParams}
                filtros={filtros}
              />
            </Suspense>
          </ResultadosPendientes>
        </section>
      </section>
    </SeleccionFiltrosOfertas>
  );
}

/** Un chip por filtro activo (rubros, modalidades y texto), cada uno con su link para quitarlo. */
function FiltrosActivos({
  ruta,
  searchParams,
  filtros,
}: {
  ruta: string;
  searchParams: ParamsUrl;
  filtros: FiltrosOfertasPublicas;
}) {
  if (!hayFiltrosOfertas(filtros) && filtros.q === "") return null;

  const chips = [
    ...filtros.categorias.map((c) => ({
      clave: `categoria-${c}`,
      texto: c,
      quitar: `Quitar el rubro ${c}`,
      href: hrefFiltrosOfertas(ruta, searchParams, filtros, {
        categoria: filtros.categorias.filter((x) => x !== c),
      }),
    })),
    ...filtros.modalidades.map((m) => ({
      clave: `modalidad-${m}`,
      texto: m,
      quitar: `Quitar la modalidad ${m}`,
      href: hrefFiltrosOfertas(ruta, searchParams, filtros, {
        modalidad: filtros.modalidades.filter((x) => x !== m),
      }),
    })),
    ...(filtros.q !== ""
      ? [
          {
            clave: "q",
            texto: `«${filtros.q}»`,
            quitar: `Quitar la búsqueda «${filtros.q}»`,
            href: hrefFiltrosOfertas(ruta, searchParams, filtros, { q: null }),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="sr-only">Filtros activos</h3>
      <ul className="contents">
        {chips.map((chip) => (
          <li key={chip.clave}>
            <Link
              href={chip.href}
              scroll={false}
              aria-label={chip.quitar}
              className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-[22px] border-[1.5px] border-primary bg-opcion-elegida py-1 pr-3 pl-4 text-[15px] font-semibold text-primary-hover outline-none transition-colors hover:bg-primary/12 focus-visible:shadow-[var(--sombra-foco)]"
            >
              <span className="truncate">{chip.texto}</span>
              <X className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={hrefFiltrosOfertas(ruta, searchParams, filtros, { categoria: null, modalidad: null, q: null })}
        scroll={false}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-2 text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
      >
        Limpiar todo
      </Link>
    </div>
  );
}

/** "de Gastronomía o Salud, en modalidad Remoto, para «mozo»"; vacío sin filtros. */
function describirFiltros(filtros: FiltrosOfertasPublicas): string {
  const partes: string[] = [];
  const { categorias, modalidades, q } = filtros;
  if (categorias.length > 0) {
    partes.push(`de ${categorias.length <= 3 ? listaConO(categorias) : `${categorias.length} rubros`}`);
  }
  if (modalidades.length > 0) partes.push(`en modalidad ${listaConO(modalidades)}`);
  if (q !== "") partes.push(`para «${q}»`);
  return partes.join(", ");
}

async function ContadorOfertas({
  resultado,
  filtros,
}: {
  resultado: Promise<ResultadoOfertasPublicas>;
  filtros: FiltrosOfertasPublicas;
}) {
  const datos = await resultado;
  if (!datos.ok) return null;
  const descripcion = describirFiltros(filtros);
  const sustantivo = datos.total === 1 ? "oferta" : "ofertas";
  return (
    <>
      Mostrando {datos.ofertas.length} de {datos.total}{" "}
      {descripcion ? `${sustantivo} ${descripcion}` : `${sustantivo} ${datos.total === 1 ? "publicada" : "publicadas"}`}
    </>
  );
}

async function CantidadResultados({ resultado }: { resultado: Promise<ResultadoOfertasPublicas> }) {
  const datos = await resultado;
  if (!datos.ok) return <>Ofertas</>;
  return <>{datos.total === 1 ? "1 oferta" : `${datos.total} ofertas`}</>;
}

async function ResultadosOfertas({
  resultado,
  ruta,
  searchParams,
  filtros,
}: {
  resultado: Promise<ResultadoOfertasPublicas>;
  ruta: string;
  searchParams: ParamsUrl;
  filtros: FiltrosOfertasPublicas;
}) {
  const [datos, usuario] = await Promise.all([resultado, obtenerUsuarioActual()]);
  // buscar_ofertas_publicas solo devuelve ofertas activas y vigentes: la
  // oficina puede buscar postulantes para cualquiera de ellas.
  const esOficina = esOficinaActiva(usuario);
  const esPostulante = usuario?.perfil?.rol === "postulante";
  // La búsqueda vuelve a esta misma vista: el listado con sus filtros, o el inicio.
  const volver = ruta === "/" ? "/" : hrefConParams(ruta, searchParams);

  if (!datos.ok) {
    return (
      <EmptyJobResults variant="error" refError={datos.refError} />
    );
  }

  if (datos.ofertas.length === 0) {
    const hayBusqueda = filtros.q !== "";
    const hayFiltros = hayFiltrosOfertas(filtros);

    if (!hayBusqueda && !hayFiltros) {
      return (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-8"
          icono={Briefcase}
          titulo="Todavía no hay ofertas publicadas"
          descripcion="Cuando las empresas de la ciudad publiquen búsquedas, van a aparecer en este espacio."
        />
      );
    }

    // Con modalidades elegidas, ¿hay ofertas de esos rubros (y del texto) en otra?
    let sugerencias: SugerenciaModalidad[] = [];
    if (filtros.modalidades.length > 0) {
      const conteos = await contarOfertasPorModalidad(filtros.q, filtros.categorias);
      sugerencias = conteos
        .filter((c) => !filtros.modalidades.includes(c.modalidad))
        .map((c) => ({
          ...c,
          href: hrefConParams(ruta, searchParams, { modalidad: c.modalidad, pagina: null }, ANCLA),
        }));
    }

    return (
      <EmptyJobResults
        sugerencias={sugerencias}
        variant={
          hayBusqueda && hayFiltros
            ? "busqueda-filtros"
            : hayBusqueda
              ? "busqueda"
              : "filtros"
        }
        ruta={ruta}
        searchParams={searchParams}
        filtros={filtros}
      />
    );
  }

  // Sin las invitaciones las tarjetas se muestran igual, sin la marca.
  const invitaciones = esPostulante ? await obtenerInvitacionesPendientes() : null;
  const invitadas = new Set((invitaciones?.data ?? []).map((i) => i.oferta_id));

  return (
    <div className="@container flex flex-col gap-8">
      <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        {datos.ofertas.map((oferta) => (
          <li key={oferta.id}>
            <TarjetaOferta
              variante="detallada"
              href={`/ofertas/${oferta.id}`}
              titulo={oferta.titulo}
              empresa={oferta.empresa}
              rubros={oferta.categorias}
              modalidad={oferta.modalidad}
              lugar={oferta.ubicacion}
              descripcion={oferta.descripcion}
              jornada={oferta.jornada}
              badges={invitadas.has(oferta.id) && <Badge tono="warning">Te invitaron</Badge>}
              accionExtra={
                esOficina && (
                  <Link
                    href={rutaBuscarPostulantes(oferta.id, { volver })}
                    className="btn-secundario"
                  >
                    <UserSearch aria-hidden="true" />
                    Buscar postulantes
                  </Link>
                )
              }
            />
          </li>
        ))}
      </ul>
      <Paginacion
        ruta={ruta}
        searchParams={searchParams}
        pagina={datos.pagina}
        total={datos.total}
        ancla={ANCLA}
        variante="numeros"
      />
    </div>
  );
}

function EsqueletoResultados() {
  return (
    <div className="@container" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <EsqueletoTarjeta key={i} />
        ))}
      </div>
    </div>
  );
}

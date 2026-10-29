import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, UserSearch } from "lucide-react";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { EmptyJobResults, type SugerenciaModalidad } from "@/components/public/empty-job-results";
import { FiltroRubrosCelular } from "@/components/public/filtro-rubros-celular";
import { Badge } from "@/components/ui/badge";
import { Buscador } from "@/components/ui/buscador";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { GrupoPastillas, PastillaFiltro } from "@/components/ui/pastilla-filtro";
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
import { listaConO } from "@/lib/filtros-ofertas";
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

/** Listado público de ofertas (/ofertas): encabezado, buscador con filtros, grilla y paginación. */
export function JobDirectory({ ruta, searchParams, categorias, filtros }: JobDirectoryProps) {
  // Una sola consulta compartida por el contador del encabezado y la grilla.
  const resultado = buscarOfertasPublicas(filtros);
  // La clave cambia con cada búsqueda/página: el Suspense se vuelve a montar y
  // muestra el esqueleto mientras llega el resultado nuevo.
  const clave = JSON.stringify(filtros);

  const hasActiveFilters = hayFiltrosOfertas(filtros);
  const hrefLimpiar = hrefConParams(
    ruta,
    searchParams,
    { categoria: null, modalidad: null, pagina: null },
    ANCLA,
  );
  // Escribe siempre las dos listas ya validadas: un valor desconocido de la URL
  // no se arrastra al tocar una pastilla.
  const hrefFiltro = (cambios: { categoria?: readonly string[] | null; modalidad?: readonly string[] | null }) =>
    hrefConParams(ruta, searchParams, {
      categoria: filtros.categorias,
      modalidad: filtros.modalidades,
      ...cambios,
      pagina: null,
    });
  // Cada pastilla agrega o saca su valor de la lista; las demás elegidas quedan.
  // La lista se escribe en el orden del catálogo, así la URL es siempre la misma.
  const alternar = <T extends string>(todos: readonly T[], elegidos: readonly T[], valor: T) =>
    todos.filter((v) => (v === valor ? !elegidos.includes(v) : elegidos.includes(v)));

  return (
    <section id={ANCLA} className="flex scroll-mt-20 flex-col gap-6">
      <EncabezadoPagina
        titulo="Ofertas de trabajo"
        bajada={
          <Suspense
            key={clave}
            fallback={<span className="inline-block h-4 w-64 max-w-full rounded bg-secondary-hover" />}
          >
            <ContadorOfertas resultado={resultado} filtros={filtros} />
          </Suspense>
        }
      />

      <div className="tarjeta flex flex-col gap-5 px-4 py-[18px] sm:p-6">
        <Buscador
          placeholder="Buscar por puesto, empresa, palabra clave o conocimiento"
          boton="Buscar"
          inputClassName="min-h-[52px] border-border-campo"
        />

        {/* Celular: desplegable con buscador; desde sm, las pastillas. */}
        <div className="sm:hidden">
          <FiltroRubrosCelular
            ruta={ruta}
            categorias={categorias}
            seleccionadas={filtros.categorias}
          />
        </div>
        <div className="hidden min-w-0 sm:block">
          <GrupoPastillas
            id="filtro-rubro"
            titulo="Rubro"
            unaLinea={{ textoAnteriores: "Ver rubros anteriores", textoSiguientes: "Ver más rubros" }}
          >
            <PastillaFiltro
              href={hrefFiltro({ categoria: null })}
              activa={filtros.categorias.length === 0}
            >
              Todos
            </PastillaFiltro>
            {categorias.map((c) => (
              <PastillaFiltro
                key={c}
                href={hrefFiltro({ categoria: alternar(categorias, filtros.categorias, c) })}
                activa={filtros.categorias.includes(c)}
              >
                {c}
              </PastillaFiltro>
            ))}
          </GrupoPastillas>
        </div>

        <GrupoPastillas id="filtro-modalidad" titulo="Modalidad">
          <PastillaFiltro
            href={hrefFiltro({ modalidad: null })}
            activa={filtros.modalidades.length === 0}
          >
            Todas
          </PastillaFiltro>
          {MODALIDADES.map((m) => (
            <PastillaFiltro
              key={m}
              href={hrefFiltro({ modalidad: alternar(MODALIDADES, filtros.modalidades, m) })}
              activa={filtros.modalidades.includes(m)}
            >
              {m}
            </PastillaFiltro>
          ))}
        </GrupoPastillas>

        {hasActiveFilters && (
          <Link
            href={hrefLimpiar}
            className="inline-flex min-h-11 w-fit items-center rounded-[var(--radius-md)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      <Suspense key={clave} fallback={<EsqueletoResultados />}>
        <ResultadosOfertas
          resultado={resultado}
          ruta={ruta}
          searchParams={searchParams}
          filtros={filtros}
        />
      </Suspense>
    </section>
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
      <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {datos.ofertas.map((oferta) => (
          <li key={oferta.id}>
            <TarjetaOferta
              href={`/ofertas/${oferta.id}`}
              titulo={oferta.titulo}
              empresa={oferta.empresa}
              rubros={oferta.categorias}
              modalidad={oferta.modalidad}
              lugar={oferta.ubicacion}
              jornada={oferta.jornada}
              badges={invitadas.has(oferta.id) && <Badge tono="warning">Te invitaron</Badge>}
              accionExtra={
                esOficina && (
                  <Link
                    href={rutaBuscarPostulantes(oferta.id, { volver })}
                    className="btn-primario"
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
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <EsqueletoTarjeta key={i} />
        ))}
      </div>
    </div>
  );
}

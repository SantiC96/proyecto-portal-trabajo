import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, UserSearch } from "lucide-react";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { EmptyJobResults } from "@/components/public/empty-job-results";
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
  type FiltrosOfertasPublicas,
  type ResultadoOfertasPublicas,
} from "@/lib/ofertas";
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

  const hasActiveFilters =
    filtros.categoria !== null || filtros.modalidad !== null;
  const hrefLimpiar = hrefConParams(
    ruta,
    searchParams,
    { categoria: null, modalidad: null, pagina: null },
    ANCLA,
  );
  const hrefFiltro = (cambios: Record<string, string | null>) =>
    hrefConParams(ruta, searchParams, { ...cambios, pagina: null });

  return (
    <section id={ANCLA} className="flex scroll-mt-20 flex-col gap-6">
      <EncabezadoPagina
        titulo="Ofertas de trabajo"
        bajada={
          <Suspense
            key={clave}
            fallback={<span className="inline-block h-4 w-64 max-w-full rounded bg-secondary-hover" />}
          >
            <ContadorOfertas
              resultado={resultado}
              hayFiltros={filtros.q !== "" || hasActiveFilters}
            />
          </Suspense>
        }
      />

      <div className="tarjeta flex flex-col gap-5 px-4 py-[18px] sm:p-6">
        <Buscador
          placeholder="Buscar por puesto, empresa, palabra clave o conocimiento"
          boton="Buscar"
          inputClassName="min-h-[52px] border-border-campo"
        />

        <GrupoPastillas id="filtro-rubro" titulo="Rubro">
          <PastillaFiltro
            href={hrefFiltro({ categoria: null })}
            activa={filtros.categoria === null}
          >
            Todos
          </PastillaFiltro>
          {categorias.map((c) => (
            <PastillaFiltro
              key={c}
              href={hrefFiltro({ categoria: c })}
              activa={filtros.categoria === c}
            >
              {c}
            </PastillaFiltro>
          ))}
        </GrupoPastillas>

        <GrupoPastillas id="filtro-modalidad" titulo="Modalidad">
          {MODALIDADES.map((m) => {
            const activa = filtros.modalidad === m;
            return (
              // Tocar la modalidad activa la desactiva.
              <PastillaFiltro
                key={m}
                href={hrefFiltro({ modalidad: activa ? null : m })}
                activa={activa}
              >
                {m}
              </PastillaFiltro>
            );
          })}
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

async function ContadorOfertas({
  resultado,
  hayFiltros,
}: {
  resultado: Promise<ResultadoOfertasPublicas>;
  hayFiltros: boolean;
}) {
  const datos = await resultado;
  if (!datos.ok) return null;
  if (hayFiltros) {
    return (
      <>
        {datos.total} {datos.total === 1 ? "oferta" : "ofertas"} con estos filtros
      </>
    );
  }
  return (
    <>
      Mostrando {datos.ofertas.length} de {datos.total}{" "}
      {datos.total === 1 ? "oferta publicada" : "ofertas publicadas"}
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
    const hayFiltros = filtros.categoria !== null || filtros.modalidad !== null;

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

    return (
      <EmptyJobResults
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
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <EsqueletoTarjeta key={i} />
        ))}
      </div>
    </div>
  );
}

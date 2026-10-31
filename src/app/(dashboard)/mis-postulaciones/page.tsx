import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ErrorConsulta,
  type ParamsUrl,
} from "@/lib/paginacion";
import {
  CRITERIO_FILTRO,
  ETIQUETA_FILTRO,
  FILTROS_MIS_POSTULACIONES,
  INDICADOR_FILTRO,
  VACIO_FILTRO,
  leerFiltroMisPostulaciones,
  type FiltroMisPostulaciones,
} from "@/lib/mis-postulaciones";
import type { EstadoDerivacionEmpresa } from "@/lib/derivacion-estados";
import { obtenerIndicadoresPostulante } from "@/lib/postulante/panel";
import { GrupoPastillas, PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import {
  LeyendaEstados,
  MisPostulacionesLista,
  type Postulacion,
} from "./mis-postulaciones-lista";
import type {
  FilaCvDeMiPostulacion,
  FilaOfertaDeMiPostulacion,
  FilaEstadoDerivacionPostulante,
  FilaMiPreEntrevista,
} from "@/types/db";
import { AvisoCursoPendiente } from "@/components/cursos/aviso-curso-pendiente";
import { BotonVolver } from "@/components/ui/boton-volver";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";

export const metadata: Metadata = {
  title: "Mis postulaciones | Portal de Empleo Funes",
};

const RUTA = "/mis-postulaciones";

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Ids de las postulaciones 'derivada' del postulante cuyo resultado de la
 * empresa cumple `condicion`. El postulante no lee derivaciones (RLS): el
 * resultado sale de estado_derivacion_postulante (028), sin fila si todavía
 * no hay derivación.
 */
async function derivadasQueCumplen(
  supabase: ClienteSupabase,
  postulanteId: string,
  condicion: (estadoEmpresa: EstadoDerivacionEmpresa | null) => boolean,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: ErrorConsulta }> {
  const { data, error } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", postulanteId)
    .eq("estado", "derivada");
  if (error) return { ok: false, error };

  const filas = data ?? [];
  const estados = await Promise.all(
    filas.map((f) => supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: f.id })),
  );
  const fallida = estados.find((r) => r.error);
  if (fallida?.error) return { ok: false, error: fallida.error };

  return {
    ok: true,
    ids: filas
      .filter((_, i) => condicion(estados[i].data?.[0]?.estado_empresa ?? null))
      .map((f) => f.id),
  };
}

// LEFT JOIN a ofertas: las ofertas cerradas no son visibles al postulante vía RLS
// (no se puede agregar política porque migration_014 las reserva).
// La UI muestra "Oferta no disponible" cuando oferta es null.
// El filtro va en la consulta, antes del rango: el total y la paginación son
// los de la lista filtrada.
async function consultarMisPostulaciones(
  postulanteId: string,
  pagina: number,
  filtro: FiltroMisPostulaciones | null,
) {
  const supabase = await createSupabaseServerClient();
  const criterio = filtro ? CRITERIO_FILTRO[filtro] : null;

  let idsDerivadas: string[] | null = null;
  if (criterio?.derivadaCon) {
    const derivadas = await derivadasQueCumplen(supabase, postulanteId, criterio.derivadaCon);
    if (!derivadas.ok) return derivadas;
    idsDerivadas = derivadas.ids;
  }

  return consultarPagina(pagina, (desde, hasta) => {
    let consulta = supabase
      .from("postulaciones")
      .select(
        "id, estado, created_at, retirada_en, ofertas(id, titulo, empresa_nombre, estado, vence_en, contenido_editado_en)",
        { count: "exact" }
      )
      .eq("postulante_id", postulanteId);

    if (criterio) {
      const { estados } = criterio;
      if (idsDerivadas === null) {
        consulta = consulta.in("estado", estados);
      } else if (estados.length === 0 || idsDerivadas.length === 0) {
        // Una lista vacía (in.()) no devuelve filas.
        consulta = estados.length === 0
          ? consulta.in("id", idsDerivadas)
          : consulta.in("estado", estados);
      } else {
        consulta = consulta.or(`estado.in.(${estados.join(",")}),id.in.(${idsDerivadas.join(",")})`);
      }
    }

    return consulta
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta);
  });
}

type ResultadoMisPostulaciones = ReturnType<typeof consultarMisPostulaciones>;

export default async function MisPostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const filtro = leerFiltroMisPostulaciones(sp.estado);
  await requerirRolPagina("postulante");
  const postulante = await obtenerPostulanteActual();
  if (!postulante) redirect("/");

  // Una sola consulta para la bajada del encabezado y el listado.
  const resultado = consultarMisPostulaciones(postulante.id, pagina, filtro);
  const clave = `${filtro ?? "todas"}-${pagina}`;

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/panel" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        titulo="Mis postulaciones"
        bajada={
          <Suspense
            key={`${clave}:bajada`}
            fallback={<span className="inline-block h-4 w-72 max-w-full rounded bg-primary-foreground/20" />}
          >
            <BajadaMisPostulaciones resultado={resultado} />
          </Suspense>
        }
        acciones={
          <Link href="/ofertas" className="btn-secundario">
            <Search aria-hidden="true" />
            Buscar ofertas
          </Link>
        }
      />

      <Suspense fallback={null}>
        <AvisoCursoPendiente />
      </Suspense>

      <LeyendaEstados />

      <Suspense fallback={<FiltroEstados filtro={filtro} searchParams={sp} />}>
        <FiltroEstadosConCantidades
          postulanteId={postulante.id}
          filtro={filtro}
          searchParams={sp}
        />
      </Suspense>

      <Suspense key={`${clave}:lista`} fallback={<EsqueletoLista filas={3} />}>
        <ListadoMisPostulaciones
          postulanteId={postulante.id}
          resultado={resultado}
          filtro={filtro}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

type Cantidades = Record<FiltroMisPostulaciones | "todas", number>;

/**
 * Pastillas "Todas" y una por estado. Cambiar de filtro vuelve a la página 1.
 * Sin `cantidades` (mientras cargan o si fallan) van sin número.
 */
function FiltroEstados({
  filtro,
  searchParams,
  cantidades,
}: {
  filtro: FiltroMisPostulaciones | null;
  searchParams: ParamsUrl;
  cantidades?: Cantidades;
}) {
  const opciones: { valor: FiltroMisPostulaciones | null; etiqueta: string; cantidad?: number }[] = [
    { valor: null, etiqueta: "Todas", cantidad: cantidades?.todas },
    ...FILTROS_MIS_POSTULACIONES.map((f) => ({
      valor: f,
      etiqueta: ETIQUETA_FILTRO[f],
      cantidad: cantidades?.[f],
    })),
  ];

  return (
    // En el celular, una fila con scroll horizontal; desde sm bajan de renglón.
    <GrupoPastillas id="filtro-estado" titulo="Estado">
      {opciones.map((o) => {
        const activa = o.valor === filtro;
        return (
          <PastillaFiltro
            key={o.valor ?? "todas"}
            href={hrefConParams(RUTA, searchParams, { estado: o.valor, pagina: null })}
            activa={activa}
            cantidad={o.cantidad}
            className="sm:h-11"
          >
            {o.etiqueta}
          </PastillaFiltro>
        );
      })}
    </GrupoPastillas>
  );
}

/**
 * Las cantidades de cada estado salen de indicadores_postulante(), los mismos
 * números del panel; "Todas", del total de postulaciones.
 */
async function FiltroEstadosConCantidades({
  postulanteId,
  filtro,
  searchParams,
}: {
  postulanteId: string;
  filtro: FiltroMisPostulaciones | null;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const [indicadores, total] = await Promise.all([
    obtenerIndicadoresPostulante(),
    supabase
      .from("postulaciones")
      .select("id", { count: "exact", head: true })
      .eq("postulante_id", postulanteId),
  ]);

  const i = indicadores.data;
  if (!i || total.error || total.count === null) {
    logError("mis_postulaciones_cantidades", indicadores.error ?? total.error);
    return <FiltroEstados filtro={filtro} searchParams={searchParams} />;
  }

  const cantidades = { todas: total.count } as Cantidades;
  for (const f of FILTROS_MIS_POSTULACIONES) cantidades[f] = Number(i[INDICADOR_FILTRO[f]]);

  return <FiltroEstados filtro={filtro} searchParams={searchParams} cantidades={cantidades} />;
}

async function BajadaMisPostulaciones({ resultado }: { resultado: ResultadoMisPostulaciones }) {
  const datos = await resultado;
  if (!datos.ok || datos.total === 0) return <>Seguí el estado de cada postulación que enviaste.</>;
  return (
    <>
      Mostrando {datos.filas.length} de {datos.total}{" "}
      {datos.total === 1 ? "postulación" : "postulaciones"} · de la más reciente a la más antigua
    </>
  );
}

async function ListadoMisPostulaciones({
  postulanteId,
  resultado: consulta,
  filtro,
  searchParams,
}: {
  postulanteId: string;
  resultado: ResultadoMisPostulaciones;
  filtro: FiltroMisPostulaciones | null;
  searchParams: ParamsUrl;
}) {
  const [supabase, resultado] = await Promise.all([createSupabaseServerClient(), consulta]);

  if (!resultado.ok) {
    const ref = logError("mis_postulaciones_listado", resultado.error);
    return (
      <ErrorListado
        mensaje="No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const rawList = resultado.filas;

  if (rawList.length === 0 && filtro) {
    return (
      <EstadoVacio
        tipo="sin-resultados"
        titulo={VACIO_FILTRO[filtro]}
        descripcion="Elegí otro estado para ver el resto de tus postulaciones."
        hrefLimpiar={hrefConParams(RUTA, searchParams, { estado: null, pagina: null })}
        textoLimpiar="Ver todas"
      />
    );
  }

  if (rawList.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={Briefcase}
        titulo="Todavía no te postulaste a ninguna oferta"
        descripcion="Explorá las búsquedas activas y encontrá tu próximo trabajo."
        accion={
          <Link href="/ofertas" className="btn-primario">
            Ver ofertas laborales
          </Link>
        }
      />
    );
  }

  // For derivada postulaciones, get the derivation state (without notes — uses SECURITY DEFINER)
  const derivadasIds = rawList
    .filter((r) => r.estado === "derivada")
    .map((r) => r.id);

  const derivacionEstados: Record<string, FilaEstadoDerivacionPostulante> = {};
  if (derivadasIds.length > 0) {
    const results = await Promise.all(
      derivadasIds.map((pid) =>
        supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: pid })
      )
    );
    derivadasIds.forEach((pid, i) => {
      const row = results[i].data?.[0];
      if (row) derivacionEstados[pid] = row;
    });
  }

  // Pre-entrevista con la oficina de las postulaciones pendientes, sin la
  // nota interna (mis_pre_entrevistas, migration_044).
  const pendientesIds = rawList
    .filter((r) => r.estado === "recibida" || r.estado === "en_revision")
    .map((r) => r.id);

  const preEntrevistas: Record<string, FilaMiPreEntrevista> = {};
  if (pendientesIds.length > 0) {
    const { data, error } = await supabase.rpc("mis_pre_entrevistas", {
      p_postulacion_ids: pendientesIds,
    });
    if (error) logError("mis_pre_entrevistas", error);
    for (const fila of data ?? []) preEntrevistas[fila.postulacion_id] = fila;
  }

  // Título y empresa de las ofertas que RLS ya no deja leer (migration_059).
  // Si falla, esas tarjetas quedan como "Oferta no disponible".
  const sinOferta = rawList.filter((r) => r.ofertas === null).map((r) => r.id);
  const ofertasNoVisibles: Record<string, FilaOfertaDeMiPostulacion> = {};
  if (sinOferta.length > 0) {
    const { data, error } = await supabase.rpc("ofertas_de_mis_postulaciones", {
      p_postulacion_ids: sinOferta,
    });
    if (error) logError("ofertas_de_mis_postulaciones", error);
    for (const fila of data ?? []) ofertasNoVisibles[fila.postulacion_id] = fila;
  }

  // Con qué CV se postuló (migration_054): nombre y fecha aunque después lo
  // haya eliminado de su perfil.
  const cvsPorPostulacion: Record<string, FilaCvDeMiPostulacion> = {};
  {
    const { data, error } = await supabase.rpc("cvs_de_mis_postulaciones", {
      p_postulacion_ids: rawList.map((r) => r.id),
    });
    if (error) logError("cvs_de_mis_postulaciones", error);
    for (const fila of data ?? []) cvsPorPostulacion[fila.postulacion_id] = fila;
  }

  // Postulaciones retiradas (migration_053): se puede volver a postular si la
  // oferta sigue abierta y no hay ya otra postulación vigente a esa oferta
  // (puede estar en otra página del listado).
  const ofertaAbierta = (o: (typeof rawList)[number]["ofertas"]) =>
    o?.estado === "activa" && o.vence_en != null && !estadoVencimiento(o.estado, o.vence_en).vencida;

  const ofertasRetiradasAbiertas = [
    ...new Set(
      rawList
        .filter((r) => r.retirada_en != null && ofertaAbierta(r.ofertas))
        .map((r) => r.ofertas!.id)
    ),
  ];

  const ofertasConVigente = new Set<string>();
  if (ofertasRetiradasAbiertas.length > 0) {
    const { data, error } = await supabase
      .from("postulaciones")
      .select("oferta_id")
      .eq("postulante_id", postulanteId)
      .is("retirada_en", null)
      .in("oferta_id", ofertasRetiradasAbiertas);
    if (error) logError("mis_postulaciones_vigentes", error);
    for (const fila of data ?? []) ofertasConVigente.add(fila.oferta_id);
  }

  const postulaciones: Postulacion[] = rawList.map((r) => ({
    id: r.id,
    estado: r.estado,
    created_at: r.created_at,
    retirada_en: r.retirada_en,
    oferta: r.ofertas,
    ofertaNoVisible: ofertasNoVisibles[r.id] ?? null,
    derivacion: derivacionEstados[r.id] ?? null,
    preEntrevista: preEntrevistas[r.id] ?? null,
    cv: cvsPorPostulacion[r.id] ?? null,
    puedeVolverAPostularse:
      r.retirada_en != null &&
      ofertaAbierta(r.ofertas) &&
      !ofertasConVigente.has(r.ofertas!.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <MisPostulacionesLista postulaciones={postulaciones} />
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        variante="numeros"
      />
    </div>
  );
}

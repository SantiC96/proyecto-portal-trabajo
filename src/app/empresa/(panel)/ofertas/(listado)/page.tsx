import type { Metadata } from "next";
import { COLUMNAS, COLUMNAS_ELIMINADAS } from "./columnas";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Briefcase, Calendar, Pencil, Trash2 } from "lucide-react";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { GrupoPastillas, PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { LineaBanda } from "@/components/ui/esqueleto";
import { EsqueletoMisOfertas } from "./esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { Aviso } from "@/components/ui/aviso";
import { Badge } from "@/components/ui/badge";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { bajasDeOfertas } from "@/lib/empresa/bajas-oferta";
import {
  ACENTO_ESTADO_OFERTA,
  ETIQUETA_FILTRO_OFERTAS,
  FILTROS_OFERTAS,
  VACIO_FILTRO_OFERTAS,
  aplicarFiltroOfertas,
  leerFiltroOfertas,
  type FiltroOfertas,
} from "@/lib/empresa/filtro-ofertas";
import { logError } from "@/lib/logger";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { BajaOfertaBtn } from "../_components/baja-oferta-btn";
import { RestaurarOfertaBtn } from "../_components/restaurar-oferta-btn";
import { RenovarOfertaBtn } from "../_components/renovar-oferta-btn";
import { estadoVencimiento, textoDiasRestantes } from "@/lib/ofertas-vencimiento";
import { dentroDeDiasISO, formatFecha } from "@/lib/fechas";
import {
  diasParaRestaurar,
  DIAS_RESTAURACION_OFERTA,
  ESTADO_OFERTA_EMPRESA_LABEL,
  ESTADO_OFERTA_EMPRESA_TONO,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { BotonVolver } from "@/components/ui/boton-volver";
import {
  CLASE_ACCION_FILA,
  CeldaTabla,
  FilaTabla,
  Tabla,
} from "@/components/ui/tabla";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mis ofertas | Portal de Empleo Funes",
};

const RUTA = "/empresa/ofertas";


/** Rubros que se ven en la fila; el resto va en "+N". */
const RUBROS_VISIBLES = 2;

const CLASE_TITULO =
  "rounded-[var(--radius-sm)] text-base leading-snug font-extrabold break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]";

const CLASE_TITULO_ELIMINADA = "text-[15px] leading-snug font-bold break-words text-heading";

/**
 * Acciones de la fila: en la tarjeta, dos por fila (la última sola a todo el
 * ancho si son impares); en la tabla, en línea y a la derecha.
 */
const CLASE_ACCIONES =
  "grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2 @4xl:flex @4xl:flex-wrap @4xl:items-center @4xl:justify-end";

/** Acción de la fila: la de la tabla, con menos padding en la tarjeta para que entren dos. */
const CLASE_ACCION = cn(CLASE_ACCION_FILA, "px-2.5!");

const SELECT_OFERTAS =
  "id, titulo, estado, motivo_rechazo, created_at, publicado_en, vence_en, duracion_dias, eliminada_en, oferta_categorias(categorias(nombre))";

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type Consulta = {
  empresaId: string;
  q: string;
  pagina: number;
  eliminadas: boolean;
  filtro: FiltroOfertas | null;
  ahora: string;
};

/**
 * Página de Mis ofertas. El filtro por estado y la búsqueda van en la
 * consulta, antes del rango: el total y la paginación son los de la lista
 * filtrada.
 */
async function consultarMisOfertas(supabase: ClienteSupabase, c: Consulta) {
  return consultarPagina(c.pagina, (desde, hasta) => {
    let query = supabase
      .from("ofertas")
      .select(SELECT_OFERTAS, { count: "exact" })
      .eq("empresa_id", c.empresaId);
    // Borrado lógico (migration_051): las eliminadas solo se ven en su vista.
    query = c.eliminadas ? query.not("eliminada_en", "is", null) : query.is("eliminada_en", null);
    if (c.filtro) query = aplicarFiltroOfertas(query, c.filtro, c.ahora);
    if (c.q) query = query.ilike("titulo", patronIlike(c.q));
    return query
      .order(c.eliminadas ? "eliminada_en" : "created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta);
  });
}

type ResultadoMisOfertas = ReturnType<typeof consultarMisOfertas>;

export default async function MisOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; vista?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);
  const eliminadas = sp.vista === "eliminadas";
  // Un ?estado= no válido muestra todas; en Eliminadas no se filtra por estado.
  const filtro = eliminadas ? null : leerFiltroOfertas(sp.estado);
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();
  const ahora = dentroDeDiasISO(0);

  // Una sola consulta para la bajada del encabezado y la lista.
  const resultado = consultarMisOfertas(supabase, {
    empresaId: empresa.id,
    q,
    pagina,
    eliminadas,
    filtro,
    ahora,
  });
  const clave = JSON.stringify({ q, pagina, eliminadas, filtro });

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/empresa" destacado />
      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo="Mis ofertas"
        bajada={
          <Suspense
            key={`${clave}:bajada`}
            fallback={<LineaBanda className="w-[30em]" />}
          >
            <BajadaMisOfertas resultado={resultado} eliminadas={eliminadas} />
          </Suspense>
        }
        acciones={
          <Link href="/empresa/ofertas/nueva" className="btn-primario">
            <Plus aria-hidden="true" />
            Publicar oferta
          </Link>
        }
      />

      <Suspense>
        <AvisoUrl />
      </Suspense>

      <div className="@container">
        <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-6">
          <Suspense
            key={`${q}:filtro`}
            fallback={<FiltroEstados filtro={filtro} eliminadas={eliminadas} searchParams={sp} />}
          >
            <FiltroEstadosConCantidades
              supabase={supabase}
              empresaId={empresa.id}
              q={q}
              ahora={ahora}
              filtro={filtro}
              eliminadas={eliminadas}
              searchParams={sp}
            />
          </Suspense>
          <Buscador className="w-full @5xl:w-80 @5xl:shrink-0" placeholder="Buscar por título…" />
        </div>
      </div>

      <Suspense key={`${clave}:lista`} fallback={<EsqueletoMisOfertas />}>
        <ListadoMisOfertas
          supabase={supabase}
          resultado={resultado}
          q={q}
          filtro={filtro}
          eliminadas={eliminadas}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

async function BajadaMisOfertas({
  resultado,
  eliminadas,
}: {
  resultado: ResultadoMisOfertas;
  eliminadas: boolean;
}) {
  const datos = await resultado;
  if (!datos.ok || datos.total === 0) return <>Gestioná las ofertas laborales de tu empresa.</>;
  return (
    <>
      {datos.total} {datos.total === 1 ? "oferta" : "ofertas"}
      {eliminadas && (datos.total === 1 ? " eliminada" : " eliminadas")} · de la más reciente a la
      más antigua
    </>
  );
}

type Cantidades = Record<FiltroOfertas | "todas", number>;

/**
 * Pastillas "Todas" y una por estado y, separada por una línea, "Eliminadas"
 * (sin cantidad). Cambiar de filtro conserva la búsqueda y vuelve a la
 * página 1. Sin `cantidades` (mientras cargan o si fallan) van sin número.
 */
function FiltroEstados({
  filtro,
  eliminadas,
  searchParams,
  cantidades,
}: {
  filtro: FiltroOfertas | null;
  eliminadas: boolean;
  searchParams: ParamsUrl;
  cantidades?: Cantidades;
}) {
  const opciones: { valor: FiltroOfertas | null; etiqueta: string; cantidad?: number }[] = [
    { valor: null, etiqueta: "Todas", cantidad: cantidades?.todas },
    ...FILTROS_OFERTAS.map((f) => ({
      valor: f,
      etiqueta: ETIQUETA_FILTRO_OFERTAS[f],
      cantidad: cantidades?.[f],
    })),
  ];

  return (
    <GrupoPastillas id="filtro-estado" titulo="Estado" className="@5xl:flex-1">
      {opciones.map((o) => (
        <PastillaFiltro
          key={o.valor ?? "todas"}
          href={hrefConParams(RUTA, searchParams, { estado: o.valor, vista: null, pagina: null })}
          activa={!eliminadas && o.valor === filtro}
          cantidad={o.cantidad}
          className="sm:h-11"
        >
          {o.etiqueta}
        </PastillaFiltro>
      ))}
      <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-separador-filtro" />
      <PastillaFiltro
        href={hrefConParams(RUTA, searchParams, { vista: "eliminadas", estado: null, pagina: null })}
        activa={eliminadas}
        className="sm:h-11"
      >
        Eliminadas
      </PastillaFiltro>
    </GrupoPastillas>
  );
}

/** Cantidades de cada estado con la búsqueda actual, con los criterios de la lista. */
async function FiltroEstadosConCantidades({
  supabase,
  empresaId,
  q,
  ahora,
  ...props
}: {
  supabase: ClienteSupabase;
  empresaId: string;
  q: string;
  ahora: string;
  filtro: FiltroOfertas | null;
  eliminadas: boolean;
  searchParams: ParamsUrl;
}) {
  const contar = () => {
    const query = supabase
      .from("ofertas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .is("eliminada_en", null);
    return q ? query.ilike("titulo", patronIlike(q)) : query;
  };
  const [todas, ...porEstado] = await Promise.all([
    contar(),
    ...FILTROS_OFERTAS.map((f) => aplicarFiltroOfertas(contar(), f, ahora)),
  ]);

  const fallida = [todas, ...porEstado].find((r) => r.error || r.count === null);
  if (fallida) {
    logError("empresa_ofertas_cantidades", fallida.error);
    return <FiltroEstados {...props} />;
  }

  const cantidades = { todas: todas.count ?? 0 } as Cantidades;
  FILTROS_OFERTAS.forEach((f, i) => (cantidades[f] = porEstado[i].count ?? 0));
  return <FiltroEstados {...props} cantidades={cantidades} />;
}

/** "Publicada el …" o "Creada el …", según el estado y las fechas que guarda la base. */
function fechaDeOferta(oferta: { estado: string; created_at: string; publicado_en: string | null }) {
  if (oferta.estado !== "borrador" && oferta.publicado_en) {
    return `Publicada el ${formatFecha(oferta.publicado_en)}`;
  }
  return `Creada el ${formatFecha(oferta.created_at)}`;
}

async function ListadoMisOfertas({
  supabase,
  resultado: consulta,
  q,
  filtro,
  eliminadas,
  searchParams,
}: {
  supabase: ClienteSupabase;
  resultado: ResultadoMisOfertas;
  q: string;
  filtro: FiltroOfertas | null;
  eliminadas: boolean;
  searchParams: ParamsUrl;
}) {
  const resultado = await consulta;

  if (!resultado.ok) {
    const ref = logError("empresa_ofertas_listado", resultado.error);
    return <ErrorListado refError={ref} />;
  }

  const lista = resultado.filas;

  if (lista.length === 0) {
    if (q) {
      return (
        <EstadoVacio
          tipo="sin-resultados"
          titulo="No encontramos ofertas con ese título"
          hrefLimpiar={hrefConParams(RUTA, searchParams, { q: null, pagina: null })}
          textoLimpiar="Limpiar búsqueda"
        />
      );
    }
    if (eliminadas) {
      return (
        <EstadoVacio
          tipo="sin-registros"
          icono={Trash2}
          titulo="No tenés ofertas eliminadas."
          descripcion={`Las ofertas que elimines quedan acá y podés restaurarlas durante ${DIAS_RESTAURACION_OFERTA} días.`}
        />
      );
    }
    if (filtro) {
      return (
        <EstadoVacio
          tipo="sin-registros"
          icono={Briefcase}
          titulo={VACIO_FILTRO_OFERTAS[filtro]}
          descripcion="Elegí otro estado o mirá todas tus ofertas."
          accion={
            <Link
              href={hrefConParams(RUTA, searchParams, { estado: null, pagina: null })}
              className="btn-secundario"
            >
              Ver todas
            </Link>
          }
        />
      );
    }
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={Briefcase}
        titulo="Todavía no publicaste ofertas"
        descripcion="Publicá tu primera oferta para recibir postulaciones."
        accion={
          <Link
            href="/empresa/ofertas/nueva"
            className="btn-primario inline-flex h-11 items-center gap-2 px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            Publicar oferta
          </Link>
        }
      />
    );
  }

  const paginacion = (
    <Paginacion
      ruta={RUTA}
      searchParams={searchParams}
      pagina={resultado.pagina}
      total={resultado.total}
    />
  );

  if (eliminadas) {
    return (
      <div className="flex flex-col gap-6">
        <Tabla
          columnas={COLUMNAS_ELIMINADAS}
          etiqueta="Ofertas eliminadas"
          encabezados={["Oferta", "Eliminada", ""]}
        >
          {lista.map((oferta) => {
            const dias = diasParaRestaurar(oferta.eliminada_en!);
            const estadoLabel = ESTADO_OFERTA_EMPRESA_LABEL[oferta.estado] ?? oferta.estado;
            return (
              <FilaTabla key={oferta.id}>
                <div className="flex min-w-0 flex-col items-start gap-1.5">
                  <span className={CLASE_TITULO_ELIMINADA}>{oferta.titulo}</span>
                  <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[oferta.estado] ?? "neutral"} estado>
                    {estadoLabel}
                  </Badge>
                </div>
                <CeldaTabla etiqueta="Eliminada" className="text-sm text-muted-foreground">
                  Eliminada el {formatFecha(oferta.eliminada_en!)} ·{" "}
                  {dias > 0
                    ? `${dias === 1 ? "queda 1 día" : `quedan ${dias} días`} para restaurarla`
                    : "ya no se puede restaurar"}
                </CeldaTabla>
                {dias > 0 ? (
                  <RestaurarOfertaBtn
                    ofertaId={oferta.id}
                    ofertaTitulo={oferta.titulo}
                    estadoLabel={estadoLabel}
                    claseBoton={CLASE_ACCION_FILA}
                  />
                ) : (
                  <span className="hidden @4xl:block" aria-hidden="true" />
                )}
              </FilaTabla>
            );
          })}
        </Tabla>
        {paginacion}
      </div>
    );
  }

  const bajas = await bajasDeOfertas(lista);

  // Ofertas con candidatos "Por contactar" (estado_empresa = 'pendiente')
  // Usamos la función SECURITY DEFINER para no requerir acceso a postulaciones.
  const ofertasConPendientesSet = new Set<string>();
  const { data: pendientesRows } = await supabase
    .rpc("ofertas_con_candidatos_pendientes")
    .in(
      "oferta_id",
      lista.map((o) => o.id)
    );
  if (pendientesRows) {
    for (const row of pendientesRows) {
      ofertasConPendientesSet.add(row.oferta_id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabla
        columnas={COLUMNAS}
        etiqueta="Mis ofertas"
        semantica="tabla"
        encabezados={["Oferta", "Estado", "Rubros", "Vence", <span key="a" className="sr-only">Acciones</span>]}
      >
        {lista.map((oferta) => {
          const categorias = oferta.oferta_categorias
            .map((oc) => oc.categorias?.nombre)
            .filter((n): n is string => Boolean(n));
          const baja = bajas[oferta.id];
          const { mostrarContinuar, mostrarEditar, mostrarCandidatosPorContactar } = baja.acciones;

          const tienePendientes = mostrarCandidatosPorContactar && ofertasConPendientesSet.has(oferta.id);
          const { vencida, porVencer, diasRestantes } = estadoVencimiento(oferta.estado, oferta.vence_en);
          const estadoVisible: EstadoOfertaEmpresa = vencida ? "vencida" : oferta.estado;
          const visibles = categorias.slice(0, RUBROS_VISIBLES);
          const otros = categorias.slice(RUBROS_VISIBLES);
          const conVencimiento = oferta.estado === "activa" && oferta.vence_en !== null;
          // Un borrador se completa en el formulario: el detalle lo redirige ahí.
          const href = `/empresa/ofertas/${oferta.id}`;
          const hayAcciones =
            oferta.estado === "activa" ||
            mostrarContinuar ||
            mostrarEditar ||
            baja.acciones.mostrarEliminar ||
            baja.acciones.mostrarRetirar;

          return (
            <FilaTabla
              key={oferta.id}
              semantica="tabla"
              filete={ACENTO_ESTADO_OFERTA[estadoVisible].filete}
              detalle={
                oferta.estado === "rechazada" &&
                oferta.motivo_rechazo && (
                  <Aviso tono="danger" className="w-full">
                    <span className="font-semibold">Motivo del rechazo:</span>{" "}
                    {oferta.motivo_rechazo}
                  </Aviso>
                )
              }
            >
              <div role="cell" className="flex min-w-0 flex-col items-start gap-1">
                <Link href={href} className={CLASE_TITULO}>
                  {oferta.titulo}
                </Link>
                <p className="text-[13px] text-muted-foreground">{fechaDeOferta(oferta)}</p>
              </div>

              {/* En la tarjeta, el estado va arriba de todo. */}
              <div role="cell" className="order-first flex min-w-0 flex-wrap gap-1.5 @4xl:order-none">
                <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[estadoVisible] ?? "neutral"} estado>
                  {ESTADO_OFERTA_EMPRESA_LABEL[estadoVisible] ?? estadoVisible}
                </Badge>
                {tienePendientes && (
                  <Badge tono="warning" estado>
                    Candidatos por contactar
                  </Badge>
                )}
              </div>

              <div role="cell" className={cn("min-w-0", categorias.length === 0 && "hidden @4xl:block")}>
                {categorias.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {visibles.map((cat) => (
                      <li key={cat} className="max-w-full">
                        <EtiquetaRubro verde>{cat}</EtiquetaRubro>
                      </li>
                    ))}
                    {otros.length > 0 && (
                      <li>
                        <EtiquetaRubro verde title={otros.join(", ")}>
                          <span aria-hidden="true">+{otros.length}</span>
                          <span className="sr-only">{otros.join(", ")}</span>
                        </EtiquetaRubro>
                      </li>
                    )}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              <div role="cell" className={cn("min-w-0", !conVencimiento && "hidden @4xl:block")}>
                {conVencimiento ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground-strong tabular-nums @4xl:text-[15px] @4xl:text-foreground">
                      <Calendar className="size-4 shrink-0 text-muted-icon @4xl:hidden" aria-hidden="true" />
                      <span className="@4xl:hidden">Vence:</span>
                      {formatFecha(oferta.vence_en!)}
                    </span>
                    {porVencer && diasRestantes !== null && (
                      <span className="block text-[13px] font-semibold text-warning-text">
                        {textoDiasRestantes(diasRestantes)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              <div role="cell" className={CLASE_ACCIONES}>
                {!hayAcciones && (
                  <span className="text-sm text-muted-foreground @4xl:text-right">Sin acciones</span>
                )}
                {oferta.estado === "activa" && (
                  <Link href={href} className={`btn-secundario ${CLASE_ACCION}`}>
                    Ver candidatos
                    <span className="sr-only">: {oferta.titulo}</span>
                  </Link>
                )}
                {vencida && (
                  <RenovarOfertaBtn
                    ofertaId={oferta.id}
                    ofertaTitulo={oferta.titulo}
                    duracionDias={oferta.duracion_dias}
                    claseBoton={CLASE_ACCION}
                  />
                )}
                {mostrarContinuar && (
                  <Link
                    href={`/empresa/ofertas/${oferta.id}/editar`}
                    className={`btn-primario ${CLASE_ACCION}`}
                  >
                    Continuar
                    <span className="sr-only">: {oferta.titulo}</span>
                  </Link>
                )}
                {mostrarEditar && (
                  <Link
                    href={`/empresa/ofertas/${oferta.id}/editar`}
                    aria-label={`Editar: ${oferta.titulo}`}
                    className={`btn-neutro ${CLASE_ACCION}`}
                  >
                    <Pencil aria-hidden="true" />
                    Editar
                  </Link>
                )}
                <BajaOfertaBtn
                  oferta={oferta}
                  baja={baja}
                  estiloBoton="peligroBorde"
                  claseBoton={CLASE_ACCION}
                />
              </div>
            </FilaTabla>
          );
        })}
      </Tabla>
      {paginacion}
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { logError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  TAMANO_PAGINA,
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { FiltrosPostulantes } from "./filtros-postulantes";
import { AsignarCursoDialog } from "./asignar-curso-dialog";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import {
  aEstadoCursos,
  textoCursosPendientes,
  textoRechazos,
  type EstadoCursosPostulante,
} from "@/lib/cursos";
import type { Tabla } from "@/types/db";
import { requerirRolPagina } from "@/lib/auth";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { estadosDeComprobantes } from "@/lib/comprobantes";
import { inicialesDePersona } from "@/lib/iniciales";
import { nivelDe, type EstadoComprobante, type NivelPrioridad } from "@/lib/procedencia";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Postulantes | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/postulantes";
const NIVELES: NivelPrioridad[] = [1, 2, 3];

// La lista se ordena por nivel de prioridad (decisión 027): cada grupo de la
// página lleva este separador arriba de su primera fila.
const NIVEL: Record<NivelPrioridad, { titulo: string; tono: TonoBadge }> = {
  1: { titulo: "De Funes, domicilio verificado", tono: "success" },
  2: { titulo: "De Funes, sin verificar", tono: "warning" },
  3: { titulo: "Otra localidad o sin informar", tono: "neutral" },
};

// Filtro ?procedencia=: un valor por nivel. Sin el parámetro, o con uno que no
// está acá, se ven todos.
const FILTROS_PROCEDENCIA: {
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

function leerProcedencia(valor: string | undefined): NivelPrioridad | null {
  return FILTROS_PROCEDENCIA.find((f) => f.valor === valor)?.nivel ?? null;
}

// Tabla desde 896 px de ancho disponible (la sidebar le quita ancho al
// contenido); más angosto, cada postulante es una tarjeta. Misma técnica que
// el componente Tabla: una sola grilla y, adentro, encabezado, grupos y filas
// con subgrid, para que la columna `auto` de las acciones mida lo mismo en
// todas las filas y los rótulos queden sobre su columna. No usa Tabla porque
// las filas van agrupadas por nivel con un separador entre grupos.
const GRILLA =
  "@4xl:grid @4xl:grid-cols-[minmax(0,2.2fr)_7rem_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_auto] @4xl:gap-x-4 @4xl:gap-y-0";
const SUBGRILLA =
  "@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:gap-x-4 @4xl:gap-y-0";

type FiltrosListado = {
  q: string;
  rubroIds: string[];
  /** Nivel elegido en ?procedencia=; null = todos. */
  nivel: NivelPrioridad | null;
  pagina: number;
};

type FilaPostulante = {
  id: string;
  nombre: string;
  iniciales: string | undefined;
  telefono: string | null;
  dni: string | null;
  localidad: string | null;
  nivel: NivelPrioridad;
  avatar: { url: string | null; ajuste: { x: number; y: number; zoom: number } } | undefined;
  rubros: string[];
  tieneCv: boolean;
  comprobante: EstadoComprobante | null;
  cursos: EstadoCursosPostulante | undefined;
  cursosPendientesIds: string[];
};

/**
 * Total de cada nivel con la búsqueda y los rubros, sin la procedencia elegida;
 * null si el conteo falló.
 */
type TotalesNivel = Record<NivelPrioridad, number | null>;

type DatosListado =
  | { tipo: "error"; refError: string }
  | {
      tipo: "vacio";
      hayFiltros: boolean;
      nivel: NivelPrioridad | null;
      totalesNivel: TotalesNivel;
    }
  | {
      tipo: "ok";
      filas: FilaPostulante[];
      total: number;
      pagina: number;
      totalesNivel: TotalesNivel;
      cursosActivos: Pick<Tabla<"cursos">, "id" | "nombre" | "descripcion">[];
    };

export default async function PostulantesPage({
  searchParams,
}: {
  // con_cv, nivel, comprobante, esperando_curso y curso_pendiente eran filtros
  // que ya no existen: si llegan de un link viejo se ignoran. El filtro por
  // nivel de prioridad ahora es procedencia (verificado, sin-verificar, otra).
  searchParams: Promise<{
    q?: string;
    rubros?: string;
    procedencia?: string;
    pagina?: string;
  }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;

  const filtros: FiltrosListado = {
    q: limpiarBusqueda(sp.q),
    rubroIds: sp.rubros
      ? sp.rubros
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    nivel: leerProcedencia(sp.procedencia),
    pagina: leerPagina(sp.pagina),
  };

  const supabase = await createSupabaseServerClient();

  // Categorías para el MultiCombobox
  const categoriasRes = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");
  const opciones = categoriasRes.data ?? [];

  // Una sola carga compartida por el contador de los filtros y la lista. La
  // clave cambia con cada búsqueda o página: los Suspense se vuelven a montar
  // y muestran el esqueleto mientras llega el resultado nuevo.
  const datos = cargarListado(filtros);
  const clave = JSON.stringify(filtros);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Postulantes"
        bajada="Ordenados por prioridad: primero los vecinos de Funes con domicilio verificado."
      />

      <Suspense
        key={`${clave}:pestanas`}
        fallback={<FiltroProcedencia nivel={filtros.nivel} searchParams={sp} />}
      >
        <FiltroProcedenciaConCantidades datos={datos} nivel={filtros.nivel} searchParams={sp} />
      </Suspense>

      <FiltrosPostulantes
        opciones={opciones}
        rubros={filtros.rubroIds}
        hayBusqueda={filtros.q.length > 0}
        hayProcedencia={filtros.nivel !== null}
        contador={
          <Suspense key={`${clave}:contador`} fallback={<Esqueleto className="h-4 w-48" />}>
            <ContadorPostulantes datos={datos} />
          </Suspense>
        }
      />

      <Suspense key={`${clave}:lista`} fallback={<EsqueletoListado />}>
        <ListadoPostulantes datos={datos} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function cargarListado(filtros: FiltrosListado): Promise<DatosListado> {
  const { q, rubroIds, nivel, pagina } = filtros;
  const hayFiltros = rubroIds.length > 0 || q.length > 0;

  const supabase = await createSupabaseServerClient();

  const rubroPreResult =
    rubroIds.length > 0
      ? await supabase
          .from("postulante_categorias")
          .select("postulante_id")
          .in("categoria_id", rubroIds)
      : { data: null };

  const rubroPrefilterId: string[] | undefined =
    rubroIds.length > 0
      ? [
          ...new Set(
            (rubroPreResult.data ?? []).map((r) => r.postulante_id)
          ),
        ]
      : undefined;

  // Pre-filtro: búsqueda de texto
  let textFilterIds: string[] | undefined;
  if (q) {
    const patron = patronIlike(q);

    const [usersRes, dniRes] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id")
        .or(`nombre.ilike.${patron},apellido.ilike.${patron}`),
      supabase.from("postulantes").select("id").ilike("dni", patron),
    ]);

    const errorTexto = usersRes.error ?? dniRes.error;
    if (errorTexto) {
      return { tipo: "error", refError: logError("admin_postulantes_busqueda", errorTexto) };
    }

    const usuarioIds = (usersRes.data ?? []).map((r) => r.id);
    const idsByDni = (dniRes.data ?? []).map((r) => r.id);

    let idsByName: string[] = [];
    if (usuarioIds.length > 0) {
      const { data: byName } = await supabase
        .from("postulantes")
        .select("id")
        .in("usuario_id", usuarioIds);
      idsByName = (byName ?? []).map((r) => r.id);
    }

    textFilterIds = [...new Set([...idsByName, ...idsByDni])];
  }

  // Short-circuit si algún filtro no tiene resultados
  const emptyFilter =
    (rubroPrefilterId !== undefined && rubroPrefilterId.length === 0) ||
    (textFilterIds !== undefined && textFilterIds.length === 0);

  if (emptyFilter) {
    return { tipo: "vacio", hayFiltros, nivel, totalesNivel: { 1: 0, 2: 0, 3: 0 } };
  }

  // Totales por nivel para los separadores y las pestañas de procedencia: un
  // conteo por nivel (head: true, sin traer filas) con la búsqueda y los
  // rubros de la lista, pero no la procedencia, para que cada pestaña diga
  // cuántos hay en su nivel.
  const contarNivel = async (nivel: NivelPrioridad): Promise<number | null> => {
    let query = supabase
      .from("postulantes")
      .select("id", { count: "exact", head: true })
      .eq("nivel_prioridad", nivel);
    if (rubroPrefilterId !== undefined) query = query.in("id", rubroPrefilterId);
    if (textFilterIds !== undefined) query = query.in("id", textFilterIds);
    const { count, error } = await query;
    if (error) {
      logError("admin_postulantes_total_nivel", error);
      return null;
    }
    return count ?? 0;
  };

  const [resultado, cursosRes, ...conteos] = await Promise.all([
    consultarPagina(pagina, (desde, hasta) => {
      let query = supabase
        .from("postulantes")
        .select(
          "id, usuario_id, dni, created_at, localidad, nivel_prioridad, usuarios!usuario_id(nombre, apellido, telefono)",
          { count: "exact" }
        );

      if (rubroPrefilterId !== undefined)
        query = query.in("id", rubroPrefilterId);
      if (textFilterIds !== undefined) query = query.in("id", textFilterIds);
      if (nivel !== null) query = query.eq("nivel_prioridad", nivel);

      // Mismo orden que postulantes_nivel_prioridad_idx (migration_055).
      return query
        .order("nivel_prioridad", { ascending: true })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(desde, hasta);
    }),
    // Cursos activos para el dialog de asignación
    supabase
      .from("cursos")
      .select("id, nombre, descripcion")
      .eq("activo", true)
      .order("nombre"),
    ...NIVELES.map(contarNivel),
  ]);

  if (!resultado.ok) {
    return { tipo: "error", refError: logError("admin_postulantes_listado", resultado.error) };
  }

  const totalesNivel: TotalesNivel = { 1: conteos[0], 2: conteos[1], 3: conteos[2] };
  const postulantes = resultado.filas;
  if (postulantes.length === 0) return { tipo: "vacio", hayFiltros, nivel, totalesNivel };

  const postulanteIds = postulantes.map((p) => p.id);
  const usuarioIds = postulantes.map((p) => p.usuario_id);

  const [
    avatarRes,
    catRes,
    cvStatusRes,
    estadoCursosRes,
    cursosPendientesRes,
    comprobantes,
  ] = await Promise.all([
    supabase
      .from("archivos_usuario")
      .select("usuario_id, ruta, ajuste_x, ajuste_y, ajuste_zoom")
      .in("usuario_id", usuarioIds)
      .eq("tipo", "avatar")
      .eq("activo", true),
    supabase
      .from("postulante_categorias")
      .select("postulante_id, categorias!categoria_id(id, nombre)")
      .in("postulante_id", postulanteIds),
    supabase
      .from("archivos_usuario")
      .select("usuario_id")
      .in("usuario_id", usuarioIds)
      .eq("tipo", "cv")
      .is("eliminado_en", null),
    supabase.rpc("estado_cursos_postulantes", {
      p_postulante_ids: postulanteIds,
    }),
    supabase
      .from("asignaciones_curso")
      .select("postulante_id, curso_id")
      .in("postulante_id", postulanteIds)
      .in("estado", ["asignado", "en_curso"]),
    estadosDeComprobantes(supabase, usuarioIds),
  ]);

  const avatarRows = avatarRes.data ?? [];
  const avatarPaths = avatarRows.map((r) => r.ruta).filter(Boolean);
  let signedUrls: { path: string | null; signedUrl: string | null }[] = [];
  if (avatarPaths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("avatares")
      .createSignedUrls(avatarPaths, 600);
    signedUrls = urls ?? [];
  }

  const avatarByRuta = new Map(signedUrls.map((u) => [u.path, u.signedUrl]));
  const avatarMap = new Map<string, NonNullable<FilaPostulante["avatar"]>>();
  for (const row of avatarRows) {
    avatarMap.set(row.usuario_id, {
      url: avatarByRuta.get(row.ruta) ?? null,
      ajuste: {
        x: Number(row.ajuste_x),
        y: Number(row.ajuste_y),
        zoom: Number(row.ajuste_zoom),
      },
    });
  }

  const rubrosPorPostulante = new Map<string, string[]>();
  for (const row of catRes.data ?? []) {
    if (!row.categorias) continue;
    const existing = rubrosPorPostulante.get(row.postulante_id) ?? [];
    existing.push(row.categorias.nombre);
    rubrosPorPostulante.set(row.postulante_id, existing);
  }

  const usuariosConCv = new Set((cvStatusRes.data ?? []).map((r) => r.usuario_id));

  if (estadoCursosRes.error) logError("estado_cursos_postulantes", estadoCursosRes.error);
  const cursosMap = new Map<string, EstadoCursosPostulante>();
  for (const fila of estadoCursosRes.data ?? []) {
    const row = aEstadoCursos(fila);
    cursosMap.set(row.postulante_id, {
      ...row,
      rechazos_ventana: Number(row.rechazos_ventana),
      rechazos_totales: Number(row.rechazos_totales),
    });
  }

  if (cursosPendientesRes.error)
    logError("admin_postulantes_cursos_pendientes", cursosPendientesRes.error);
  // Cursos pendientes (asignados o en curso) de cada postulante: la cantidad
  // para el texto y los ids para no ofrecerlos de nuevo en el diálogo.
  const cursosPendientesMap = new Map<string, string[]>();
  for (const row of cursosPendientesRes.data ?? []) {
    const ids = cursosPendientesMap.get(row.postulante_id) ?? [];
    ids.push(row.curso_id);
    cursosPendientesMap.set(row.postulante_id, ids);
  }

  return {
    tipo: "ok",
    total: resultado.total,
    pagina: resultado.pagina,
    totalesNivel,
    cursosActivos: cursosRes.data ?? [],
    filas: postulantes.map((p) => {
      const usuario = p.usuarios;
      return {
        id: p.id,
        nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : "—",
        iniciales: usuario ? inicialesDePersona(usuario.nombre, usuario.apellido) : undefined,
        telefono: usuario?.telefono || null,
        dni: p.dni,
        localidad: p.localidad,
        nivel: nivelDe(p.nivel_prioridad),
        avatar: avatarMap.get(p.usuario_id),
        rubros: rubrosPorPostulante.get(p.id) ?? [],
        tieneCv: usuariosConCv.has(p.usuario_id),
        comprobante: comprobantes.get(p.usuario_id) ?? null,
        cursos: cursosMap.get(p.id),
        cursosPendientesIds: cursosPendientesMap.get(p.id) ?? [],
      };
    }),
  };
}

async function ContadorPostulantes({ datos }: { datos: Promise<DatosListado> }) {
  const d = await datos;
  if (d.tipo !== "ok") return null;
  const desde = (d.pagina - 1) * TAMANO_PAGINA + 1;
  const hasta = Math.min(d.pagina * TAMANO_PAGINA, d.total);
  return (
    <p className="text-sm whitespace-nowrap text-muted-foreground-strong" aria-live="polite">
      Mostrando {desde}–{hasta} de {d.total} {d.total === 1 ? "postulante" : "postulantes"}
    </p>
  );
}

/** Las cantidades salen de los mismos conteos por nivel que los separadores. */
async function FiltroProcedenciaConCantidades({
  datos,
  nivel,
  searchParams,
}: {
  datos: Promise<DatosListado>;
  nivel: NivelPrioridad | null;
  searchParams: ParamsUrl;
}) {
  const d = await datos;
  return (
    <FiltroProcedencia
      nivel={nivel}
      searchParams={searchParams}
      totales={d.tipo === "error" ? undefined : d.totalesNivel}
    />
  );
}

/**
 * Pestañas "Todos" y una por nivel. Cambiar de pestaña vuelve a la página 1
 * y conserva la búsqueda y los rubros. Sin `totales` (mientras cargan) o si
 * falló un conteo, la pestaña va sin número.
 */
function FiltroProcedencia({
  nivel,
  searchParams,
  totales,
}: {
  nivel: NivelPrioridad | null;
  searchParams: ParamsUrl;
  totales?: TotalesNivel;
}) {
  const todos =
    totales && NIVELES.every((n) => totales[n] !== null)
      ? NIVELES.reduce((suma, n) => suma + (totales[n] ?? 0), 0)
      : null;

  const opciones = [
    { valor: null, nivel: null, etiqueta: "Todos", cantidad: todos },
    ...FILTROS_PROCEDENCIA.map((f) => ({
      valor: f.valor,
      nivel: f.nivel,
      etiqueta: f.etiqueta,
      cantidad: totales?.[f.nivel] ?? null,
    })),
  ];

  return (
    <PestanasEstado
      etiqueta="Procedencia de los postulantes"
      pestanas={opciones.map((o) => ({
        href: hrefConParams(RUTA, searchParams, { procedencia: o.valor, pagina: null }),
        label: o.etiqueta,
        activa: o.nivel === nivel,
        cantidad: o.cantidad ?? undefined,
      }))}
    />
  );
}

async function ListadoPostulantes({
  datos,
  searchParams,
}: {
  datos: Promise<DatosListado>;
  searchParams: ParamsUrl;
}) {
  const d = await datos;

  if (d.tipo === "error") return <ErrorListado refError={d.refError} />;
  if (d.tipo === "vacio") {
    if (!d.hayFiltros && d.nivel !== null) {
      const filtro = FILTROS_PROCEDENCIA.find((f) => f.nivel === d.nivel);
      return (
        <EstadoVacio
          tipo="sin-resultados"
          titulo={filtro?.vacio}
          descripcion="Elegí otra procedencia para ver el resto de los postulantes."
          hrefLimpiar={hrefConParams(RUTA, searchParams, { procedencia: null, pagina: null })}
          textoLimpiar="Ver todos"
        />
      );
    }
    return d.hayFiltros ? (
      <EstadoVacio
        tipo="sin-resultados"
        titulo="No hay postulantes con esos filtros"
        hrefLimpiar={RUTA}
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        icono={Users}
        titulo="Todavía no hay postulantes registrados"
      />
    );
  }

  // Las filas llegan ordenadas por nivel: se agrupan las consecutivas.
  const grupos: { nivel: NivelPrioridad; filas: FilaPostulante[] }[] = [];
  for (const p of d.filas) {
    const ultimo = grupos.at(-1);
    if (ultimo?.nivel === p.nivel) ultimo.filas.push(p);
    else grupos.push({ nivel: p.nivel, filas: [p] });
  }

  const volverUrl = hrefConParams(RUTA, searchParams, { pagina: d.pagina });

  return (
    <div className="@container flex flex-col gap-6">
      <div
        className={cn(
          "flex flex-col gap-3 @4xl:overflow-hidden @4xl:rounded-[var(--radius-xl)] @4xl:border @4xl:border-border @4xl:bg-surface",
          GRILLA,
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "hidden bg-tabla-encabezado px-5 py-3 text-xs font-bold tracking-[0.06em] text-neutral uppercase",
            SUBGRILLA,
          )}
        >
          <span>Postulante</span>
          <span>DNI</span>
          <span>Localidad</span>
          <span>Rubros</span>
          <span>Prioridad</span>
          <span>CV y curso</span>
          <span />
        </div>

        {grupos.map((grupo) => (
          <section
            key={grupo.nivel}
            aria-labelledby={`nivel-${grupo.nivel}`}
            className={cn("flex flex-col gap-3", SUBGRILLA)}
          >
            <SeparadorNivel nivel={grupo.nivel} total={d.totalesNivel[grupo.nivel]} />
            <ul className={cn("flex flex-col gap-3", SUBGRILLA)}>
              {grupo.filas.map((p) => (
                <FilaListado
                  key={p.id}
                  p={p}
                  fichaUrl={`${RUTA}/${p.id}?volver=${encodeURIComponent(volverUrl)}`}
                  cursosActivos={d.cursosActivos}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={d.pagina}
        total={d.total}
        variante="numeros"
      />
    </div>
  );
}

function SeparadorNivel({ nivel, total }: { nivel: NivelPrioridad; total: number | null }) {
  return (
    <h2
      id={`nivel-${nivel}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-lg)] bg-tabla-separador px-4 py-2.5 text-sm leading-normal @4xl:col-span-full @4xl:rounded-none @4xl:border-t @4xl:border-tabla-borde @4xl:px-5"
    >
      <Badge tono={NIVEL[nivel].tono}>{NIVEL[nivel].titulo}</Badge>
      <span>
        <span className="font-bold text-heading">Prioridad {nivel}</span>
        {total !== null && (
          <span className="font-normal text-muted-foreground-strong">
            {" "}
            · {total} {total === 1 ? "postulante" : "postulantes"}
          </span>
        )}
      </span>
    </h2>
  );
}

function FilaListado({
  p,
  fichaUrl,
  cursosActivos,
}: {
  p: FilaPostulante;
  fichaUrl: string;
  cursosActivos: Pick<Tabla<"cursos">, "id" | "nombre" | "descripcion">[];
}) {
  const pendientes = p.cursosPendientesIds.length;
  const puedeRecibirCurso = p.cursos?.puede_recibir_curso ?? false;
  const etiquetaCurso = <EtiquetaCurso cursos={p.cursos} />;
  const conBadgeCurso = Boolean(
    p.cursos && (p.cursos.necesita_curso || p.cursos.asignacion_activa_estado),
  );

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-sm text-foreground transition-colors",
        "@4xl:rounded-none @4xl:border-x-0 @4xl:border-b-0 @4xl:border-tabla-borde @4xl:px-5 @4xl:py-3 @4xl:hover:bg-tabla-hover",
        SUBGRILLA,
        "@4xl:items-center",
      )}
    >
      {/* Postulante */}
      <div className="flex min-w-0 basis-full items-center gap-3 @4xl:basis-auto">
        <AvatarAjustado
          src={p.avatar?.url ?? null}
          alt=""
          ajuste={p.avatar?.ajuste}
          iniciales={p.iniciales}
          size="lista"
        />
        <div className="min-w-0">
          <Link
            href={fichaUrl}
            className="block rounded-[var(--radius-sm)] text-[15px] font-bold break-words text-heading no-underline outline-none hover:text-primary focus-visible:shadow-[var(--sombra-foco)]"
          >
            {p.nombre}
          </Link>
          {p.telefono && (
            <p className="text-[13px] text-muted-foreground">
              <span className="sr-only">Teléfono: </span>
              {p.telefono}
            </p>
          )}
        </div>
      </div>

      {/* DNI */}
      <p className="tabular-nums">
        <span className="text-muted-foreground @4xl:sr-only">DNI </span>
        {p.dni ?? "—"}
      </p>

      {/* Localidad */}
      <p className="min-w-0 break-words">
        <span className="sr-only">Localidad: </span>
        {p.localidad ?? <span className="text-muted-foreground">Sin informar</span>}
      </p>

      {/* Rubros */}
      <p
        className="line-clamp-2 basis-full text-muted-foreground-strong @4xl:basis-auto"
        title={p.rubros.join(", ")}
      >
        <span className="sr-only">Rubros: </span>
        {p.rubros.length > 0 ? p.rubros.join(", ") : <span className="text-muted-foreground">—</span>}
      </p>

      {/* Prioridad */}
      <div className="min-w-0">
        <span className="sr-only">Prioridad: </span>
        <BadgeProcedencia nivel={p.nivel} localidad={p.localidad} comprobante={p.comprobante} />
      </div>

      {/* CV y curso */}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="sr-only">CV y curso: </span>
        {!p.tieneCv || conBadgeCurso ? (
          <div className="flex flex-wrap gap-1.5">
            {!p.tieneCv && <Badge tono="warning">Sin CV</Badge>}
            {etiquetaCurso}
          </div>
        ) : (
          <span className="text-muted-foreground-strong">CV cargado</span>
        )}
        {pendientes > 0 && (
          <p className="text-xs font-medium text-warning-text">
            {textoCursosPendientes(pendientes)}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex basis-full flex-wrap gap-2 @4xl:basis-auto @4xl:flex-nowrap @4xl:justify-end">
        {puedeRecibirCurso && (
          <AsignarCursoDialog
            postulanteId={p.id}
            postulanteNombre={p.nombre}
            cursosActivos={cursosActivos}
            cursosPendientesIds={p.cursosPendientesIds}
            claseBoton="flex-1 @4xl:flex-none @4xl:min-h-10! @4xl:px-3.5! @4xl:text-sm!"
          />
        )}
        <Link
          href={fichaUrl}
          className="btn-neutro flex-1 whitespace-nowrap @4xl:flex-none @4xl:min-h-10! @4xl:px-3.5! @4xl:text-sm!"
        >
          Ver perfil
          <span className="sr-only">: {p.nombre}</span>
        </Link>
      </div>
    </li>
  );
}

function EtiquetaCurso({ cursos }: { cursos: EstadoCursosPostulante | undefined }) {
  if (!cursos) return null;
  if (cursos.necesita_curso) {
    return (
      <Badge tono="warning" estado>
        Necesita curso · {textoRechazos(cursos.rechazos_ventana)}
      </Badge>
    );
  }
  if (cursos.asignacion_activa_estado) {
    return <EstadoCursoBadge estado={cursos.asignacion_activa_estado} />;
  }
  return null;
}

function EsqueletoListado() {
  return (
    <div aria-busy="true" aria-label="Cargando postulantes" className="flex flex-col gap-3">
      <Esqueleto className="h-11 w-full rounded-[var(--radius-lg)]" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="tarjeta flex items-center gap-3 p-4">
          <Esqueleto className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-4 w-1/3" />
            <Esqueleto className="h-3 w-1/4" />
          </div>
          <Esqueleto className="hidden h-10 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

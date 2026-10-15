import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FileText, Users } from "lucide-react";
import { logError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { FiltrosPostulantes } from "./filtros-postulantes";
import { AsignarCursoDialog } from "./asignar-curso-dialog";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import {
  VENTANA_RECHAZOS_DIAS,
  textoRechazos,
  type EstadoCursosPostulante,
} from "@/lib/cursos";

export const metadata: Metadata = {
  title: "Postulantes | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/postulantes";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type FiltrosListado = {
  q: string;
  rubroIds: string[];
  conCv: boolean;
  esperandoCurso: boolean;
  cursoPendiente: boolean;
  pagina: number;
};

export default async function PostulantesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    rubros?: string;
    con_cv?: string;
    esperando_curso?: string;
    curso_pendiente?: string;
    pagina?: string;
  }>;
}) {
  const sp = await searchParams;

  const filtros: FiltrosListado = {
    q: limpiarBusqueda(sp.q),
    rubroIds: sp.rubros
      ? sp.rubros
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    conCv: sp.con_cv === "1",
    esperandoCurso: sp.esperando_curso === "1",
    cursoPendiente: sp.curso_pendiente === "1",
    pagina: leerPagina(sp.pagina),
  };

  const supabase = await createSupabaseServerClient();

  // Categorías para el MultiCombobox
  const categoriasRes = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");
  const opciones = (categoriasRes.data ?? []) as { id: string; nombre: string }[];

  return (
    <PostulantesShell
      opciones={opciones}
      rubroIds={filtros.rubroIds}
      hayBusqueda={filtros.q.length > 0}
      conCv={filtros.conCv}
      esperandoCurso={filtros.esperandoCurso}
      cursoPendiente={filtros.cursoPendiente}
    >
      <Suspense
        key={JSON.stringify(filtros)}
        fallback={<EsqueletoLista filas={5} />}
      >
        <ListadoPostulantes filtros={filtros} searchParams={sp} />
      </Suspense>
    </PostulantesShell>
  );
}

async function ListadoPostulantes({
  filtros,
  searchParams,
}: {
  filtros: FiltrosListado;
  searchParams: ParamsUrl;
}) {
  const { q, rubroIds, conCv, esperandoCurso, cursoPendiente, pagina } = filtros;
  const hayFiltros =
    rubroIds.length > 0 || conCv || q.length > 0 || esperandoCurso || cursoPendiente;

  const supabase = await createSupabaseServerClient();

  // Cursos activos para el dialog de asignación
  const cursosRes = await supabase
    .from("cursos")
    .select("id, nombre, descripcion")
    .eq("activo", true)
    .order("nombre");

  const cursosActivos = (cursosRes.data ?? []) as {
    id: string;
    nombre: string;
    descripcion: string | null;
  }[];

  // Pre-filtros paralelos
  const [rubroPreResult, cvPreResult, esperandoPreResult, pendientePreResult] = await Promise.all([
    rubroIds.length > 0
      ? supabase
          .from("postulante_categorias")
          .select("postulante_id")
          .in("categoria_id", rubroIds)
      : Promise.resolve({ data: null }),
    conCv
      ? supabase
          .from("archivos_usuario")
          .select("usuario_id")
          .eq("tipo", "cv")
          .eq("activo", true)
      : Promise.resolve({ data: null }),
    esperandoCurso
      ? supabase.rpc("postulantes_esperando_curso_ids")
      : Promise.resolve({ data: null }),
    cursoPendiente
      ? supabase
          .from("asignaciones_curso")
          .select("postulante_id")
          .in("estado", ["asignado", "en_curso"])
      : Promise.resolve({ data: null }),
  ]);

  type RubroRow = { postulante_id: string };
  type CvRow = { usuario_id: string };
  type EsperandoRow = { postulante_id: string };

  const rubroPrefilterId: string[] | undefined =
    rubroIds.length > 0
      ? [
          ...new Set(
            ((rubroPreResult.data ?? []) as RubroRow[]).map(
              (r) => r.postulante_id
            )
          ),
        ]
      : undefined;

  const cvUsuarioIds: string[] | undefined = conCv
    ? ((cvPreResult.data ?? []) as CvRow[]).map((r) => r.usuario_id)
    : undefined;

  if (esperandoCurso && "error" in esperandoPreResult && esperandoPreResult.error)
    logError("postulantes_esperando_curso_ids", esperandoPreResult.error);
  const esperandoCursoFilterIds: string[] | undefined = esperandoCurso
    ? ((esperandoPreResult.data ?? []) as EsperandoRow[]).map(
        (r) => r.postulante_id
      )
    : undefined;

  if (cursoPendiente && "error" in pendientePreResult && pendientePreResult.error)
    logError("postulantes_curso_pendiente", pendientePreResult.error);
  const cursoPendienteFilterIds: string[] | undefined = cursoPendiente
    ? ((pendientePreResult.data ?? []) as EsperandoRow[]).map((r) => r.postulante_id)
    : undefined;

  // Pre-filtro: búsqueda de texto
  let textFilterIds: string[] | undefined;
  if (q) {
    type UserRow = { id: string };
    type PRow = { id: string };
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
      const ref = logError("admin_postulantes_busqueda", errorTexto);
      return <ErrorListado refError={ref} />;
    }

    const usuarioIds = ((usersRes.data ?? []) as UserRow[]).map((r) => r.id);
    const idsByDni = ((dniRes.data ?? []) as PRow[]).map((r) => r.id);

    let idsByName: string[] = [];
    if (usuarioIds.length > 0) {
      const { data: byName } = await supabase
        .from("postulantes")
        .select("id")
        .in("usuario_id", usuarioIds);
      idsByName = ((byName ?? []) as PRow[]).map((r) => r.id);
    }

    textFilterIds = [...new Set([...idsByName, ...idsByDni])];
  }

  const vacio = hayFiltros ? (
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

  // Short-circuit si algún filtro no tiene resultados
  const emptyFilter =
    (rubroPrefilterId !== undefined && rubroPrefilterId.length === 0) ||
    (cvUsuarioIds !== undefined && cvUsuarioIds.length === 0) ||
    (textFilterIds !== undefined && textFilterIds.length === 0) ||
    (esperandoCursoFilterIds !== undefined &&
      esperandoCursoFilterIds.length === 0) ||
    (cursoPendienteFilterIds !== undefined &&
      cursoPendienteFilterIds.length === 0);

  if (emptyFilter) return vacio;

  type PostulanteRow = {
    id: string;
    usuario_id: string;
    dni: string | null;
    created_at: string;
    usuarios: {
      nombre: string;
      apellido: string;
      telefono: string | null;
    } | null;
  };

  const resultado = await consultarPagina<PostulanteRow>(pagina, (desde, hasta) => {
    let query = supabase
      .from("postulantes")
      .select(
        "id, usuario_id, dni, created_at, usuarios!usuario_id(nombre, apellido, telefono)",
        { count: "exact" }
      );

    if (rubroPrefilterId !== undefined)
      query = query.in("id", rubroPrefilterId);
    if (cvUsuarioIds !== undefined)
      query = query.in("usuario_id", cvUsuarioIds);
    if (textFilterIds !== undefined) query = query.in("id", textFilterIds);
    if (esperandoCursoFilterIds !== undefined)
      query = query.in("id", esperandoCursoFilterIds);
    if (cursoPendienteFilterIds !== undefined)
      query = query.in("id", cursoPendienteFilterIds);

    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
      .overrideTypes<PostulanteRow[], { merge: false }>();
  });

  if (!resultado.ok) {
    const ref = logError("admin_postulantes_listado", resultado.error);
    return <ErrorListado refError={ref} />;
  }

  const postulantes = resultado.filas;
  const totalCount = resultado.total;

  if (postulantes.length === 0) return vacio;

  const postulanteIds = postulantes.map((p) => p.id);
  const usuarioIds = postulantes.map((p) => p.usuario_id);

  type AvatarRow = {
    usuario_id: string;
    ruta: string;
    ajuste_x: number;
    ajuste_y: number;
    ajuste_zoom: number;
  };
  type CatRow = {
    postulante_id: string;
    categorias: { id: string; nombre: string } | null;
  };
  type CvStatusRow = { usuario_id: string };
  type PostulacionCountRow = { postulante_id: string };

  const [
    avatarRes,
    catRes,
    cvStatusRes,
    postulacionesRes,
    estadoCursosRes,
    cursosPendientesRes,
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
      .eq("activo", true),
    supabase
      .from("postulaciones")
      .select("postulante_id")
      .in("postulante_id", postulanteIds),
    supabase.rpc("estado_cursos_postulantes", {
      p_postulante_ids: postulanteIds,
    }),
    supabase
      .from("asignaciones_curso")
      .select("postulante_id")
      .in("postulante_id", postulanteIds)
      .in("estado", ["asignado", "en_curso"]),
  ]);

  const avatarRows = (avatarRes.data ?? []) as unknown as AvatarRow[];
  const avatarPaths = avatarRows.map((r) => r.ruta).filter(Boolean);
  let signedUrls: { path: string; signedUrl: string }[] = [];
  if (avatarPaths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("avatares")
      .createSignedUrls(avatarPaths, 600);
    signedUrls = (urls ?? []) as { path: string; signedUrl: string }[];
  }

  const avatarByRuta = new Map(signedUrls.map((u) => [u.path, u.signedUrl]));
  const avatarMap = new Map<
    string,
    { url: string | null; ajuste?: { x: number; y: number; zoom: number } }
  >();
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

  const catRows = (catRes.data ?? []) as unknown as CatRow[];
  const rubrosPorPostulante = new Map<string, { id: string; nombre: string }[]>();
  for (const row of catRows) {
    if (!row.categorias) continue;
    const existing = rubrosPorPostulante.get(row.postulante_id) ?? [];
    existing.push(row.categorias);
    rubrosPorPostulante.set(row.postulante_id, existing);
  }

  const usuariosConCv = new Set(
    (
      (cvStatusRes.data ?? []) as unknown as CvStatusRow[]
    ).map((r) => r.usuario_id)
  );

  const conteosMap = new Map<string, number>();
  for (const row of (
    postulacionesRes.data ?? []
  ) as unknown as PostulacionCountRow[]) {
    conteosMap.set(
      row.postulante_id,
      (conteosMap.get(row.postulante_id) ?? 0) + 1
    );
  }

  if (estadoCursosRes.error) logError("estado_cursos_postulantes", estadoCursosRes.error);
  const cursosMap = new Map<string, EstadoCursosPostulante>();
  for (const row of (estadoCursosRes.data ?? []) as EstadoCursosPostulante[]) {
    cursosMap.set(row.postulante_id, {
      ...row,
      rechazos_ventana: Number(row.rechazos_ventana),
      rechazos_totales: Number(row.rechazos_totales),
    });
  }

  if (cursosPendientesRes.error)
    logError("admin_postulantes_cursos_pendientes", cursosPendientesRes.error);
  const cursosPendientesMap = new Map<string, number>();
  for (const row of (cursosPendientesRes.data ?? []) as PostulacionCountRow[]) {
    cursosPendientesMap.set(
      row.postulante_id,
      (cursosPendientesMap.get(row.postulante_id) ?? 0) + 1
    );
  }

  const volverUrl = hrefConParams(RUTA, searchParams, {
    pagina: resultado.pagina,
  });

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {totalCount === 1
          ? "1 postulante encontrado"
          : `${totalCount} postulantes encontrados`}
      </p>

      {/*
        Una sola lista para todos los anchos: en celular cada postulante es una
        tarjeta apilada y desde lg los datos, los números y los botones se
        acomodan en tres columnas. Los textos largos pasan de línea, así que
        nunca hace falta desplazarse hacia los costados.
      */}
      <ul className="space-y-3">
        {postulantes.map((p) => {
          const usuario = p.usuarios;
          const avatar = avatarMap.get(p.usuario_id);
          const rubros = rubrosPorPostulante.get(p.id) ?? [];
          const tieneCv = usuariosConCv.has(p.usuario_id);
          const numPostulaciones = conteosMap.get(p.id) ?? 0;
          const cursos = cursosMap.get(p.id);
          const rechazos = cursos?.rechazos_ventana ?? 0;
          const necesitaCurso = cursos?.necesita_curso ?? false;
          const pendientes = cursosPendientesMap.get(p.id) ?? 0;
          const nombreCompleto = usuario
            ? `${usuario.nombre} ${usuario.apellido}`
            : "—";
          const fichaUrl = `/admin/postulantes/${p.id}?volver=${encodeURIComponent(
            volverUrl
          )}`;

          return (
            <li
              key={p.id}
              className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:bg-surface-tinted lg:flex-row lg:items-center lg:gap-6"
            >
              {/* Identidad y datos de contacto */}
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <AvatarAjustado
                  src={avatar?.url ?? null}
                  alt={nombreCompleto}
                  ajuste={avatar?.ajuste}
                  size="sm"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words font-medium text-foreground">
                      {nombreCompleto}
                    </span>
                    <EtiquetaCurso cursos={cursos} />
                  </div>
                  {pendientes > 0 && (
                    <p className="text-xs font-medium text-amber-700">
                      {textoCursosPendientes(pendientes)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">
                      DNI <span className="font-mono text-foreground">{p.dni ?? "—"}</span>
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="whitespace-nowrap">
                      Tel. <span className="text-foreground">{usuario?.telefono || "—"}</span>
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="whitespace-nowrap">
                      Registrado el {formatearFecha(p.created_at)}
                    </span>
                  </p>
                  <RubrosPills rubros={rubros} />
                </div>
              </div>

              {/* Números */}
              <dl className="grid grid-cols-3 gap-2 text-sm lg:w-80 lg:flex-none">
                <div>
                  <dt className="text-xs text-muted-foreground">CV</dt>
                  <dd>
                    {tieneCv ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Sí
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin CV</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Postulaciones</dt>
                  <dd className="text-foreground">{numPostulaciones}</dd>
                </div>
                <div>
                  <dt
                    className="text-xs text-muted-foreground"
                    title={`Rechazos de empresas en los últimos ${VENTANA_RECHAZOS_DIAS} días, posteriores al último curso completado`}
                  >
                    Rechazos ({VENTANA_RECHAZOS_DIAS} días)
                  </dt>
                  <dd className="text-foreground">{rechazos}</dd>
                </div>
              </dl>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 lg:w-36 lg:flex-none lg:flex-col lg:items-stretch">
                {necesitaCurso && (
                  <AsignarCursoDialog
                    postulanteId={p.id}
                    postulanteNombre={nombreCompleto}
                    cursosActivos={cursosActivos}
                    claseBoton="min-h-11 px-4 text-sm lg:min-h-9 lg:px-3"
                  />
                )}
                <Link
                  href={fichaUrl}
                  className="btn-secundario inline-flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-sm lg:min-h-9 lg:px-3"
                >
                  Ver ficha
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={totalCount}
      />
    </>
  );
}

function textoCursosPendientes(cantidad: number): string {
  return cantidad === 1
    ? "1 curso pendiente por terminar"
    : `${cantidad} cursos pendientes por terminar`;
}

function EtiquetaCurso({
  cursos,
  className,
}: {
  cursos: EstadoCursosPostulante | undefined;
  className?: string;
}) {
  if (!cursos) return null;
  if (cursos.necesita_curso) {
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ${className ?? ""}`}
      >
        Necesita curso · {textoRechazos(cursos.rechazos_ventana)}
      </span>
    );
  }
  if (cursos.asignacion_activa_estado) {
    return (
      <EstadoCursoBadge
        estado={cursos.asignacion_activa_estado}
        className={`px-2 ${className ?? ""}`}
      />
    );
  }
  return null;
}

function RubrosPills({
  rubros,
}: {
  rubros: { id: string; nombre: string }[];
}) {
  if (rubros.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>;

  const visible = rubros.slice(0, 3);
  const extra = rubros.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {r.nombre}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-full bg-surface-tinted px-2 py-0.5 text-xs text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}

function PostulantesShell({
  opciones,
  rubroIds,
  hayBusqueda,
  conCv,
  esperandoCurso,
  cursoPendiente,
  children,
}: {
  opciones: { id: string; nombre: string }[];
  rubroIds: string[];
  hayBusqueda: boolean;
  conCv: boolean;
  esperandoCurso: boolean;
  cursoPendiente: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Postulantes</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Postulantes
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Explorá el padrón completo de candidatos registrados.
      </p>

      <div className="mt-6">
        <FiltrosPostulantes
          opciones={opciones}
          rubros={rubroIds}
          hayBusqueda={hayBusqueda}
          conCv={conCv}
          esperandoCurso={esperandoCurso}
          cursoPendiente={cursoPendiente}
        />
      </div>

      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

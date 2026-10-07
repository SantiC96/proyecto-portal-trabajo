import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { FiltrosPostulantes } from "./filtros-postulantes";

export const metadata: Metadata = {
  title: "Postulantes | Panel municipal | Portal de Empleo Funes",
};

const PAGE_SIZE = 20;

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PostulantesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    rubros?: string;
    con_cv?: string;
    pagina?: string;
  }>;
}) {
  const {
    q: rawQ = "",
    rubros: rawRubros = "",
    con_cv: rawConCv = "",
    pagina: rawPagina = "1",
  } = await searchParams;

  const q = rawQ.trim();
  const rubroIds = rawRubros
    ? rawRubros
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const conCv = rawConCv === "1";
  const pagina = Math.max(1, parseInt(rawPagina, 10) || 1);
  const offset = (pagina - 1) * PAGE_SIZE;
  const hayFiltros = rubroIds.length > 0 || conCv || q.length > 0;

  const supabase = await createSupabaseServerClient();

  // Categorías para el MultiCombobox
  const { data: categoriasOpciones } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const opciones = (categoriasOpciones ?? []) as { id: string; nombre: string }[];

  // Pre-filtros paralelos
  const [rubroPreResult, cvPreResult] = await Promise.all([
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
  ]);

  type RubroRow = { postulante_id: string };
  type CvRow = { usuario_id: string };

  const rubroPrefilterId: string[] | undefined =
    rubroIds.length > 0
      ? [...new Set(((rubroPreResult.data ?? []) as RubroRow[]).map((r) => r.postulante_id))]
      : undefined;

  const cvUsuarioIds: string[] | undefined = conCv
    ? ((cvPreResult.data ?? []) as CvRow[]).map((r) => r.usuario_id)
    : undefined;

  // Pre-filtro: búsqueda de texto
  let textFilterIds: string[] | undefined;
  if (q) {
    type UserRow = { id: string };
    type PRow = { id: string };

    const [usersRes, dniRes] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id")
        .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%`),
      supabase
        .from("postulantes")
        .select("id")
        .ilike("dni", `%${q}%`),
    ]);

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

  // Short-circuit si algún filtro no tiene resultados
  const emptyFilter =
    (rubroPrefilterId !== undefined && rubroPrefilterId.length === 0) ||
    (cvUsuarioIds !== undefined && cvUsuarioIds.length === 0) ||
    (textFilterIds !== undefined && textFilterIds.length === 0);

  if (emptyFilter) {
    return (
      <PostulantesShell
        opciones={opciones}
        rubroIds={rubroIds}
        q={q}
        conCv={conCv}
      >
        <EstadoVacio hayFiltros={hayFiltros} />
      </PostulantesShell>
    );
  }

  // Consulta principal
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

  let query = supabase
    .from("postulantes")
    .select(
      "id, usuario_id, dni, created_at, usuarios!usuario_id(nombre, apellido, telefono)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (rubroPrefilterId !== undefined)
    query = query.in("id", rubroPrefilterId);
  if (cvUsuarioIds !== undefined)
    query = query.in("usuario_id", cvUsuarioIds);
  if (textFilterIds !== undefined) query = query.in("id", textFilterIds);

  const { data: rawPostulantes, count: total } = await query;
  const postulantes = (rawPostulantes ?? []) as unknown as PostulanteRow[];
  const totalCount = total ?? 0;

  if (postulantes.length === 0) {
    return (
      <PostulantesShell
        opciones={opciones}
        rubroIds={rubroIds}
        q={q}
        conCv={conCv}
      >
        <EstadoVacio hayFiltros={hayFiltros} />
      </PostulantesShell>
    );
  }

  const postulanteIds = postulantes.map((p) => p.id);
  const usuarioIds = postulantes.map((p) => p.usuario_id);

  // Batch secundario
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

  const [avatarRes, catRes, cvStatusRes, postulacionesRes] = await Promise.all([
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
    ((cvStatusRes.data ?? []) as unknown as CvStatusRow[]).map((r) => r.usuario_id)
  );

  const conteosMap = new Map<string, number>();
  for (const row of (postulacionesRes.data ?? []) as unknown as PostulacionCountRow[]) {
    conteosMap.set(
      row.postulante_id,
      (conteosMap.get(row.postulante_id) ?? 0) + 1
    );
  }

  const totalPaginas = Math.ceil(totalCount / PAGE_SIZE);

  // URL base para preservar filtros en paginación
  const spActivos = new URLSearchParams();
  if (q) spActivos.set("q", q);
  if (rubroIds.length > 0) spActivos.set("rubros", rubroIds.join(","));
  if (conCv) spActivos.set("con_cv", "1");

  function paginaUrl(p: number): string {
    const sp2 = new URLSearchParams(spActivos);
    if (p > 1) sp2.set("pagina", String(p));
    else sp2.delete("pagina");
    const qs = sp2.toString();
    return `/admin/postulantes${qs ? `?${qs}` : ""}`;
  }

  return (
    <PostulantesShell
      opciones={opciones}
      rubroIds={rubroIds}
      q={q}
      conCv={conCv}
    >
      <p className="text-sm text-muted-foreground">
        {totalCount === 1
          ? "1 postulante encontrado"
          : `${totalCount} postulantes encontrados`}
      </p>

      {/* Tabla md+ */}
      <div className="hidden md:block overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-tinted text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Postulante
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                DNI
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Teléfono
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Rubros
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                CV
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Postulaciones
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Registrado
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {postulantes.map((p) => {
              const usuario = p.usuarios;
              const avatar = avatarMap.get(p.usuario_id);
              const rubros = rubrosPorPostulante.get(p.id) ?? [];
              const tieneCv = usuariosConCv.has(p.usuario_id);
              const numPostulaciones = conteosMap.get(p.id) ?? 0;
              const fichaUrl = `/admin/postulantes/${p.id}?volver=${encodeURIComponent(
                paginaUrl(pagina)
              )}`;

              return (
                <tr
                  key={p.id}
                  className="hover:bg-surface-tinted transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarAjustado
                        src={avatar?.url ?? null}
                        alt={
                          usuario
                            ? `${usuario.nombre} ${usuario.apellido}`
                            : "Postulante"
                        }
                        ajuste={avatar?.ajuste}
                        size="sm"
                      />
                      <span className="font-medium text-foreground">
                        {usuario
                          ? `${usuario.nombre} ${usuario.apellido}`
                          : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground">
                    {p.dni ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {usuario?.telefono || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RubrosPills rubros={rubros} />
                  </td>
                  <td className="px-4 py-3">
                    {tieneCv ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <FileText className="h-4 w-4" />
                        Sí
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin CV</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {numPostulaciones}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatearFecha(p.created_at)}
                  </td>
                  <td className="px-4 py-3 w-px whitespace-nowrap">
                    <Link
                      href={fichaUrl}
                      className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="space-y-3 md:hidden">
        {postulantes.map((p) => {
          const usuario = p.usuarios;
          const avatar = avatarMap.get(p.usuario_id);
          const rubros = rubrosPorPostulante.get(p.id) ?? [];
          const tieneCv = usuariosConCv.has(p.usuario_id);
          const numPostulaciones = conteosMap.get(p.id) ?? 0;
          const fichaUrl = `/admin/postulantes/${p.id}?volver=${encodeURIComponent(
            paginaUrl(pagina)
          )}`;

          return (
            <div
              key={p.id}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <AvatarAjustado
                  src={avatar?.url ?? null}
                  alt={
                    usuario
                      ? `${usuario.nombre} ${usuario.apellido}`
                      : "Postulante"
                  }
                  ajuste={avatar?.ajuste}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-foreground">
                    {usuario
                      ? `${usuario.nombre} ${usuario.apellido}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    DNI: {p.dni ?? "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-foreground">
                    {usuario?.telefono || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CV</p>
                  {tieneCv ? (
                    <span className="inline-flex items-center gap-1 text-primary text-sm">
                      <FileText className="h-3.5 w-3.5" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Sin CV
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Postulaciones</p>
                  <p className="text-foreground">{numPostulaciones}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registrado</p>
                  <p className="text-foreground">{formatearFecha(p.created_at)}</p>
                </div>
              </div>
              {rubros.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rubros</p>
                  <RubrosPills rubros={rubros} />
                </div>
              )}
              <Link
                href={fichaUrl}
                className="btn-secundario inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm"
              >
                Ver ficha
              </Link>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link
                href={paginaUrl(pagina - 1)}
                className="btn-secundario inline-flex items-center whitespace-nowrap px-3 py-1.5 text-sm"
              >
                ← Anterior
              </Link>
            )}
            {pagina < totalPaginas && (
              <Link
                href={paginaUrl(pagina + 1)}
                className="btn-secundario inline-flex items-center whitespace-nowrap px-3 py-1.5 text-sm"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </PostulantesShell>
  );
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

function EstadoVacio({ hayFiltros }: { hayFiltros: boolean }) {
  if (hayFiltros) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
        <Users className="mx-auto h-10 w-10 text-muted-icon" />
        <p className="mt-3 font-medium text-foreground">
          No hay postulantes con esos filtros
        </p>
        <Link
          href="/admin/postulantes"
          className="btn-secundario mt-4 inline-flex px-4 py-2 text-sm"
        >
          Limpiar filtros
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
      <Users className="mx-auto h-10 w-10 text-muted-icon" />
      <p className="mt-3 font-medium text-foreground">
        Todavía no hay postulantes registrados
      </p>
    </div>
  );
}

function PostulantesShell({
  opciones,
  rubroIds,
  q,
  conCv,
  children,
}: {
  opciones: { id: string; nombre: string }[];
  rubroIds: string[];
  q: string;
  conCv: boolean;
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
          key={`${q}|${rubroIds.join(",")}|${conCv ? "1" : "0"}`}
          opciones={opciones}
          seleccionadosIniciales={rubroIds}
          qInicial={q}
          conCvInicial={conCv}
        />
      </div>

      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

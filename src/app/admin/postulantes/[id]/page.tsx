import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosCandidato } from "@/components/admin/datos-candidato";
import { obtenerCandidato } from "@/lib/admin/candidato";
import {
  BADGE_CONFIG,
  type EstadoPostulacion,
} from "@/lib/admin/postulacion-estados";
import { AsignarCursoDialog } from "../asignar-curso-dialog";
import { formatFechaCorta } from "@/lib/fechas";

export const metadata: Metadata = {
  title: "Ficha postulante | Panel municipal | Portal de Empleo Funes",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PostulanteFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const [{ id: postulanteId }, { volver: rawVolver }] = await Promise.all([
    params,
    searchParams,
  ]);

  // Validar que volver solo apunte a /admin/postulantes
  const volverHref =
    typeof rawVolver === "string" &&
    rawVolver.startsWith("/admin/postulantes")
      ? rawVolver
      : "/admin/postulantes";

  const supabase = await createSupabaseServerClient();
  const [candidato, postulacionesResult, rechazosResult, asignacionesResult, cursosResult] =
    await Promise.all([
      obtenerCandidato(postulanteId),
      supabase
        .from("postulaciones")
        .select(
          "id, estado, created_at, ofertas!oferta_id(id, titulo, empresa_nombre)"
        )
        .eq("postulante_id", postulanteId)
        .order("created_at", { ascending: false }),
      supabase.rpc("rechazos_desde_ultimo_curso", {
        p_postulante_id: postulanteId,
      }),
      supabase
        .from("asignaciones_curso")
        .select(
          "id, created_at, nota, cursos!curso_id(id, nombre, descripcion, link, activo)"
        )
        .eq("postulante_id", postulanteId)
        .order("created_at", { ascending: false }),
      supabase
        .from("cursos")
        .select("id, nombre, descripcion")
        .eq("activo", true)
        .order("nombre"),
    ]);

  if (!candidato) notFound();

  type PostulacionHistorial = {
    id: string;
    estado: EstadoPostulacion;
    created_at: string;
    ofertas: {
      id: string;
      titulo: string;
      empresa_nombre: string;
    } | null;
  };

  type AsignacionRow = {
    id: string;
    created_at: string;
    nota: string | null;
    cursos: {
      id: string;
      nombre: string;
      descripcion: string | null;
      link: string | null;
      activo: boolean;
    } | null;
  };

  const postulaciones = (postulacionesResult.data ??
    []) as unknown as PostulacionHistorial[];
  if (rechazosResult.error)
    console.error("[rechazos_desde_ultimo_curso]", rechazosResult.error);
  const rechazos = Number(rechazosResult.data ?? 0);
  const asignaciones = (asignacionesResult.data ?? []) as unknown as AsignacionRow[];
  const cursosActivos = (cursosResult.data ?? []) as {
    id: string;
    nombre: string;
    descripcion: string | null;
  }[];
  const necesitaCurso = rechazos >= 3;
  const nombreCompleto = `${candidato.usuario.nombre} ${candidato.usuario.apellido}`;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <Link href={volverHref} className="hover:text-foreground">
          ← Postulantes
        </Link>
        <span>/</span>
        <span className="text-foreground">{nombreCompleto}</span>
      </div>

      {/* Cabecera */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AvatarAjustado
            src={candidato.avatar.url}
            alt={nombreCompleto}
            ajuste={candidato.avatar.ajuste}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {nombreCompleto}
            </h1>
            {necesitaCurso && (
              <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Necesita curso · {rechazos} rechazo{rechazos !== 1 ? "s" : ""} desde el último
              </span>
            )}
          </div>
        </div>
        <AsignarCursoDialog
          postulanteId={postulanteId}
          postulanteNombre={nombreCompleto}
          cursosActivos={cursosActivos}
          destacado={necesitaCurso}
        />
      </div>

      <div className="mt-8 space-y-6">
        <DatosCandidato
          email={candidato.email}
          dni={candidato.postulante.dni}
          domicilio={candidato.postulante.domicilio}
          telefono={candidato.usuario.telefono}
          categorias={candidato.categorias}
          cvUrl={candidato.cvUrl}
        />

        {/* Cursos asignados */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-foreground">
              Cursos asignados ({asignaciones.length})
            </h2>
            {rechazos > 0 && (
              <span className="text-sm text-muted-foreground">
                {rechazos} rechazo{rechazos !== 1 ? "s" : ""} desde el último curso
              </span>
            )}
          </div>

          {asignaciones.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no se asignó ningún curso a este postulante.
            </p>
          ) : (
            <>
              {/* Tabla md+ */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Curso
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Fecha
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Estado
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        Nota interna
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asignaciones.map((a) => {
                      const curso = a.cursos;
                      return (
                        <tr key={a.id}>
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {curso ? (
                              <Link
                                href={`/admin/cursos/${curso.id}`}
                                className="text-primary hover:underline"
                              >
                                {curso.nombre}
                              </Link>
                            ) : (
                              "Curso eliminado"
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatFechaCorta(a.created_at)}
                          </td>
                          <td className="py-3 pr-4">
                            {curso ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  curso.activo
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {curso.activo ? "Activo" : "Inactivo"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {a.nota ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="mt-4 space-y-3 md:hidden">
                {asignaciones.map((a) => {
                  const curso = a.cursos;
                  return (
                    <div
                      key={a.id}
                      className="rounded-[var(--radius-md)] border border-border p-3 space-y-1"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {curso ? (
                          <Link
                            href={`/admin/cursos/${curso.id}`}
                            className="text-primary hover:underline"
                          >
                            {curso.nombre}
                          </Link>
                        ) : (
                          "Curso eliminado"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFechaCorta(a.created_at)}
                        {a.nota ? ` · ${a.nota}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Historial de postulaciones */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="font-semibold text-foreground">
            Historial de postulaciones
          </h2>

          {postulaciones.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no se postuló a ninguna oferta.
            </p>
          ) : (
            <>
              {/* Tabla md+ */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Oferta
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Empresa
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Fecha
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Estado
                      </th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {postulaciones.map((p) => {
                      const badgeCfg = BADGE_CONFIG[p.estado];
                      return (
                        <tr key={p.id}>
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {p.ofertas?.titulo ?? "Oferta eliminada"}
                          </td>
                          <td className="py-3 pr-4 text-foreground">
                            {p.ofertas?.empresa_nombre ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatearFecha(p.created_at)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={badgeCfg.variant}
                              className={badgeCfg.className}
                            >
                              {badgeCfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 w-px whitespace-nowrap">
                            <Link
                              href={`/admin/postulaciones/${p.id}`}
                              className="btn-secundario inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs"
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
              <div className="mt-4 space-y-3 md:hidden">
                {postulaciones.map((p) => {
                  const badgeCfg = BADGE_CONFIG[p.estado];
                  return (
                    <div
                      key={p.id}
                      className="rounded-[var(--radius-md)] border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {p.ofertas?.titulo ?? "Oferta eliminada"}
                        </p>
                        <Badge
                          variant={badgeCfg.variant}
                          className={badgeCfg.className}
                        >
                          {badgeCfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.ofertas?.empresa_nombre ?? "—"} ·{" "}
                        {formatearFecha(p.created_at)}
                      </p>
                      <Link
                        href={`/admin/postulaciones/${p.id}`}
                        className="btn-secundario inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs"
                      >
                        Ver ficha →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

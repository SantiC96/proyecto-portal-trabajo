import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { CursoForm } from "../curso-form";
import { CursoAcciones } from "../curso-acciones";
import { formatFechaCorta } from "@/lib/fechas";
import { AvisoUrl } from "@/components/ui/aviso-url";

export const metadata: Metadata = {
  title: "Detalle del curso | Panel municipal | Portal de Empleo Funes",
};

export default async function CursoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cursoId } = await params;

  const supabase = await createSupabaseServerClient();

  type CursoRow = {
    id: string;
    nombre: string;
    descripcion: string | null;
    link: string | null;
    indicaciones: string | null;
    activo: boolean;
    created_at: string;
  };

  type AsignacionRow = {
    id: string;
    created_at: string;
    nota: string | null;
    postulantes: {
      id: string;
      usuarios: { nombre: string; apellido: string } | null;
    } | null;
  };

  const [cursoRes, asignacionesRes] = await Promise.all([
    supabase
      .from("cursos")
      .select("id, nombre, descripcion, link, indicaciones, activo, created_at")
      .eq("id", cursoId)
      .single(),
    supabase
      .from("asignaciones_curso")
      .select(
        "id, created_at, nota, postulantes!postulante_id(id, usuarios!usuario_id(nombre, apellido))"
      )
      .eq("curso_id", cursoId)
      .order("created_at", { ascending: false }),
  ]);

  if (!cursoRes.data) notFound();

  const curso = cursoRes.data as unknown as CursoRow;
  const asignaciones = (
    asignacionesRes.data ?? []
  ) as unknown as AsignacionRow[];
  const tieneAsignaciones = asignaciones.length > 0;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense>
        <AvisoUrl />
      </Suspense>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <Link href="/admin/cursos" className="hover:text-foreground">
          Cursos
        </Link>
        <span>/</span>
        <span className="text-foreground">{curso.nombre}</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {curso.nombre}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editar */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-foreground">Editar</h2>
          <CursoForm
            modo="editar"
            cursoId={curso.id}
            inicial={{
              nombre: curso.nombre,
              descripcion: curso.descripcion,
              link: curso.link,
              indicaciones: curso.indicaciones,
            }}
          />
        </div>

        {/* Estado y acciones */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Estado</h2>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  curso.activo
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {curso.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          <CursoAcciones
            cursoId={curso.id}
            activo={curso.activo}
            tieneAsignaciones={tieneAsignaciones}
          />

          {tieneAsignaciones && (
            <p className="text-xs text-muted-foreground">
              No se puede eliminar un curso con asignaciones.
            </p>
          )}
        </div>
      </div>

      {/* Postulantes asignados */}
      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">
          Postulantes asignados ({asignaciones.length})
        </h2>

        {asignaciones.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no se asignó este curso a ningún postulante.
          </p>
        ) : (
          <>
            {/* Tabla md+ */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">
                      Postulante
                    </th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">
                      Fecha
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Nota interna
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {asignaciones.map((a) => {
                    const p = a.postulantes;
                    const u = p?.usuarios;
                    const nombre = u
                      ? `${u.nombre} ${u.apellido}`
                      : "Postulante eliminado";
                    return (
                      <tr key={a.id}>
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {p ? (
                            <Link
                              href={`/admin/postulantes/${p.id}`}
                              className="text-primary hover:underline"
                            >
                              {nombre}
                            </Link>
                          ) : (
                            nombre
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatFechaCorta(a.created_at)}
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
                const p = a.postulantes;
                const u = p?.usuarios;
                const nombre = u
                  ? `${u.nombre} ${u.apellido}`
                  : "Postulante eliminado";
                return (
                  <div
                    key={a.id}
                    className="rounded-[var(--radius-md)] border border-border p-3 space-y-1"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {p ? (
                        <Link
                          href={`/admin/postulantes/${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {nombre}
                        </Link>
                      ) : (
                        nombre
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
    </section>
  );
}

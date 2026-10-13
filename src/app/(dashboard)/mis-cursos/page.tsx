import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFechaCorta } from "@/lib/fechas";

export const metadata: Metadata = {
  title: "Mis cursos | Portal de Empleo Funes",
};

type CursoAsignado = {
  asignacion_id: string;
  curso_id: string;
  asignado_en: string;
  nombre: string;
  descripcion: string | null;
  link: string | null;
  indicaciones: string | null;
};

export default async function MisCursosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "postulante") {
    if (usuario?.rol === "empresa") redirect("/empresa");
    if (usuario?.rol === "municipalidad") redirect("/admin");
    redirect("/");
  }

  const { data: rawCursos } = await supabase.rpc("mis_cursos_asignados");
  const cursos = (rawCursos ?? []) as CursoAsignado[];

  // Most recent first
  const cursosOrdenados = [...cursos].sort(
    (a, b) => new Date(b.asignado_en).getTime() - new Date(a.asignado_en).getTime()
  );

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis cursos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ante cualquier duda, comunicate con la Oficina de Empleo.
          </p>
        </div>

        {cursosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                No tenés cursos asignados
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando la Oficina de Empleo te asigne uno, aparecerá acá.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {cursosOrdenados.map((curso) => (
              <article
                key={curso.asignacion_id}
                className="group relative rounded-xl border border-border bg-white p-4 shadow-xs transition hover:border-primary/40 hover:shadow-md sm:p-5"
              >
                {/* Stretched link — makes the whole card clickable */}
                <Link
                  href={`/mis-cursos/${curso.asignacion_id}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
                  aria-label={`Ver detalles de ${curso.nombre}`}
                />

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary underline-offset-2 group-hover:underline">
                      {curso.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Asignado el {formatFechaCorta(curso.asignado_en)}
                    </p>
                  </div>
                </div>

                {curso.descripcion && (
                  <p className="mt-3 line-clamp-3 text-sm text-foreground">
                    {curso.descripcion}
                  </p>
                )}

                {curso.link && (
                  <div className="mt-3">
                    <a
                      href={curso.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      Ir al curso
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

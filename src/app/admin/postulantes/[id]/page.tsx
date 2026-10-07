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
  const [candidato, postulacionesResult] = await Promise.all([
    obtenerCandidato(postulanteId),
    supabase
      .from("postulaciones")
      .select(
        "id, estado, created_at, ofertas!oferta_id(id, titulo, empresa_nombre)"
      )
      .eq("postulante_id", postulanteId)
      .order("created_at", { ascending: false }),
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

  const postulaciones = (postulacionesResult.data ??
    []) as unknown as PostulacionHistorial[];
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
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
        </div>
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

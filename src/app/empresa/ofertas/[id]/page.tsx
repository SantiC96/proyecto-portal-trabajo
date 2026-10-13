import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import {
  DERIVACION_ESTADO_LABEL,
  DERIVACION_ESTADO_STYLE,
  type EstadoDerivacionEmpresa,
} from "@/lib/derivacion-estados";

export const metadata: Metadata = {
  title: "Detalle de oferta | Portal de Empleo Funes",
};

type CandidatoRow = {
  derivacion_id: string;
  postulante_id: string;
  estado_empresa: EstadoDerivacionEmpresa;
  nota_municipalidad: string | null;
  fecha_entrevista: string | null;
  lugar_entrevista: string | null;
  fecha_respuesta: string | null;
  derivacion_created_at: string;
};

type CandidatoDato = {
  nombre: string;
  apellido: string;
};

export default async function OfertaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ofertaId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!empresa) redirect("/empresa");

  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, titulo, estado, empresa_nombre")
    .eq("id", ofertaId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (!oferta) notFound();

  const [derivacionesResult, vacantesResult] = await Promise.all([
    supabase.rpc("derivaciones_de_oferta_empresa", { p_oferta_id: ofertaId }),
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", ofertaId).maybeSingle(),
  ]);

  const derivaciones = ((derivacionesResult.data ?? []) as CandidatoRow[]);
  const vacantes = (vacantesResult.data?.cantidad as number | null) ?? null;
  const contratados = derivaciones.filter((d) => d.estado_empresa === "contratado").length;

  const nombresMap: Record<string, CandidatoDato> = {};
  if (derivaciones.length > 0) {
    const uniquePostulanteIds = [
      ...new Set(derivaciones.map((d) => d.postulante_id)),
    ];
    const nombreResults = await Promise.all(
      uniquePostulanteIds.map((pid) =>
        supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
      )
    );
    uniquePostulanteIds.forEach((pid, i) => {
      const row = (nombreResults[i].data as CandidatoDato[] | null)?.[0];
      if (row) nombresMap[pid] = row;
    });
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/empresa/ofertas" className="hover:text-foreground">
          Mis ofertas
        </Link>
        <span>/</span>
        <span className="text-foreground">{oferta.titulo}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/empresa/ofertas"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:bg-surface-tinted hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {oferta.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{oferta.empresa_nombre}</p>
        </div>
      </div>

      {/* Candidatos derivados */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Candidatos derivados
            </h2>
          </div>
          {vacantes !== null && (
            <span className="text-sm text-muted-foreground">
              {contratados} de {vacantes} {vacantes === 1 ? "vacante cubierta" : "vacantes cubiertas"}
            </span>
          )}
        </div>

        {derivaciones.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Todavía no hay candidatos derivados
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                La Oficina de Empleo te enviará perfiles cuando los tenga disponibles.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {derivaciones.map((d) => {
              const candidato = nombresMap[d.postulante_id];
              const nombre = candidato
                ? `${candidato.nombre} ${candidato.apellido}`
                : "Candidato";
              const estadoLabel =
                DERIVACION_ESTADO_LABEL[d.estado_empresa] ?? d.estado_empresa;
              const estadoStyle =
                DERIVACION_ESTADO_STYLE[d.estado_empresa] ?? "bg-gray-100 text-gray-600";

              return (
                <li
                  key={d.derivacion_id}
                  className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{nombre}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyle}`}
                      >
                        {estadoLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Derivado el {formatFecha(d.derivacion_created_at)}
                    </p>
                    {d.fecha_entrevista && (
                      <p className="text-xs text-muted-foreground">
                        Entrevista: {formatFechaHora(d.fecha_entrevista)}
                        {d.lugar_entrevista ? ` · ${d.lugar_entrevista}` : ""}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/empresa/ofertas/${ofertaId}/candidatos/${d.derivacion_id}`}
                    className="btn-secundario inline-flex h-8 shrink-0 items-center px-3 text-xs font-medium"
                  >
                    Ver ficha
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

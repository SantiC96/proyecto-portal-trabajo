import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, FileText, ExternalLink, Briefcase, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { formatFecha } from "@/lib/fechas";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_STYLE } from "@/lib/derivacion-estados";
import { esUuid } from "@/lib/validaciones";
import type {
  FilaCandidatoParaEmpresaCompleto,
  FilaDerivacionDePostulanteEmpresa,
} from "@/types/db";
import { NotaGuardadoEditor } from "@/app/empresa/(panel)/candidatos-guardados/_components/nota-editor";
import { FotoPrivada } from "@/components/ui/foto-privada";
import { InformacionLaboralResumen } from "@/components/postulantes/informacion-laboral-resumen";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Perfil de candidato | Portal de Empleo Funes",
};

export default async function PerfilCandidatoPage({
  params,
}: {
  params: Promise<{ postulanteId: string }>;
}) {
  const { postulanteId } = await params;
  await requerirEmpresaPagina("/empresa");
  if (!esUuid(postulanteId)) notFound();
  const supabase = await createSupabaseServerClient();

  const [candidatoResult, historialResult, guardadoResult] = await Promise.all([
    supabase.rpc("candidato_para_empresa_completo", { p_postulante_id: postulanteId }),
    supabase.rpc("derivaciones_de_postulante_empresa", { p_postulante_id: postulanteId }),
    supabase
      .from("candidatos_guardados")
      .select("id, nota")
      .eq("postulante_id", postulanteId)
      .maybeSingle(),
  ]);

  const candidato: FilaCandidatoParaEmpresaCompleto | null = candidatoResult.data?.[0] ?? null;
  if (!candidato) notFound();

  const historial: FilaDerivacionDePostulanteEmpresa[] = historialResult.data ?? [];
  const guardado = guardadoResult.data;

  // Signed URL for CV (10 min)
  let cvUrl: string | null = null;
  if (candidato.cv_ruta) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(candidato.cv_ruta, 600);
    cvUrl = signed?.signedUrl ?? null;
  }

  // Signed URL for avatar (5 min)
  let fotoUrl: string | null = null;
  if (candidato.foto_ruta) {
    const { data: signed } = await supabase.storage
      .from("avatares")
      .createSignedUrl(candidato.foto_ruta, 300);
    fotoUrl = signed?.signedUrl ?? null;
  }

  const nombreCompleto = `${candidato.nombre} ${candidato.apellido}`;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href="/empresa/candidatos-guardados">Volver a candidatos guardados</BotonVolver>

      {/* Cabecera */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border">
              <FotoPrivada
                src={fotoUrl}
                alt={`Foto de ${nombreCompleto}`}
                width={56}
                height={56}
                preload
                className="h-full w-full object-cover"
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-surface-tinted text-muted-foreground">
                    <User className="h-7 w-7" />
                  </div>
                }
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface-tinted text-muted-foreground">
              <User className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {nombreCompleto}
          </h1>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Datos de contacto */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
          <h2 className="font-semibold text-foreground">Datos de contacto</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{candidato.email}</dd>
              </div>
            </div>
            {candidato.telefono && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">Teléfono</dt>
                  <dd className="font-medium text-foreground">{candidato.telefono}</dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Currículum</dt>
                <dd>
                  {cvUrl ? (
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Ver / descargar CV
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Sin CV cargado</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Rubros de interés */}
        {candidato.rubros_interes.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-foreground">Rubros de interés</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidato.rubros_interes.map((rubro) => (
                <span
                  key={rubro}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {rubro}
                </span>
              ))}
            </div>
          </div>
        )}

        <InformacionLaboralResumen info={candidato} className="bg-white shadow-xs" />

        {/* Historial en esta empresa */}
        {historial.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Historial en tu empresa</h2>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {historial.map((h) => {
                const estadoLabel = DERIVACION_ESTADO_LABEL[h.estado_empresa] ?? h.estado_empresa;
                const estadoStyle = DERIVACION_ESTADO_STYLE[h.estado_empresa] ?? "bg-gray-100 text-gray-600";
                return (
                  <li key={h.derivacion_id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{h.oferta_titulo}</p>
                      {h.fecha_respuesta && (
                        <p className="text-xs text-muted-foreground">
                          {formatFecha(h.fecha_respuesta)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyle}`}
                    >
                      {estadoLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Nota privada editable */}
        {guardado && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
            <h2 className="mb-4 font-semibold text-foreground">Tu nota privada</h2>
            <NotaGuardadoEditor guardadoId={guardado.id} notaInicial={guardado.nota} />
          </div>
        )}
      </div>
    </section>
  );
}

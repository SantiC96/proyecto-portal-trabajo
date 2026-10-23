import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, FileText, ExternalLink, Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { formatFecha } from "@/lib/fechas";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import { Badge } from "@/components/ui/badge";
import { esUuid } from "@/lib/validaciones";
import { logError } from "@/lib/logger";
import type {
  FilaCandidatoParaEmpresaCompleto,
  FilaCvParaEmpresa,
  FilaDerivacionDePostulanteEmpresa,
} from "@/types/db";
import { NotaGuardadoEditor } from "@/app/empresa/(panel)/candidatos-guardados/_components/nota-editor";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
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

  const [candidatoResult, cvResult, historialResult, guardadoResult, fotos] = await Promise.all([
    supabase.rpc("candidato_para_empresa_completo", { p_postulante_id: postulanteId }),
    // El CV de su derivación más reciente a esta empresa (migration_054).
    supabase.rpc("cv_de_candidato_empresa", { p_postulante_id: postulanteId }),
    supabase.rpc("derivaciones_de_postulante_empresa", { p_postulante_id: postulanteId }),
    supabase
      .from("candidatos_guardados")
      .select("id, nota")
      .eq("postulante_id", postulanteId)
      .maybeSingle(),
    fotosDeCandidatosEmpresa([postulanteId]),
  ]);

  const candidato: FilaCandidatoParaEmpresaCompleto | null = candidatoResult.data?.[0] ?? null;
  if (!candidato) notFound();

  const historial: FilaDerivacionDePostulanteEmpresa[] = historialResult.data ?? [];
  const guardado = guardadoResult.data;
  if (cvResult.error) logError("empresa_perfil_candidato_cv", cvResult.error, { postulanteId });
  const cv: FilaCvParaEmpresa | null = cvResult.data?.[0] ?? null;

  // Signed URL for CV (10 min)
  let cvUrl: string | null = null;
  if (cv) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(cv.ruta, 600);
    cvUrl = signed?.signedUrl ?? null;
  }

  const foto = fotos.get(postulanteId);
  const nombreCompleto = `${candidato.nombre} ${candidato.apellido}`;

  return (
    <section className="contenido-lectura-ancho">
      <BotonVolver href="/empresa/candidatos-guardados" />

      <h1 className="mt-4 text-xl font-bold tracking-tight break-words text-foreground sm:text-2xl">
        {nombreCompleto}
      </h1>

      {/* Dos columnas como la ficha del candidato derivado. En una sola
          columna, primero la foto y el contacto. */}
      <div className="@container mt-8">
        <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_400px] @4xl:items-start">
          {/* Datos personales e información laboral */}
          <div className="flex min-w-0 flex-col gap-6">
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

            {historial.length > 0 && (
              <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Historial en tu empresa</h2>
                </div>
                <ul className="mt-4 divide-y divide-border">
                  {historial.map((h) => {
                    const estadoLabel = DERIVACION_ESTADO_LABEL[h.estado_empresa] ?? h.estado_empresa;
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
                        <Badge tono={DERIVACION_ESTADO_TONO[h.estado_empresa] ?? "neutral"} estado>
                          {estadoLabel}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Foto, contacto, CV y nota privada */}
          <div className="order-first flex min-w-0 flex-col gap-6 @4xl:order-none">
            <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
              <AvatarAjustado
                src={foto?.url}
                ajuste={foto?.ajuste}
                alt=""
                size="ficha"
                iniciales={inicialesDePersona(candidato.nombre, candidato.apellido)}
              />
              <h2 className="mt-5 font-semibold text-foreground">Datos de contacto</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="break-all font-medium text-foreground">{candidato.email}</dd>
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
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Currículum</dt>
                    {cv && cvUrl && (
                      <>
                        <dd className="break-all font-medium text-foreground">{cv.nombre_original}</dd>
                        <dd className="text-xs text-muted-foreground">
                          Subido el {formatFecha(cv.subido_en)}
                        </dd>
                      </>
                    )}
                    <dd className={cv && cvUrl ? "mt-1" : undefined}>
                      {cv && cvUrl ? (
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
                        <span className="text-muted-foreground">Sin CV disponible</span>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {guardado && (
              <div className="rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-xs">
                <h2 className="mb-4 font-semibold text-foreground">Tu nota privada</h2>
                <NotaGuardadoEditor guardadoId={guardado.id} notaInicial={guardado.nota} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

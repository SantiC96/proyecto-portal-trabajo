import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { DatosClave } from "@/components/ui/datos-clave";
import { Cita } from "@/components/ui/cita";
import { FilaArchivo } from "@/components/ui/fila-archivo";
import type {
  FilaCandidatoParaEmpresa,
  FilaCvParaEmpresa,
  FilaDerivacionDeOfertaEmpresa,
} from "@/types/db";
import { InformacionLaboralResumen } from "@/components/postulantes/informacion-laboral-resumen";
import { inicialesDePersona } from "@/lib/iniciales";
import { AccionesDerivacion } from "./_components/acciones-derivacion";
import { BookmarkBtn } from "./_components/bookmark-btn";
import { BotonVolver } from "@/components/ui/boton-volver";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Ficha de candidato | Portal de Empleo Funes",
};

const LINK_DATO =
  "font-semibold break-all text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-[var(--sombra-foco)] focus-visible:outline-none";

export default async function CandidatoFichaPage({
  params,
}: {
  params: Promise<{ id: string; derivacionId: string }>;
}) {
  const { id: ofertaId, derivacionId } = await params;
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();

  // Verify the offer belongs to this empresa
  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, titulo")
    .eq("id", ofertaId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!oferta) notFound();

  // Get all derivaciones for this offer and find the one we need
  const { data: derivacionesRaw } = await supabase.rpc(
    "derivaciones_de_oferta_empresa",
    { p_oferta_id: ofertaId }
  );

  const derivaciones: FilaDerivacionDeOfertaEmpresa[] = derivacionesRaw ?? [];
  const derivacion = derivaciones.find(
    (d) => d.derivacion_id === derivacionId
  );
  if (!derivacion) notFound();

  // Get candidate data and saved status in parallel
  const [candidatoResult, cvResult, guardadoResult, vacantesResult, contratadosResult, fotos] = await Promise.all([
    supabase.rpc("candidato_para_empresa", {
      p_postulante_id: derivacion.postulante_id,
    }),
    // El CV elegido en esta postulación, o el más reciente si es anterior a
    // poder elegirlo (migration_054).
    supabase.rpc("cv_de_derivacion_empresa", { p_derivacion_id: derivacionId }),
    supabase
      .from("candidatos_guardados")
      .select("id, nota, oferta_origen_id")
      .eq("postulante_id", derivacion.postulante_id)
      .maybeSingle(),
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", ofertaId).maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: ofertaId }),
    fotosDeCandidatosEmpresa([derivacion.postulante_id]),
  ]);

  const candidato: FilaCandidatoParaEmpresa | null = candidatoResult.data?.[0] ?? null;
  const guardado = guardadoResult.data;
  if (cvResult.error) logError("empresa_candidato_cv", cvResult.error, { derivacionId });
  const cv: FilaCvParaEmpresa | null = cvResult.data?.[0] ?? null;

  // Solo informativo: el límite lo hace cumplir derivaciones_limite_vacantes (040).
  if (contratadosResult.error) logError("empresa_candidato_contratados", contratadosResult.error);
  const vacantes = vacantesResult.data?.cantidad ?? null;
  const vacantesCubiertas =
    vacantes !== null && contratadosResult.data != null && contratadosResult.data >= vacantes;

  // URL firmada del CV (10 min). La política del bucket solo deja abrir el
  // CV de esta postulación (empresa_puede_ver_cv, migration_054).
  let cvUrl: string | null = null;
  if (cv) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(cv.ruta, 600);
    cvUrl = signed?.signedUrl ?? null;
  }

  const nombre = candidato ? `${candidato.nombre} ${candidato.apellido}` : "Candidato";
  const foto = fotos.get(derivacion.postulante_id);
  const estadoLabel =
    DERIVACION_ESTADO_LABEL[derivacion.estado_empresa] ?? derivacion.estado_empresa;
  const estadoTono = DERIVACION_ESTADO_TONO[derivacion.estado_empresa] ?? "neutral";
  // En escritorio, Gestión y la columna de la izquierda terminan a la misma
  // altura (DetalleConLateral). En curso, Gestión llega hasta la última tarjeta
  // de la izquierda. Terminado (seleccionado, no seleccionado, se retiró, oferta
  // retirada), Gestión es un mensaje corto: queda a la par del contacto y el
  // resto va debajo, a todo el ancho. "Ver perfil completo" siempre va debajo.
  // En el celular, Gestión al final: el orden de siempre.
  const procesoTerminado =
    derivacion.estado_empresa !== "pendiente" && derivacion.estado_empresa !== "en_proceso";

  const contacto = (
    <Tarjeta titulo="Contacto">
      {candidato ? (
        <DatosClave
          datos={[
            {
              etiqueta: "Email",
              valor: (
                <a href={`mailto:${candidato.email}`} className={LINK_DATO}>
                  {candidato.email}
                </a>
              ),
            },
            {
              etiqueta: "Teléfono",
              valor: candidato.telefono ? (
                <a href={`tel:${candidato.telefono.replace(/[^\d+]/g, "")}`} className={LINK_DATO}>
                  {candidato.telefono}
                </a>
              ) : (
                <span className="text-muted-foreground">Sin informar</span>
              ),
            },
          ]}
        />
      ) : (
        <p className="text-[15px] text-muted-foreground">Datos no disponibles.</p>
      )}
    </Tarjeta>
  );

  const demasTarjetas = (
    <>
      <Tarjeta titulo="CV con el que se postuló">
        {cv ? (
          <FilaArchivo
            nombre={cv.nombre_original}
            detalle={`Cargado el ${formatFecha(cv.subido_en)}`}
            url={cvUrl}
            textoBoton="Ver CV"
          />
        ) : (
          <p className="text-[15px] text-muted-foreground">Sin CV disponible</p>
        )}
      </Tarjeta>

      {derivacion.nota_municipalidad && (
        <Tarjeta titulo="Nota de la Oficina de Empleo">
          <Cita
            firma={`Oficina de Empleo · ${formatFecha(derivacion.derivacion_created_at)}`}
          >
            {derivacion.nota_municipalidad}
          </Cita>
        </Tarjeta>
      )}

      {candidato && <InformacionLaboralResumen info={candidato} className="bg-surface" />}

      {/* Nota del candidato guardado */}
      {guardado?.nota && (
        <Tarjeta titulo="Tu nota privada">
          <p className="text-[15px] whitespace-pre-line break-words text-texto-parrafo">
            {guardado.nota}
          </p>
        </Tarjeta>
      )}
    </>
  );

  const gestion = (
    <section
      aria-labelledby="gestion-titulo"
      className="tarjeta p-5 sm:p-6"
    >
      <h2 id="gestion-titulo" className="mb-4 text-xl font-extrabold text-heading">
        Gestión
      </h2>
      <AccionesDerivacion
        derivacionId={derivacionId}
        ofertaId={ofertaId}
        estado={derivacion.estado_empresa}
        fechaEntrevista={derivacion.fecha_entrevista}
        lugarEntrevista={derivacion.lugar_entrevista}
        vacantesCubiertas={vacantesCubiertas}
      />
    </section>
  );

  const verPerfil = (
    <Link
      href={`/empresa/candidatos/${derivacion.postulante_id}`}
      className="btn-neutro w-full sm:w-fit"
    >
      <User aria-hidden="true" />
      Ver perfil completo
    </Link>
  );

  return (
    <section className="w-full">
      <BotonVolver href={`/empresa/ofertas/${ofertaId}`} destacado />

      {/* Cabecera */}
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <AvatarAjustado
            src={foto?.url}
            ajuste={foto?.ajuste}
            alt=""
            size="ficha"
            iniciales={candidato ? inicialesDePersona(candidato.nombre, candidato.apellido) : undefined}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words text-heading sm:text-[32px]">
                {nombre}
              </h1>
              <Badge tono={estadoTono} estado>
                {estadoLabel}
              </Badge>
            </div>
            <p className="mt-1.5 text-base break-words text-muted-foreground">
              Candidato para {oferta.titulo} · derivado el{" "}
              {formatFecha(derivacion.derivacion_created_at)}
            </p>
            {derivacion.fecha_respuesta && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Respuesta: {formatFechaHora(derivacion.fecha_respuesta)}
              </p>
            )}
          </div>
        </div>
        <BookmarkBtn
          postulanteId={derivacion.postulante_id}
          ofertaOrigenId={ofertaId}
          guardadoId={guardado?.id ?? null}
          className="w-full shrink-0 sm:w-auto"
        />
      </header>

      <DetalleConLateral
        className="mt-8"
        lateralEnCelular="al-final"
        principal={
          <>
            {contacto}
            {!procesoTerminado && demasTarjetas}
          </>
        }
        lateral={gestion}
        debajo={
          <>
            {procesoTerminado && demasTarjetas}
            {verPerfil}
          </>
        }
      />
    </section>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="tarjeta p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-extrabold text-heading">{titulo}</h2>
      {children}
    </section>
  );
}

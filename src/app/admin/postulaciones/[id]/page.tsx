import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { obtenerCandidato, obtenerCvDePostulacion } from "@/lib/admin/candidato";
import { BadgeProcedencia } from "@/components/postulantes/badge-procedencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import {
  BADGE_ESTADO_VISIBLE,
  estadoVisiblePostulacion,
} from "@/lib/admin/postulacion-estados";
import {
  ESTADO_OFERTA_EMPRESA_LABEL,
  ESTADO_OFERTA_EMPRESA_TONO,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { FichaAcciones } from "./ficha-acciones";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { logError } from "@/lib/logger";
import { aEstadoCursos, avisoCursoAlDerivar } from "@/lib/cursos";
import { requerirRolPagina } from "@/lib/auth";
import { preEntrevistaYaPaso } from "@/lib/pre-entrevistas";
import { PreEntrevistaSeccion } from "./pre-entrevista-seccion";
import { MarcarFichaAbierta } from "./marcar-ficha-abierta";
import { BotonVolver } from "@/components/ui/boton-volver";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { DatosClave } from "@/components/ui/datos-clave";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { FilaArchivo } from "@/components/ui/fila-archivo";
import { Franja } from "@/components/ui/franja";
import { LineaDeTiempo, type EventoLinea } from "@/components/ui/linea-de-tiempo";
import { InicialesEmpresa } from "@/components/ofertas/iniciales-empresa";
import { inicialesDePersona } from "@/lib/iniciales";
import { textoTamanoArchivo } from "@/lib/archivos";

export const metadata: Metadata = {
  title: "Ficha | Postulaciones | Panel municipal | Portal de Empleo Funes",
};


export default async function PostulacionFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const { id: postulacionId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select(
      `
      id,
      estado,
      created_at,
      updated_at,
      retirada_en,
      nota_oficina,
      revisado_por,
      postulante_id,
      oferta_id,
      cv_archivo_id,
      origen,
      postulantes!postulante_id(id, usuario_id),
      ofertas!oferta_id(id, titulo, empresa_nombre, modalidad, jornada, estado, vence_en, contenido_editado_en, oferta_categorias(categorias(nombre)))
    `
    )
    .eq("id", postulacionId)
    .single();

  if (!postulacion) notFound();

  const postulanteId = postulacion.postulantes?.id ?? null;
  const oferta = postulacion.ofertas;

  const puedeDerivarse =
    postulacion.estado === "recibida" || postulacion.estado === "en_revision";
  // Una retirada que estaba derivada conserva su derivación (migration_053).
  const tieneDerivacion =
    postulacion.estado === "derivada" || postulacion.estado === "retirada_postulante";

  const [candidato, derivacionResult, revisorResult, estadoCursosResult, preEntrevistaResult] = await Promise.all([
    postulanteId ? obtenerCandidato(postulanteId) : Promise.resolve(null),
    tieneDerivacion
      ? supabase
          .from("derivaciones")
          .select(
            "id, nota_municipalidad, created_at, updated_at, estado_empresa, fecha_entrevista, modalidad_entrevista, lugar_entrevista, link_entrevista, fecha_respuesta, nota_empresa"
          )
          .eq("postulacion_id", postulacion.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    postulacion.revisado_por
      ? supabase
          .from("usuarios")
          .select("nombre, apellido")
          .eq("id", postulacion.revisado_por)
          .single()
      : Promise.resolve({ data: null }),
    postulanteId && puedeDerivarse
      ? supabase.rpc("estado_cursos_postulantes", { p_postulante_ids: [postulanteId] })
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("pre_entrevistas")
      .select("id, estado, fecha_hora, modalidad, lugar, link, nota_oficina, updated_at")
      .eq("postulacion_id", postulacion.id)
      .maybeSingle(),
  ]);

  if (preEntrevistaResult.error)
    logError("ficha_pre_entrevista", preEntrevistaResult.error, { postulacionId });
  const preEntrevista = preEntrevistaResult.data;
  const preEntrevistaFechaPasada = preEntrevista
    ? preEntrevistaYaPaso(preEntrevista.fecha_hora)
    : false;

  if (estadoCursosResult.error)
    logError("estado_cursos_postulantes", estadoCursosResult.error, { postulacionId });
  const filaEstadoCursos = estadoCursosResult.data?.[0];
  const avisoCurso = avisoCursoAlDerivar(
    filaEstadoCursos ? aEstadoCursos(filaEstadoCursos) : null
  );

  const derivacion = derivacionResult.data;
  const revisor = revisorResult.data;
  const cvPostulacion = candidato
    ? await obtenerCvDePostulacion(postulacion.cv_archivo_id, candidato.cvs)
    : null;

  const estadoVisible = estadoVisiblePostulacion(
    postulacion.estado,
    derivacion?.estado_empresa
  );
  const badge = BADGE_ESTADO_VISIBLE[estadoVisible];
  // fecha_respuesta la fija el trigger de derivaciones al llegar a un estado
  // final; updated_at cubre filas viejas que no la tengan.
  const fechaContratacion =
    estadoVisible === "contratado" && derivacion
      ? derivacion.fecha_respuesta ?? derivacion.updated_at
      : null;

  const nombre = candidato
    ? `${candidato.usuario.nombre} ${candidato.usuario.apellido}`
    : "Candidato desconocido";
  const ofertaModificada =
    oferta?.contenido_editado_en != null &&
    oferta.contenido_editado_en > postulacion.created_at;
  const estadoOferta: EstadoOfertaEmpresa | null = oferta
    ? estadoVencimiento(oferta.estado, oferta.vence_en).vencida
      ? "vencida"
      : oferta.estado
    : null;
  const rubrosOferta = (oferta?.oferta_categorias ?? [])
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));

  // Los mismos datos que mostraba el historial: recepción, revisión, retiro y
  // última actualización. Sin eventos que la ficha no registra.
  const eventos: EventoLinea[] = [
    {
      clave: "recibida",
      titulo: "Postulación recibida",
      detalle: formatFechaHora(postulacion.created_at),
    },
  ];
  if (postulacion.revisado_por) {
    eventos.push({
      clave: "revisada",
      titulo: "Revisada por la Oficina de Empleo",
      detalle: revisor ? `Por ${revisor.nombre} ${revisor.apellido}` : "Por un usuario eliminado",
    });
  }
  if (postulacion.retirada_en) {
    eventos.push({
      clave: "retirada",
      titulo: "Retirada por el postulante",
      detalle: formatFechaHora(postulacion.retirada_en),
    });
  }
  if (postulacion.updated_at && postulacion.updated_at !== postulacion.created_at) {
    eventos.push({
      clave: "actualizada",
      titulo: "Última actualización",
      detalle: formatFechaHora(postulacion.updated_at),
    });
  }

  const notaCv = !cvPostulacion
    ? undefined
    : !cvPostulacion.elegido
      ? "Esta postulación es anterior a la elección de CV: se muestra el más reciente del perfil."
      : cvPostulacion.eliminado
        ? "El postulante lo eliminó después de su perfil."
        : undefined;

  const tituloDecision =
    postulacion.estado === "derivada"
      ? "Derivación a la empresa"
      : postulacion.estado === "retirada_postulante"
        ? "Postulación retirada"
        : puedeDerivarse || postulacion.estado === "rechazada_municipalidad"
          ? "Decisión"
          : null;

  const tarjetaCandidato = (
    <section key="candidato" aria-labelledby="candidato-titulo" className="tarjeta flex flex-col gap-5 p-5 sm:p-6">
      {candidato ? (
        <>
          <div className="flex min-w-0 items-center gap-4">
            <AvatarAjustado
              src={candidato.avatar.url}
              alt=""
              ajuste={candidato.avatar.ajuste}
              iniciales={inicialesDePersona(candidato.usuario.nombre, candidato.usuario.apellido)}
              size="ficha"
            />
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <h2 id="candidato-titulo" className="text-xl leading-tight font-extrabold break-words text-heading">
                {nombre}
              </h2>
              <BadgeProcedencia
                nivel={candidato.nivel}
                localidad={candidato.postulante.localidad}
                comprobante={candidato.comprobante?.estado ?? null}
              />
            </div>
          </div>

          <DatosClave
            datos={[
              {
                etiqueta: "DNI",
                valor: <span className="tabular-nums">{candidato.postulante.dni ?? "—"}</span>,
              },
              { etiqueta: "Teléfono", valor: candidato.usuario.telefono || "—" },
              {
                etiqueta: "Email",
                valor: candidato.email ? <span className="break-all">{candidato.email}</span> : "—",
              },
              { etiqueta: "Domicilio", valor: candidato.postulante.domicilio || "—" },
              {
                etiqueta: "Rubros de interés",
                valor:
                  candidato.categorias.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {candidato.categorias.map((c) => (
                        <EtiquetaRubro key={c.id}>{c.nombre}</EtiquetaRubro>
                      ))}
                    </span>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />

          <div className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-bold text-control-foreground">
              CV elegido para esta postulación
            </h3>
            {cvPostulacion ? (
              <FilaArchivo
                nombre={cvPostulacion.cv.nombreOriginal}
                detalle={`${
                  cvPostulacion.cv.tamano > 0
                    ? `${textoTamanoArchivo(cvPostulacion.cv.tamano)} · `
                    : ""
                }Cargado el ${formatFecha(cvPostulacion.cv.subidoEn)}`}
                nota={notaCv}
                url={cvPostulacion.cv.url}
                textoBoton="Ver CV"
              />
            ) : (
              <p className="text-[15px] text-muted-foreground">
                El candidato retiró o eliminó su CV.
              </p>
            )}
          </div>

          {postulanteId && (
            <Link
              href={`/admin/postulantes/${postulanteId}`}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              Ver ficha completa del postulante
              <ArrowRight aria-hidden="true" className="size-[18px]" />
            </Link>
          )}
        </>
      ) : (
        <p id="candidato-titulo" className="text-[15px] text-muted-foreground">
          Candidato no encontrado.
        </p>
      )}
    </section>
  );

  const tarjetaOferta = (
    <section key="oferta" aria-labelledby="oferta-titulo" className="tarjeta flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="oferta-titulo" className="text-xl font-extrabold text-heading">
          Oferta
        </h2>
        {estadoOferta && (
          <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[estadoOferta] ?? "neutral"} estado>
            {ESTADO_OFERTA_EMPRESA_LABEL[estadoOferta] ?? estadoOferta}
          </Badge>
        )}
      </div>
      {oferta ? (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <InicialesEmpresa empresa={oferta.empresa_nombre} tamano={44} />
            <div className="min-w-0">
              <p className="text-base leading-snug font-bold break-words text-heading">
                {oferta.titulo}
              </p>
              <p className="text-sm break-words text-texto-bajada">{oferta.empresa_nombre}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rubrosOferta.map((r) => (
              <EtiquetaRubro key={r} verde>
                {r}
              </EtiquetaRubro>
            ))}
            <EtiquetaRubro>{oferta.modalidad}</EtiquetaRubro>
            <EtiquetaRubro>{oferta.jornada}</EtiquetaRubro>
          </div>
          {ofertaModificada && oferta.contenido_editado_en && (
            <Franja tono="aviso" titulo="Modificada tras la postulación:">
              la empresa cambió la oferta el {formatFecha(oferta.contenido_editado_en)}.
            </Franja>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-sm text-muted-foreground">
              {oferta.vence_en
                ? `${estadoOferta === "vencida" ? "Venció" : "Vence"} el ${formatFecha(oferta.vence_en)}`
                : "Sin fecha de vencimiento"}
            </p>
            <Link
              href={`/ofertas/${oferta.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              Ver oferta
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </Link>
          </div>
        </>
      ) : (
        <p className="text-[15px] text-muted-foreground">La oferta ya no está disponible.</p>
      )}
    </section>
  );

  const tarjetaHistorial = (
    <section key="historial" aria-labelledby="historial-titulo" className="tarjeta p-5 sm:p-6">
      <h2 id="historial-titulo" className="mb-4 text-xl font-extrabold text-heading">
        Historial de estados
      </h2>
      <LineaDeTiempo eventos={eventos} />
    </section>
  );

  // Pre-entrevista, nota interna y decisión.
  const hayLateral = Boolean(puedeDerivarse || preEntrevista || postulacion.nota_oficina || tituloDecision);
  const tarjetasLaterales = (
    <>
      {(puedeDerivarse || preEntrevista) && (
        <PreEntrevistaSeccion
          key={preEntrevista?.updated_at ?? "sin-pre-entrevista"}
          postulacionId={postulacion.id}
          preEntrevista={preEntrevista}
          gestionable={puedeDerivarse}
          fechaPasada={preEntrevistaFechaPasada}
        />
      )}

      {/* La nota interna se carga al no seleccionar la postulación. */}
      {postulacion.nota_oficina && (
        <section aria-labelledby="nota-titulo" className="tarjeta p-5 sm:p-6">
          <h2 id="nota-titulo" className="text-xl font-extrabold text-heading">
            Nota interna
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Solo la ve la Oficina de Empleo.</p>
          <p className="mt-3 text-[15px] leading-[1.5] whitespace-pre-line break-words text-texto-parrafo">
            {postulacion.nota_oficina}
          </p>
        </section>
      )}

      {tituloDecision && (
        <section aria-labelledby="decision-titulo" className="tarjeta p-5 sm:p-6">
          <h2 id="decision-titulo" className="mb-4 text-xl font-extrabold text-heading">
            {tituloDecision}
          </h2>
          <FichaAcciones
            postulacionId={postulacion.id}
            estado={postulacion.estado}
            estadoVisible={estadoVisible}
            empresaNombre={oferta?.empresa_nombre ?? null}
            ofertaEstado={oferta?.estado}
            derivacion={derivacion}
            avisoCurso={avisoCurso}
          />
        </section>
      )}
    </>
  );

  // Las tarjetas de la izquierda que acompañan a la lateral con el mismo alto;
  // el resto va debajo, a todo el ancho. Pendiente: las tres. No seleccionado
  // por la oficina (nota interna y decisión a la derecha): datos y oferta. El
  // resto (derivada, contratado, retirada…): solo los datos del postulante.
  const izquierdaArriba = puedeDerivarse ? 3 : postulacion.estado === "rechazada_municipalidad" ? 2 : 1;
  const tarjetasIzquierda = [tarjetaCandidato, tarjetaOferta, tarjetaHistorial];
  const arriba = tarjetasIzquierda.slice(0, izquierdaArriba);
  const debajo = tarjetasIzquierda.slice(izquierdaArriba);

  return (
    <section className="w-full">
      {postulacion.estado === "recibida" && <MarcarFichaAbierta postulacionId={postulacionId} />}
      <BotonVolver href="/admin/postulaciones" destacado />

      {/* Cabecera */}
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words text-heading sm:text-[32px]">
            Postulación de {nombre}
          </h1>
          <Badge tono={badge.tono} estado>
            {badge.label}
          </Badge>
          {postulacion.origen === "invitacion" && <BadgePorInvitacion />}
        </div>
        <p className="mt-1.5 text-base break-words text-muted-foreground">
          {oferta ? `${oferta.titulo} · ${oferta.empresa_nombre} · ` : ""}
          recibida el {formatFecha(postulacion.created_at)}
        </p>
        {fechaContratacion && (
          <p className="mt-1 text-[15px] text-muted-foreground">
            Contratado por{" "}
            <span className="font-semibold text-foreground">
              {oferta?.empresa_nombre ?? "la empresa"}
            </span>{" "}
            el {formatFecha(fechaContratacion)}
          </p>
        )}
      </header>

      {hayLateral ? (
        <DetalleConLateral
          className="mt-8"
          lateralEnCelular="al-final"
          principal={<>{arriba}</>}
          lateral={tarjetasLaterales}
          debajo={debajo.length > 0 ? <>{debajo}</> : undefined}
        />
      ) : (
        <div className="mt-8 flex flex-col gap-6">{tarjetasIzquierda}</div>
      )}
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ChevronRight,
  ExternalLink,
  History,
  NotebookPen,
  Undo2,
  User,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Badge, BadgeBanda } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { obtenerCandidato, obtenerCvDePostulacion } from "@/lib/admin/candidato";
import { ChipLocalidad } from "@/components/postulantes/badge-procedencia";
import { BadgePorInvitacion } from "@/components/admin/badge-por-invitacion";
import { DatosCandidato } from "@/components/admin/datos-candidato";
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
import { detalleSinVerificar } from "@/lib/procedencia";
import { PreEntrevistaSeccion } from "./pre-entrevista-seccion";
import { MarcarFichaAbierta } from "./marcar-ficha-abierta";
import { ResumenPostulacion } from "./resumen-postulacion";
import { BotonVolver } from "@/components/ui/boton-volver";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { FilaArchivoPerfil } from "@/components/perfil/piezas";
import { BotonVerArchivo } from "@/components/admin/boton-ver-archivo";
import { Franja } from "@/components/ui/franja";
import {
  ICONO_HISTORIAL,
  LineaDeTiempo,
  type EventoLinea,
} from "@/components/ui/linea-de-tiempo";
import { TarjetaDecision, type EstadoDecision } from "@/components/ui/tarjeta-decision";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { InicialesEmpresa } from "@/components/ofertas/iniciales-empresa";
import { inicialesDePersona } from "@/lib/iniciales";
import { textoTamanoArchivo } from "@/lib/archivos";

export const metadata: Metadata = {
  title: "Ficha | Postulaciones | Panel municipal | Portal de Empleo Funes",
};

const TARJETA = "tarjeta tarjeta-panel min-w-0";

const CLASE_LINK =
  "inline-flex min-h-11 w-fit items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]";

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
      ...ICONO_HISTORIAL.enviado,
    },
  ];
  if (postulacion.revisado_por) {
    eventos.push({
      clave: "revisada",
      titulo: "Revisada por la Oficina de Empleo",
      detalle: revisor ? `Por ${revisor.nombre} ${revisor.apellido}` : "Por un usuario eliminado",
      ...ICONO_HISTORIAL.revisado,
    });
  }
  if (postulacion.retirada_en) {
    eventos.push({
      clave: "retirada",
      titulo: "Retirada por el postulante",
      detalle: formatFechaHora(postulacion.retirada_en),
      icono: Undo2,
      claseIcono: "bg-muted-icon",
    });
  }
  if (postulacion.updated_at && postulacion.updated_at !== postulacion.created_at) {
    eventos.push({
      clave: "actualizada",
      titulo: "Última actualización",
      detalle: formatFechaHora(postulacion.updated_at),
      ...ICONO_HISTORIAL.actualizado,
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

  // Filete de la tarjeta Decisión: amarillo mientras se puede derivar; después,
  // el color del resultado.
  const estadoDecision: EstadoDecision = puedeDerivarse
    ? "pendiente"
    : estadoVisible === "contratado"
      ? "aprobada"
      : estadoVisible === "no_seleccionado_empresa" || estadoVisible === "no_seleccionado_oficina"
        ? "rechazada"
        : estadoVisible === "derivada"
          ? "derivada"
          : "cerrada";

  const iniciales = candidato
    ? inicialesDePersona(candidato.usuario.nombre, candidato.usuario.apellido)
    : undefined;
  const resumen = (
    <ResumenPostulacion
      nombre={nombre}
      iniciales={iniciales}
      oferta={oferta?.titulo ?? null}
      empresa={oferta?.empresa_nombre ?? null}
    />
  );

  const tarjetaCandidato = (
    <section key="candidato" aria-labelledby="candidato-titulo" className={`${TARJETA} flex flex-col gap-5`}>
      <TituloBloque id="candidato-titulo" titulo="Postulante" icono={User} />
      {candidato ? (
        <>
          <div className="flex min-w-0 items-center gap-4">
            <AvatarAjustado
              src={candidato.avatar.url}
              alt=""
              ajuste={candidato.avatar.ajuste}
              iniciales={iniciales}
              size="ficha"
            />
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <p className="text-xl leading-tight font-extrabold break-words text-heading">{nombre}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <ChipLocalidad nivel={candidato.nivel} localidad={candidato.postulante.localidad} />
                {candidato.nivel === 2 && (
                  <span className="text-[13px] font-semibold text-sin-comprobante">
                    {detalleSinVerificar(candidato.comprobante?.estado ?? null)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DatosCandidato
            email={candidato.email}
            dni={candidato.postulante.dni}
            domicilio={candidato.postulante.domicilio}
            telefono={candidato.usuario.telefono}
            categorias={candidato.categorias}
          />

          <div className="flex flex-col gap-2">
            <h3 className="text-[13px] leading-[1.4] font-bold text-neutral">
              CV elegido para esta postulación
            </h3>
            {cvPostulacion ? (
              <FilaArchivoPerfil
                nombre={cvPostulacion.cv.nombreOriginal}
                detalle={`${
                  cvPostulacion.cv.tamano > 0 ? `${textoTamanoArchivo(cvPostulacion.cv.tamano)} · ` : ""
                }Cargado el ${formatFecha(cvPostulacion.cv.subidoEn)}`}
                nota={notaCv}
                acciones={<BotonVerArchivo url={cvPostulacion.cv.url} texto="Ver CV" />}
              />
            ) : (
              <p className="text-[15px] text-muted-foreground">
                El candidato retiró o eliminó su CV.
              </p>
            )}
          </div>

          {postulanteId && (
            <Link href={`/admin/postulantes/${postulanteId}`} className={CLASE_LINK}>
              Ver ficha completa del postulante
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </>
      ) : (
        <p className="text-[15px] text-muted-foreground">Candidato no encontrado.</p>
      )}
    </section>
  );

  const tarjetaOferta = (
    <section key="oferta" aria-labelledby="oferta-titulo" className={`${TARJETA} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <TituloBloque id="oferta-titulo" titulo="Oferta" icono={Briefcase} />
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
              <p className="text-base leading-snug font-extrabold break-words text-heading">
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
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground-strong">
              <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-icon" />
              {oferta.vence_en
                ? `${estadoOferta === "vencida" ? "Venció" : "Vence"} el ${formatFecha(oferta.vence_en)}`
                : "Sin fecha de vencimiento"}
            </p>
            <Link
              href={`/ofertas/${oferta.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={CLASE_LINK}
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
    <section key="historial" aria-labelledby="historial-titulo" className={TARJETA}>
      <TituloBloque id="historial-titulo" titulo="Historial de estados" icono={History} />
      <LineaDeTiempo variante="historial" className="mt-5" eventos={eventos} />
    </section>
  );

  const tarjetasIzquierda = [tarjetaCandidato, tarjetaOferta, tarjetaHistorial];

  // Decisión, pre-entrevista y nota interna.
  const hayLateral = Boolean(puedeDerivarse || preEntrevista || postulacion.nota_oficina || tituloDecision);
  const tarjetasLaterales = (
    <>
      {tituloDecision && (
        <TarjetaDecision
          titulo={tituloDecision}
          estado={estadoDecision}
          descripcion={
            puedeDerivarse
              ? "Derivá la postulación si el perfil encaja con la oferta. Antes podés coordinar una pre-entrevista (es opcional)."
              : undefined
          }
        >
          <FichaAcciones
            postulacionId={postulacion.id}
            estado={postulacion.estado}
            estadoVisible={estadoVisible}
            empresaNombre={oferta?.empresa_nombre ?? null}
            ofertaEstado={oferta?.estado}
            derivacion={derivacion}
            avisoCurso={avisoCurso}
            resumen={resumen}
          />
        </TarjetaDecision>
      )}

      {(puedeDerivarse || preEntrevista) && (
        <PreEntrevistaSeccion
          key={preEntrevista?.updated_at ?? "sin-pre-entrevista"}
          postulacionId={postulacion.id}
          preEntrevista={preEntrevista}
          gestionable={puedeDerivarse}
          fechaPasada={preEntrevistaFechaPasada}
          resumen={resumen}
        />
      )}

      {/* La nota interna se carga al no seleccionar la postulación. */}
      {postulacion.nota_oficina && (
        <section aria-labelledby="nota-titulo" className={TARJETA}>
          <TituloBloque
            id="nota-titulo"
            titulo="Nota interna"
            icono={NotebookPen}
            bajada="Solo la ve la Oficina de Empleo."
          />
          <p className="mt-4 text-[15px] leading-[1.5] whitespace-pre-line break-words text-texto-parrafo">
            {postulacion.nota_oficina}
          </p>
        </section>
      )}
    </>
  );

  return (
    <section className="flex w-full flex-col gap-6">
      {postulacion.estado === "recibida" && <MarcarFichaAbierta postulacionId={postulacionId} />}
      <BotonVolver href="/admin/postulaciones" destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo={`Postulación de ${nombre}`}
        junto={
          <>
            <BadgeBanda tono={badge.tono}>{badge.label}</BadgeBanda>
            {postulacion.origen === "invitacion" && <BadgePorInvitacion />}
          </>
        }
        bajada={
          <>
            {oferta ? `${oferta.titulo} · ${oferta.empresa_nombre} · ` : ""}
            recibida el {formatFecha(postulacion.created_at)}
            {fechaContratacion && (
              <span className="mt-1 block">
                Contratado por{" "}
                <span className="font-bold text-primary-foreground">
                  {oferta?.empresa_nombre ?? "la empresa"}
                </span>{" "}
                el {formatFecha(fechaContratacion)}
              </span>
            )}
          </>
        }
      />

      {hayLateral ? (
        <DetalleConLateral
          anchoLateral={380}
          separacion="gap-4"
          separacionColumnas="gap-5"
          lateralEnCelular="al-final"
          principal={<>{tarjetasIzquierda}</>}
          lateral={tarjetasLaterales}
        />
      ) : (
        <div className="flex flex-col gap-4">{tarjetasIzquierda}</div>
      )}
    </section>
  );
}

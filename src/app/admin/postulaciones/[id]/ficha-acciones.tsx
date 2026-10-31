"use client";

import { useState, type ReactNode } from "react";
import { PencilLine, RotateCcw, Send, TriangleAlert, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogResumen,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  marcarEnRevision,
  descartarPostulacion,
  derivarPostulacion,
  corregirEstadoDerivacion,
} from "../actions";
import {
  type EstadoPostulacion,
  type EstadoVisiblePostulacion,
} from "@/lib/admin/postulacion-estados";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import {
  DERIVACION_ESTADO_LABEL,
  DERIVACION_ESTADO_TONO,
  type EstadoDerivacionEmpresa,
} from "@/lib/derivacion-estados";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { esValorEnum, type Enum, type Tabla } from "@/types/db";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Aviso } from "@/components/ui/aviso";
import { Badge } from "@/components/ui/badge";
import { Cita } from "@/components/ui/cita";
import { DatosClave } from "@/components/ui/datos-clave";
import { ResultadoDecision } from "@/components/ui/tarjeta-decision";
import { ModalidadYLugar } from "@/components/entrevistas/cartel-entrevista";

type Props = {
  postulacionId: string;
  estado: EstadoPostulacion;
  /** Estado que combina la postulación con el resultado de la empresa. */
  estadoVisible: EstadoVisiblePostulacion;
  empresaNombre?: string | null;
  ofertaEstado?: Enum<"estado_oferta">;
  derivacion?: Pick<
    Tabla<"derivaciones">,
    | "id"
    | "nota_municipalidad"
    | "created_at"
    | "estado_empresa"
    | "fecha_entrevista"
    | "modalidad_entrevista"
    | "lugar_entrevista"
    | "link_entrevista"
    | "fecha_respuesta"
    | "nota_empresa"
  > | null;
  /** Aviso informativo sobre cursos, se muestra antes de confirmar la derivación. */
  avisoCurso?: string | null;
  /** Resumen de los diálogos: iniciales, nombre y "{oferta} · {empresa}" (ResumenPostulacion). */
  resumen: ReactNode;
};

const ESTADOS_CORREGUIBLES: EstadoDerivacionEmpresa[] = [
  "pendiente",
  "en_proceso",
  "contratado",
  "rechazado",
];

/**
 * Contenido de la tarjeta "Decisión" de la ficha: el resultado si ya está
 * resuelta (ResultadoDecision) y las mismas acciones de siempre para cada
 * estado, con sus diálogos.
 */
export function FichaAcciones({
  postulacionId,
  estado,
  estadoVisible,
  empresaNombre,
  ofertaEstado,
  derivacion,
  avisoCurso,
  resumen,
}: Props) {
  const ofertaEnRevision = ofertaEstado === "pendiente_aprobacion";
  const [abrirDescartar, setAbrirDescartar] = useState(false);
  const [abrirDerivar, setAbrirDerivar] = useState(false);
  const [abrirReconsiderar, setAbrirReconsiderar] = useState(false);
  const [abrirCorregir, setAbrirCorregir] = useState(false);
  const [estadoCorreccion, setEstadoCorreccion] = useState<EstadoDerivacionEmpresa>("pendiente");
  const [notaDescartar, setNotaDescartar] = useState("");
  const [notaDerivar, setNotaDerivar] = useState("");
  const camposCorregir = useErroresCampo<"estado">();
  const { pendiente: isPending, ejecutar } = useAccion();
  const empresa = empresaNombre?.trim() || "la empresa";

  function cerrarTodo() {
    setAbrirDescartar(false);
    setAbrirDerivar(false);
    setAbrirReconsiderar(false);
    setAbrirCorregir(false);
    setNotaDescartar("");
    setNotaDerivar("");
  }

  function handleDescartar() {
    ejecutar(async () => {
      const res = await descartarPostulacion(postulacionId, notaDescartar);
      mostrarAviso(res);
      if (res.ok) cerrarTodo();
    });
  }

  function handleDerivar() {
    ejecutar(async () => {
      const res = await derivarPostulacion(postulacionId, notaDerivar);
      mostrarAviso(res);
      if (res.ok) cerrarTodo();
    });
  }

  function handleReconsiderar() {
    ejecutar(async () => {
      const res = await marcarEnRevision(postulacionId);
      mostrarAviso(res);
      if (res.ok) setAbrirReconsiderar(false);
    });
  }

  function handleCorregir() {
    if (!derivacion) return;
    if (!camposCorregir.validar({ estado: estadoCorreccion })) return;
    ejecutar(async () => {
      const res = await corregirEstadoDerivacion(postulacionId, derivacion.id, estadoCorreccion);
      if (!camposCorregir.tomarDelServidor(res, ["estado"])) mostrarAviso(res);
      if (res.ok) setAbrirCorregir(false);
    });
  }

  // Retirada por el postulante (migration_053): estado final, sin acciones.
  if (estado === "retirada_postulante") {
    return (
      <div className="flex flex-col gap-4">
        <ResultadoDecision
          tono="cerrada"
          detalle={
            derivacion
              ? `Ya estaba derivada a ${empresa}: el proceso con la empresa quedó cerrado.`
              : "El postulante retiró la postulación y ya no se puede derivar ni descartar."
          }
        >
          Retirada por el postulante.
        </ResultadoDecision>
        {derivacion && <DatosDerivacion derivacion={derivacion} />}
      </div>
    );
  }

  // Estado derivada: el resultado de la empresa y la corrección. Con resultado
  // final (contratado o no seleccionado) no se ofrece derivar, rechazar ni
  // reconsiderar; solo corregir el estado si la empresa lo cargó mal.
  if (estado === "derivada") {
    const fechaRespuesta = derivacion?.fecha_respuesta
      ? ` el ${formatFecha(derivacion.fecha_respuesta)}`
      : "";
    return (
      <div className="flex flex-col gap-4">
        {estadoVisible === "contratado" ? (
          <ResultadoDecision tono="aprobada">
            Contratado por {empresa}
            {fechaRespuesta}.
          </ResultadoDecision>
        ) : estadoVisible === "no_seleccionado_empresa" ? (
          <ResultadoDecision tono="rechazada">
            No seleccionado por {empresa}
            {fechaRespuesta}.
          </ResultadoDecision>
        ) : derivacion?.estado_empresa === "oferta_retirada" ? (
          <ResultadoDecision tono="cerrada">
            El proceso quedó cerrado porque la empresa retiró la oferta.
          </ResultadoDecision>
        ) : (
          <ResultadoDecision tono="derivada">Derivada a la empresa.</ResultadoDecision>
        )}

        {derivacion && <DatosDerivacion derivacion={derivacion} />}

        {derivacion && derivacion.estado_empresa !== "oferta_retirada" && (
          <button
            type="button"
            onClick={() => {
              setEstadoCorreccion(derivacion.estado_empresa);
              camposCorregir.limpiarTodos();
              setAbrirCorregir(true);
            }}
            className="btn-secundario w-full"
          >
            Corregir estado de la empresa
          </button>
        )}

        <Dialog
          open={abrirCorregir}
          onOpenChange={(open) => {
            if (!isPending) setAbrirCorregir(open);
          }}
        >
          <DialogContent>
            <DialogHeader icono={PencilLine} tonoIcono="primario">
              <DialogTitle>Corregir estado de la empresa</DialogTitle>
              <DialogDescription>
                Ajustá el estado que registró la empresa para esta derivación.
                Usá esta acción solo para corregir errores.
              </DialogDescription>
            </DialogHeader>
            <DialogResumen>{resumen}</DialogResumen>
            <div className="flex flex-col gap-2">
              <label htmlFor="corregir-estado" className="etiqueta-campo">
                Nuevo estado <Obligatorio />
              </label>
              <Combobox
                id="corregir-estado"
                requerido
                opciones={ESTADOS_CORREGUIBLES.map((e) => ({
                  id: e,
                  nombre: DERIVACION_ESTADO_LABEL[e],
                }))}
                valor={estadoCorreccion}
                onCambiar={(valor) => {
                  if (esValorEnum("estado_empresa", valor)) setEstadoCorreccion(valor);
                  camposCorregir.limpiar("estado");
                }}
                deshabilitado={isPending}
                triggerClassName="campo cursor-pointer"
                {...ariaErrorCampo("corregir-estado", camposCorregir.errores.estado)}
              />
              <ErrorCampo idCampo="corregir-estado" mensaje={camposCorregir.errores.estado} />
            </div>
            <BotonesDialogo
              pendiente={isPending}
              onCancelar={() => setAbrirCorregir(false)}
              onConfirmar={handleCorregir}
              textoConfirmar="Guardar corrección"
              textoPendiente="Guardando…"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {ofertaEnRevision && (
        <Aviso tono="warning">
          La oferta está en revisión: no se puede derivar ni rechazar hasta que se vuelva a aprobar.
        </Aviso>
      )}

      {(estado === "recibida" || estado === "en_revision") && (
        <>
          <button
            type="button"
            onClick={() => setAbrirDerivar(true)}
            disabled={isPending || ofertaEnRevision}
            className="btn-primario w-full"
          >
            <Send aria-hidden="true" />
            Derivar a la empresa
          </button>
          <button
            type="button"
            onClick={() => setAbrirDescartar(true)}
            disabled={isPending || ofertaEnRevision}
            className="btn-peligro-borde w-full"
          >
            No seleccionar
          </button>
        </>
      )}

      {estado === "rechazada_municipalidad" && (
        <>
          <ResultadoDecision tono="rechazada" className="mb-1">
            La oficina no seleccionó esta postulación.
          </ResultadoDecision>
          <button
            type="button"
            onClick={() => setAbrirReconsiderar(true)}
            disabled={isPending}
            className="btn-secundario w-full"
          >
            Reconsiderar
          </button>
        </>
      )}

      <Dialog
        open={abrirDescartar}
        onOpenChange={(open) => {
          if (isPending) return;
          setAbrirDescartar(open);
          if (!open) setNotaDescartar("");
        }}
      >
        <DialogContent>
          <DialogHeader icono={X} tonoIcono="peligro">
            <DialogTitle>No seleccionar candidato</DialogTitle>
            <DialogDescription>
              El postulante va a ver su postulación como{" "}
              <span className="font-semibold text-foreground">«No seleccionada»</span>. Podés
              dejar una nota interna (no la ve el postulante).
            </DialogDescription>
          </DialogHeader>
          <DialogResumen>{resumen}</DialogResumen>
          <CampoNotaDialogo
            id="nota-descartar"
            etiqueta="Nota interna"
            placeholder="¿Por qué no se selecciona a este candidato?"
            valor={notaDescartar}
            onChange={setNotaDescartar}
            deshabilitado={isPending}
          />
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => {
              setAbrirDescartar(false);
              setNotaDescartar("");
            }}
            onConfirmar={handleDescartar}
            textoConfirmar="No seleccionar"
            textoPendiente="Guardando…"
            destructivo
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={abrirDerivar}
        onOpenChange={(open) => {
          if (isPending) return;
          setAbrirDerivar(open);
          if (!open) setNotaDerivar("");
        }}
      >
        <DialogContent>
          <DialogHeader icono={Send} tonoIcono="teal">
            <DialogTitle>Derivar a la empresa</DialogTitle>
            <DialogDescription>La empresa recibirá los datos del candidato.</DialogDescription>
          </DialogHeader>
          <DialogResumen>{resumen}</DialogResumen>
          <Aviso tono="warning" suave icono={TriangleAlert} role="note">
            Esta acción no se puede deshacer.
          </Aviso>
          {avisoCurso && (
            <Aviso tono="warning" role="note">
              {avisoCurso}
            </Aviso>
          )}
          <CampoNotaDialogo
            id="nota-derivar"
            etiqueta="¿Por qué recomendás a este candidato?"
            placeholder="Contá brevemente por qué este perfil encaja con la búsqueda…"
            valor={notaDerivar}
            onChange={setNotaDerivar}
            deshabilitado={isPending}
          />
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => {
              setAbrirDerivar(false);
              setNotaDerivar("");
            }}
            onConfirmar={handleDerivar}
            textoConfirmar="Derivar candidato"
            textoPendiente="Derivando…"
            iconoConfirmar={Send}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={abrirReconsiderar}
        onOpenChange={(open) => {
          if (!isPending) setAbrirReconsiderar(open);
        }}
      >
        <DialogContent>
          <DialogHeader icono={RotateCcw} tonoIcono="primario">
            <DialogTitle>Reconsiderar candidato</DialogTitle>
            <DialogDescription>
              La postulación volverá a{" "}
              <span className="font-semibold text-foreground">En revisión</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogResumen>{resumen}</DialogResumen>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => setAbrirReconsiderar(false)}
            onConfirmar={handleReconsiderar}
            textoConfirmar="Volver a revisión"
            textoPendiente="Guardando…"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Nota opcional de un diálogo, con su contador debajo a la derecha. */
function CampoNotaDialogo({
  id,
  etiqueta,
  placeholder,
  valor,
  onChange,
  deshabilitado,
}: {
  id: string;
  etiqueta: string;
  placeholder: string;
  valor: string;
  onChange: (valor: string) => void;
  deshabilitado: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="etiqueta-campo">
        {etiqueta} <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <Textarea
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={LARGO_MAXIMO.nota}
        className="min-h-24"
        disabled={deshabilitado}
      />
      <ContadorCaracteres
        className="ml-auto"
        actual={valor.length}
        maximo={LARGO_MAXIMO.nota}
      />
    </div>
  );
}

type Derivacion = NonNullable<Props["derivacion"]>;

/** Lo que registró la empresa sobre la derivación, y la nota de la oficina. */
function DatosDerivacion({ derivacion }: { derivacion: Derivacion }) {
  return (
    <>
      <DatosClave
        datos={[
          {
            etiqueta: "Estado de la empresa",
            valor: (
              <Badge tono={DERIVACION_ESTADO_TONO[derivacion.estado_empresa] ?? "neutral"} estado>
                {DERIVACION_ESTADO_LABEL[derivacion.estado_empresa] ?? derivacion.estado_empresa}
              </Badge>
            ),
          },
          { etiqueta: "Derivada el", valor: formatFechaHora(derivacion.created_at) },
          {
            etiqueta: "Entrevista",
            valor: derivacion.fecha_entrevista ? (
              <>
                {formatFechaHora(derivacion.fecha_entrevista)}
                <span className="mt-0.5 block">
                  <ModalidadYLugar
                    datos={{
                      modalidad: derivacion.modalidad_entrevista,
                      lugar: derivacion.lugar_entrevista,
                      link: derivacion.link_entrevista,
                    }}
                  />
                </span>
              </>
            ) : null,
          },
          {
            etiqueta: "Respuesta",
            valor: derivacion.fecha_respuesta ? formatFechaHora(derivacion.fecha_respuesta) : null,
          },
          {
            etiqueta: "Motivo (empresa)",
            valor:
              derivacion.estado_empresa === "rechazado" && derivacion.nota_empresa ? (
                <span className="whitespace-pre-line">{derivacion.nota_empresa}</span>
              ) : null,
          },
        ]}
      />
      {derivacion.nota_municipalidad && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold text-control-foreground">Nota de derivación</h3>
          <Cita>{derivacion.nota_municipalidad}</Cita>
        </div>
      )}
    </>
  );
}

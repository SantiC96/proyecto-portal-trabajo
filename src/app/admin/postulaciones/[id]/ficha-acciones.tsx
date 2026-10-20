"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  type EstadoDerivacionEmpresa,
} from "@/lib/derivacion-estados";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { esValorEnum, type Enum, type Tabla } from "@/types/db";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { cn } from "@/lib/utils";

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
    | "lugar_entrevista"
    | "fecha_respuesta"
    | "nota_empresa"
  > | null;
  /** Aviso informativo sobre cursos, se muestra antes de confirmar la derivación. */
  avisoCurso?: string | null;
};

const ESTADOS_CORREGUIBLES: EstadoDerivacionEmpresa[] = [
  "pendiente",
  "en_proceso",
  "contratado",
  "rechazado",
];

export function FichaAcciones({
  postulacionId,
  estado,
  estadoVisible,
  empresaNombre,
  ofertaEstado,
  derivacion,
  avisoCurso,
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

  // Estado derivada: info + acción de corrección. Con resultado final de la
  // empresa (contratado o no seleccionado) no se ofrece derivar, rechazar ni
  // reconsiderar; solo corregir el estado si la empresa lo cargó mal.
  if (estado === "derivada") {
    const empresa = empresaNombre?.trim() || "la empresa";
    return (
      <div className="space-y-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
          {estadoVisible === "contratado" ? (
            <p className="text-sm font-medium text-emerald-800">
              Contratado por {empresa}
              {derivacion?.fecha_respuesta &&
                ` el ${formatFecha(derivacion.fecha_respuesta)}`}
            </p>
          ) : estadoVisible === "no_seleccionado_empresa" ? (
            <p className="text-sm font-medium text-red-700">
              No seleccionado por {empresa}
              {derivacion?.fecha_respuesta &&
                ` el ${formatFecha(derivacion.fecha_respuesta)}`}
            </p>
          ) : (
            <p className="text-sm font-medium text-primary">Derivada a la empresa</p>
          )}
          {derivacion?.created_at && (
            <p className="mt-1 text-sm text-muted-foreground">
              Derivada el {formatFechaHora(derivacion.created_at)}
            </p>
          )}
          {derivacion?.nota_municipalidad && (
            <p className="mt-2 text-sm text-foreground">
              <span className="font-medium">Nota de derivación: </span>
              {derivacion.nota_municipalidad}
            </p>
          )}
        </div>

        {derivacion?.estado_empresa === "oferta_retirada" && (
          <p className="text-sm text-muted-foreground">
            El proceso quedó cerrado porque la empresa retiró la oferta.
          </p>
        )}

        {derivacion && derivacion.estado_empresa !== "oferta_retirada" && (
          <button
            type="button"
            onClick={() => {
              setEstadoCorreccion(derivacion.estado_empresa);
              camposCorregir.limpiarTodos();
              setAbrirCorregir(true);
            }}
            className="btn-secundario inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium"
          >
            Corregir estado de la empresa
          </button>
        )}

        {/* Dialog: Corregir estado de la empresa */}
        <Dialog
          open={abrirCorregir}
          onOpenChange={(open) => {
            if (!isPending) setAbrirCorregir(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Corregir estado de la empresa</DialogTitle>
              <DialogDescription>
                Ajustá el estado que registró la empresa para esta derivación.
                Usá esta acción solo para corregir errores.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="corregir-estado" className="text-sm font-medium text-foreground">
                Nuevo estado <Obligatorio />
              </label>
              <select
                id="corregir-estado"
                value={estadoCorreccion}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (esValorEnum("estado_empresa", valor)) setEstadoCorreccion(valor);
                  camposCorregir.limpiar("estado");
                }}
                {...ariaErrorCampo("corregir-estado", camposCorregir.errores.estado)}
                className={cn(
                  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  CLASE_CONTROL_INVALIDO
                )}
                disabled={isPending}
              >
                {ESTADOS_CORREGUIBLES.map((e) => (
                  <option key={e} value={e}>
                    {DERIVACION_ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
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
    <div className="space-y-3">
      {ofertaEnRevision && (
        <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La oferta está en revisión: no se puede derivar ni rechazar hasta que se vuelva a aprobar.
        </div>
      )}


      <div className="flex flex-wrap gap-2">
        {(estado === "recibida" || estado === "en_revision") && (
          <>
            <button
              type="button"
              onClick={() => setAbrirDerivar(true)}
              disabled={isPending || ofertaEnRevision}
              className="btn-primario min-h-11 justify-center"
            >
              Derivar a la empresa
            </button>
            <button
              type="button"
              onClick={() => setAbrirDescartar(true)}
              disabled={isPending || ofertaEnRevision}
              className="btn-peligro inline-flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-sm font-medium"
            >
              No seleccionar
            </button>
          </>
        )}

        {estado === "rechazada_municipalidad" && (
          <button
            type="button"
            onClick={() => setAbrirReconsiderar(true)}
            disabled={isPending}
            className="btn-secundario inline-flex items-center justify-center whitespace-nowrap min-h-11 px-4 text-sm font-medium"
          >
            Reconsiderar
          </button>
        )}
      </div>

      {/* Dialog: No seleccionar */}
      <Dialog
        open={abrirDescartar}
        onOpenChange={(open) => {
          if (isPending) return;
          setAbrirDescartar(open);
          if (!open) setNotaDescartar("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No seleccionar candidato</DialogTitle>
            <DialogDescription>
              El postulante va a ver su postulación como{" "}
              <span className="font-semibold text-foreground">
                «No seleccionada»
              </span>
              . Podés dejar una nota interna (no la ve el postulante).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="nota-descartar"
              className="text-sm font-medium text-foreground"
            >
              Nota interna{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Textarea
              id="nota-descartar"
              value={notaDescartar}
              onChange={(e) => setNotaDescartar(e.target.value)}
              placeholder="¿Por qué no se selecciona a este candidato?"
              maxLength={LARGO_MAXIMO.nota}
              className="min-h-24"
              disabled={isPending}
            />
            <ContadorCaracteres actual={notaDescartar.length} maximo={LARGO_MAXIMO.nota} />
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => { setAbrirDescartar(false); setNotaDescartar(""); }}
            onConfirmar={handleDescartar}
            textoConfirmar="No seleccionar"
            textoPendiente="Guardando…"
            destructivo
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Derivar a la empresa */}
      <Dialog
        open={abrirDerivar}
        onOpenChange={(open) => {
          if (isPending) return;
          setAbrirDerivar(open);
          if (!open) setNotaDerivar("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Derivar a la empresa</DialogTitle>
            <DialogDescription>
              La empresa recibirá los datos del candidato. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {avisoCurso && (
            <p
              role="note"
              className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {avisoCurso}
            </p>
          )}
          <div className="space-y-2">
            <label
              htmlFor="nota-derivar"
              className="text-sm font-medium text-foreground"
            >
              ¿Por qué recomendás a este candidato?{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Textarea
              id="nota-derivar"
              value={notaDerivar}
              onChange={(e) => setNotaDerivar(e.target.value)}
              placeholder="Contá brevemente por qué este perfil encaja con la búsqueda…"
              maxLength={LARGO_MAXIMO.nota}
              className="min-h-24"
              disabled={isPending}
            />
            <ContadorCaracteres actual={notaDerivar.length} maximo={LARGO_MAXIMO.nota} />
          </div>
          <BotonesDialogo
            pendiente={isPending}
            onCancelar={() => { setAbrirDerivar(false); setNotaDerivar(""); }}
            onConfirmar={handleDerivar}
            textoConfirmar="Derivar candidato"
            textoPendiente="Derivando…"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Reconsiderar */}
      <Dialog
        open={abrirReconsiderar}
        onOpenChange={(open) => {
          if (!isPending) setAbrirReconsiderar(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconsiderar candidato</DialogTitle>
            <DialogDescription>
              La postulación volverá a{" "}
              <span className="font-semibold text-foreground">En revisión</span>
              .
            </DialogDescription>
          </DialogHeader>
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

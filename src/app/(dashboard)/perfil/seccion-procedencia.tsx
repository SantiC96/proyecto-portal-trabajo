"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink, FileText, Upload, XCircle } from "lucide-react";
import { actualizarLocalidad, subirComprobanteDomicilio } from "./actions";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import {
  CLASE_AYUDA_PERFIL,
  CampoLectura,
  GrillaLectura,
  MensajeError,
  PieSeccion,
  SeccionPerfil,
} from "@/components/perfil/piezas";
import {
  BotonEditar,
  PieEdicion,
  useInformarCambios,
  useTarjetaEditable,
  type TarjetaEditable,
} from "@/components/perfil/tarjeta-editable";
import { SIN_COMPLETAR } from "@/lib/informacion-laboral";
import { Franja } from "@/components/ui/franja";
import { CampoLocalidad } from "@/components/postulantes/campo-localidad";
import { formatFecha } from "@/lib/fechas";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";
import {
  COMPROBANTE_ACCEPT,
  COMPROBANTE_HELP_TEXT,
  COMPROBANTE_MAX_SIZE,
  ERRORES_ARCHIVO,
  textoTamanoArchivo,
  validarTipoComprobante,
} from "@/lib/archivos";
import {
  OTRA_LOCALIDAD,
  esLocalidadFunes,
  opcionDeLocalidad,
  resolverLocalidad,
} from "@/lib/localidades";
import type { EstadoComprobante } from "@/lib/procedencia";
import { cn } from "@/lib/utils";
import { Badge, type TonoBadge } from "@/components/ui/badge";

/** Comprobante vigente tal como lo recibe el cliente (sin la ruta). */
export type ComprobantePerfil = {
  nombreOriginal: string;
  subidoEn: string;
  tamano: number;
  estado: EstadoComprobante;
  motivo: string | null;
  url: string | null;
};

type CampoProcedencia = "localidad" | "otraLocalidad";
const CAMPOS: readonly CampoProcedencia[] = ["localidad", "otraLocalidad"];

const ESTADO_COMPROBANTE: Record<
  EstadoComprobante,
  { texto: string; Icono: typeof Clock; tono: TonoBadge }
> = {
  pendiente: { texto: "En revisión", Icono: Clock, tono: "warning" },
  aprobado: { texto: "Verificado", Icono: CheckCircle2, tono: "success" },
  rechazado: { texto: "Rechazado", Icono: XCircle, tono: "danger" },
};

/** Qué pasa con la verificación al cambiar de localidad (BLOQUE 5 de migration_055). */
function avisoCambioLocalidad(
  actual: string | null,
  nueva: string,
  comprobante: ComprobantePerfil | null,
): string {
  const eraFunes = esLocalidadFunes(actual);
  const esFunes = esLocalidadFunes(nueva);
  if (eraFunes && comprobante && !esFunes) {
    return "Tu comprobante de domicilio se va a eliminar: solo se usa para verificar domicilios en Funes.";
  }
  if (eraFunes && comprobante) {
    return "Tu comprobante de domicilio vuelve a quedar en revisión de la Oficina de Empleo.";
  }
  return "La verificación de tu domicilio se reinicia con la nueva localidad.";
}

/**
 * Sección "Procedencia" del perfil del postulante (migration_055): la
 * localidad, en modo lectura con "Editar", y, si es Funes, el comprobante de
 * domicilio con su estado de verificación y su botón para subirlo.
 */
export function SeccionProcedencia({
  localidad,
  comprobante,
}: {
  localidad: string | null;
  comprobante: ComprobantePerfil | null;
}) {
  const router = useRouter();
  // La guardada se muestra apenas se guarda, sin esperar el refresh.
  const [guardada, setGuardada] = useState(localidad);
  const tarjeta = useTarjetaEditable(SECCION_PERFIL.procedencia, {
    titulo: "Procedencia",
    incompleta: !guardada,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<ErrorAccion | null>(null);
  const [confirmarReemplazo, setConfirmarReemplazo] = useState(false);
  const { pendiente: subiendo, ejecutar: ejecutarSubida } = useAccion();

  const esFunes = esLocalidadFunes(localidad);

  function abrirSelector() {
    setErrorArchivo(null);
    if (comprobante?.estado === "aprobado") {
      setConfirmarReemplazo(true);
      return;
    }
    inputRef.current?.click();
  }

  function subir(file: File) {
    setErrorArchivo(null);
    if (!validarTipoComprobante(file.type)) {
      setErrorArchivo({ mensaje: ERRORES_ARCHIVO.comprobanteTipo });
      return;
    }
    if (file.size > COMPROBANTE_MAX_SIZE) {
      setErrorArchivo({ mensaje: ERRORES_ARCHIVO.comprobanteTamano });
      return;
    }
    setArchivo(file);
    const fd = new FormData();
    fd.append("comprobante", file);
    ejecutarSubida(async () => {
      try {
        const result = await subirComprobanteDomicilio(fd);
        mostrarAviso(result);
        if (result.ok) router.refresh();
      } finally {
        setArchivo(null);
      }
    });
  }

  const estado = comprobante ? ESTADO_COMPROBANTE[comprobante.estado] : null;

  return (
    <SeccionPerfil
      id={SECCION_PERFIL.procedencia}
      titulo="Procedencia"
      acciones={
        !tarjeta.editando && <BotonEditar tarjeta={tarjeta} etiqueta="Editar procedencia" />
      }
    >
      {tarjeta.editando ? (
        <FormLocalidad
          tarjeta={tarjeta}
          localidad={guardada}
          comprobante={comprobante}
          onGuardada={(nueva) => {
            setGuardada(nueva);
            router.refresh();
          }}
        />
      ) : (
        <GrillaLectura>
          <CampoLectura estiloPerfil label="¿De dónde sos?" valor={guardada ?? ""} vacio={SIN_COMPLETAR} />
        </GrillaLectura>
      )}

      {esFunes && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-base font-bold text-heading">Comprobante de domicilio</h3>

          {comprobante && estado ? (
            <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FileText className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-[15px] font-bold text-heading">
                    {comprobante.nombreOriginal}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {comprobante.tamano > 0 ? `${textoTamanoArchivo(comprobante.tamano)} · ` : ""}
                    Cargado el {formatFecha(comprobante.subidoEn)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tono={estado.tono} icono={estado.Icono}>
                  {estado.texto}
                </Badge>
                {comprobante.url && (
                  <a
                    href={subiendo ? undefined : comprobante.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={subiendo}
                    tabIndex={subiendo ? -1 : undefined}
                    className={cn("btn-neutro sm:min-h-10!", subiendo && "pointer-events-none")}
                  >
                    <ExternalLink aria-hidden="true" />
                    Ver
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-muted-foreground">Todavía no subiste un comprobante.</p>
          )}

          {comprobante?.estado === "rechazado" && comprobante.motivo && (
            <Franja tono="error" titulo="Motivo del rechazo:" className="whitespace-pre-line">
              {comprobante.motivo}
            </Franja>
          )}

          <p className={CLASE_AYUDA_PERFIL}>
            Cualquier documento donde figure tu dirección en Funes (por ejemplo, una factura de un
            servicio). Lo revisa la Oficina de Empleo. {COMPROBANTE_HELP_TEXT}.
          </p>

          {subiendo && archivo && (
            <p className="break-all text-[13px] text-muted-foreground" aria-live="polite">
              Subiendo {archivo.name} ({textoTamanoArchivo(archivo.size)})…
            </p>
          )}
          <div aria-live="polite" className="empty:hidden">
            {errorArchivo && <MensajeError error={errorArchivo} />}
          </div>

          <PieSeccion>
            <button
              type="button"
              onClick={abrirSelector}
              disabled={subiendo}
              aria-busy={subiendo}
              className="btn-secundario"
            >
              {subiendo ? <Spinner /> : <Upload aria-hidden="true" />}
              {subiendo
                ? "Subiendo…"
                : comprobante
                  ? "Subir nuevo comprobante"
                  : "Subir comprobante"}
            </button>
          </PieSeccion>

          <input
            ref={inputRef}
            type="file"
            accept={COMPROBANTE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subir(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Confirmación: reemplazar un comprobante ya verificado */}
      <Dialog
        open={confirmarReemplazo}
        onOpenChange={(abierto) => setConfirmarReemplazo(abierto)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reemplazar tu comprobante verificado?</DialogTitle>
            <DialogDescription>
              Tu domicilio deja de figurar como verificado hasta que la Oficina de Empleo revise
              el comprobante nuevo.
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={false}
            onCancelar={() => setConfirmarReemplazo(false)}
            onConfirmar={() => {
              setConfirmarReemplazo(false);
              inputRef.current?.click();
            }}
            textoConfirmar="Elegir archivo"
          />
        </DialogContent>
      </Dialog>
    </SeccionPerfil>
  );
}

/**
 * La localidad en edición. Si cambia una localidad que ya tenía, pregunta
 * antes de guardar: la verificación del domicilio se reinicia.
 */
function FormLocalidad({
  tarjeta,
  localidad,
  comprobante,
  onGuardada,
}: {
  tarjeta: TarjetaEditable;
  localidad: string | null;
  comprobante: ComprobantePerfil | null;
  onGuardada: (localidad: string) => void;
}) {
  const inicial = opcionDeLocalidad(localidad);
  const [elegida, setElegida] = useState(inicial.elegida);
  const [escrita, setEscrita] = useState(inicial.escrita);
  const [confirmarCambio, setConfirmarCambio] = useState<string | null>(null);
  const campos = useErroresCampo<CampoProcedencia>();
  const { pendiente: guardando, ejecutar: ejecutarGuardar } = useAccion();
  useInformarCambios(tarjeta, elegida !== inicial.elegida || escrita !== inicial.escrita);

  function guardar(nueva: string) {
    ejecutarGuardar(async () => {
      const result = await actualizarLocalidad({ localidad: elegida, otraLocalidad: escrita });
      if (!campos.tomarDelServidor(result, CAMPOS)) mostrarAviso(result);
      if (!result.ok) return;
      setConfirmarCambio(null);
      // Lo escrito a mano puede coincidir con una de la lista ("perez" → "Pérez").
      onGuardada(result.data?.localidad ?? nueva);
      tarjeta.cerrar();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const obligatorios =
      elegida === OTRA_LOCALIDAD ? { localidad: elegida, otraLocalidad: escrita } : { localidad: elegida };
    if (!campos.validar(obligatorios, form)) return;

    const resuelta = resolverLocalidad(elegida, escrita);
    if (!resuelta.ok) {
      campos.marcar(resuelta.campo, resuelta.mensaje, form);
      return;
    }
    // Sin cambios no hay nada que guardar: vuelve al modo lectura.
    if (resuelta.localidad === localidad) {
      tarjeta.cerrar();
      return;
    }
    // Sin localidad previa no hay verificación que reiniciar.
    if (localidad === null) {
      guardar(resuelta.localidad);
      return;
    }
    setConfirmarCambio(resuelta.localidad);
  }

  return (
    <form id={tarjeta.idFormulario} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <CampoLocalidad
        id="p-localidad"
        elegida={elegida}
        escrita={escrita}
        onElegida={(valor) => {
          setElegida(valor);
          campos.limpiar("localidad");
          campos.limpiar("otraLocalidad");
        }}
        onEscrita={(valor) => {
          setEscrita(valor);
          campos.limpiar("otraLocalidad");
        }}
        errorLocalidad={campos.errores.localidad}
        errorOtra={campos.errores.otraLocalidad}
        deshabilitado={guardando}
        estiloPerfil
        className="sm:max-w-[calc(50%-8px)]"
      />
      <PieEdicion pendiente={guardando} onCancelar={tarjeta.cerrar} />

      {/* Confirmación: cambiar la localidad reinicia la verificación */}
      <Dialog
        open={confirmarCambio !== null}
        onOpenChange={(abierto) => {
          if (guardando) return;
          if (!abierto) setConfirmarCambio(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cambiar tu localidad a {confirmarCambio}?</DialogTitle>
            <DialogDescription>
              {confirmarCambio !== null &&
                avisoCambioLocalidad(localidad, confirmarCambio, comprobante)}
            </DialogDescription>
          </DialogHeader>
          <BotonesDialogo
            pendiente={guardando}
            onCancelar={() => setConfirmarCambio(null)}
            onConfirmar={() => confirmarCambio !== null && guardar(confirmarCambio)}
            textoConfirmar="Sí, cambiar"
            textoPendiente="Guardando…"
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}

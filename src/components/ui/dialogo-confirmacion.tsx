"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogResumen,
  DialogTitle,
  type TonoIconoDialogo,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mostrarAviso } from "@/lib/avisos";
import type { Resultado } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import { cn } from "@/lib/utils";

/** Clases de una acción del pie que no es un Button (un Link o un BotonFormulario). */
export const CLASE_ACCION_DIALOGO = {
  primario: "btn-primario",
  secundario: "btn-secundario whitespace-nowrap",
  /** Mismo rojo que Button variant="destructive" (por ejemplo, cerrar sesión). */
  peligro: "btn-peligro",
} as const;

/** Estilos de los botones que abren un diálogo, según la jerarquía de la acción. */
export const CLASE_BOTON = {
  primario: "btn-primario",
  secundario: "btn-secundario",
  neutro: "btn-neutro",
  peligro: "btn-peligro",
  /** Destructiva de menor peso: blanco con borde y texto rojos (retirar una postulación). */
  peligroBorde: "btn-peligro-borde",
} as const;

export type EstiloBoton = keyof typeof CLASE_BOTON;

/**
 * Pie gris de todos los diálogos con una acción: Cancelar y la acción a la
 * derecha (en el celular, la acción arriba). Mientras la acción
 * corre los dos quedan deshabilitados y el de confirmar muestra la carga.
 * Si la acción no es un botón (un link, un formulario), va como `children`
 * con las clases de CLASE_ACCION_DIALOGO.
 */
export function BotonesDialogo({
  pendiente,
  onCancelar,
  onConfirmar,
  textoConfirmar,
  textoPendiente,
  destructivo = false,
  deshabilitado = false,
  textoCancelar = "Cancelar",
  iconoConfirmar: IconoConfirmar,
  children,
}: {
  pendiente: boolean;
  onCancelar: () => void;
  textoCancelar?: string;
  children?: ReactNode;
  onConfirmar?: () => void;
  textoConfirmar?: string;
  textoPendiente?: string;
  destructivo?: boolean;
  deshabilitado?: boolean;
  /** Ícono a la izquierda del texto de confirmar (Send en "Derivar candidato"). */
  iconoConfirmar?: LucideIcon;
}) {
  return (
    <DialogFooter>
      <button
        type="button"
        onClick={onCancelar}
        disabled={pendiente}
        className="btn-neutro whitespace-nowrap"
      >
        {textoCancelar}
      </button>
      {children}
      {onConfirmar && textoConfirmar && (
        <Button
          onClick={onConfirmar}
          disabled={pendiente || deshabilitado}
          aria-busy={pendiente}
          variant={destructivo ? "destructive" : "default"}
        >
          {pendiente ? <Spinner /> : IconoConfirmar && <IconoConfirmar aria-hidden="true" />}
          {pendiente ? (textoPendiente ?? "Guardando…") : textoConfirmar}
        </Button>
      )}
    </DialogFooter>
  );
}

type Props<T> = {
  /** Texto del botón que abre el diálogo. */
  textoBoton: ReactNode;
  /** Jerarquía del botón que abre el diálogo. */
  estiloBoton?: EstiloBoton;
  claseBoton?: string;
  deshabilitado?: boolean;
  /** Texto de ayuda del botón (tooltip). */
  ayudaBoton?: string;
  /** Nombre accesible del botón cuando muestra solo un ícono. */
  etiquetaBoton?: string;
  titulo: string;
  /** Una sola línea de explicación debajo del título. */
  descripcion?: ReactNode;
  /** Ícono del encabezado, en un círculo de 44 px del tono `tonoIcono`. */
  icono?: LucideIcon;
  /** "peligro" (rechazar), "teal" (derivar) o "primario" (invitar, aprobar). Por defecto, rojo si es destructivo. */
  tonoIcono?: TonoIconoDialogo;
  /** Recuadro gris con lo que se está confirmando (título, empresa, fecha). */
  resumen?: ReactNode;
  /** Contenido extra (los campos) entre el encabezado y los botones. */
  children?: ReactNode;
  textoConfirmar: string;
  textoPendiente: string;
  destructivo?: boolean;
  accion: () => Promise<Resultado<T>>;
  /** Mensaje de éxito si la acción no devuelve uno. */
  mensajeExito?: string;
  onExito?: (resultado: Resultado<T>) => void;
};

/**
 * Botón + diálogo de confirmación para una acción del servidor. Mientras la
 * acción corre, los botones quedan deshabilitados, el de confirmar muestra el
 * indicador de carga y un segundo clic no vuelve a dispararla. El resultado se
 * informa con un toast; si falla, el diálogo queda abierto para reintentar.
 */
export function DialogoConfirmacion<T>({
  textoBoton,
  estiloBoton = "secundario",
  claseBoton,
  deshabilitado = false,
  ayudaBoton,
  etiquetaBoton,
  titulo,
  descripcion,
  icono,
  tonoIcono,
  resumen,
  children,
  textoConfirmar,
  textoPendiente,
  destructivo = false,
  accion,
  mensajeExito,
  onExito,
}: Props<T>) {
  const [abierto, setAbierto] = useState(false);
  const { pendiente, ejecutar } = useAccion();

  function confirmar() {
    ejecutar(async () => {
      const res = await accion();
      mostrarAviso(res, mensajeExito);
      if (!res.ok) return;
      setAbierto(false);
      onExito?.(res);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={deshabilitado || pendiente}
        title={ayudaBoton}
        aria-label={etiquetaBoton}
        className={cn(
          CLASE_BOTON[estiloBoton],
          "whitespace-nowrap",
          claseBoton,
        )}
      >
        {textoBoton}
      </button>

      <Dialog
        open={abierto}
        onOpenChange={(v) => {
          if (pendiente) return;
          setAbierto(v);
        }}
      >
        <DialogContent>
          <DialogHeader icono={icono} tonoIcono={tonoIcono ?? (destructivo ? "peligro" : "primario")}>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>

          {resumen && <DialogResumen>{resumen}</DialogResumen>}

          {children}

          <BotonesDialogo
            pendiente={pendiente}
            onCancelar={() => setAbierto(false)}
            onConfirmar={confirmar}
            textoConfirmar={textoConfirmar}
            textoPendiente={textoPendiente}
            destructivo={destructivo}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

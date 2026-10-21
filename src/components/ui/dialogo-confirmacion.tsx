"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mostrarAviso } from "@/lib/avisos";
import type { Resultado } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import { cn } from "@/lib/utils";

/** Clases de una acción del pie que no es un Button (un Link o un BotonFormulario). */
export const CLASE_ACCION_DIALOGO = {
  primario: "btn-primario min-h-11 justify-center sm:min-h-9",
  secundario:
    "btn-secundario inline-flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-sm font-medium sm:min-h-9",
  /** Mismo rojo que Button variant="destructive" (por ejemplo, cerrar sesión). */
  peligro:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60 sm:min-h-9",
} as const;

/** Estilos de los botones que abren un diálogo, según la jerarquía de la acción. */
export const CLASE_BOTON = {
  primario: "btn-primario",
  secundario: "btn-secundario",
  peligro: "btn-peligro",
} as const;

export type EstiloBoton = keyof typeof CLASE_BOTON;

/**
 * Pie de todos los diálogos con una acción: Cancelar a la izquierda y la
 * acción a la derecha (en el celular, la acción arriba). Mientras la acción
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
}) {
  return (
    <DialogFooter>
      <button
        type="button"
        onClick={onCancelar}
        disabled={pendiente}
        className="btn-secundario inline-flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-sm font-medium sm:min-h-9"
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
          className="min-h-11 px-4 sm:min-h-9"
        >
          {pendiente && <Spinner />}
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
  titulo: string;
  descripcion?: ReactNode;
  /** Contenido extra entre la descripción y los botones. */
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
  titulo,
  descripcion,
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
        className={cn(
          CLASE_BOTON[estiloBoton],
          "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium",
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
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>

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

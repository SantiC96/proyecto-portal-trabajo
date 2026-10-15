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
import { toErrorAccion, type ErrorAccion, type Resultado } from "@/lib/resultado";
import { useAccion } from "@/lib/use-accion";
import { cn } from "@/lib/utils";

type Props<T> = {
  /** Texto del botón que abre el diálogo. */
  textoBoton: ReactNode;
  /** Estilo del botón que abre el diálogo (clases btn-primario / btn-secundario). */
  estiloBoton?: "primario" | "secundario";
  claseBoton?: string;
  deshabilitado?: boolean;
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
 * indicador de carga y un segundo clic no vuelve a dispararla.
 */
export function DialogoConfirmacion<T>({
  textoBoton,
  estiloBoton = "secundario",
  claseBoton,
  deshabilitado = false,
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
  const [error, setError] = useState<ErrorAccion | null>(null);
  const { pendiente, ejecutar } = useAccion();

  function confirmar() {
    setError(null);
    ejecutar(async () => {
      const res = await accion();
      mostrarAviso(res, mensajeExito);
      if (!res.ok) {
        setError(toErrorAccion(res));
        return;
      }
      setAbierto(false);
      onExito?.(res);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setAbierto(true);
        }}
        disabled={deshabilitado || pendiente}
        className={cn(
          estiloBoton === "primario" ? "btn-primario" : "btn-secundario",
          "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium disabled:opacity-60",
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
          if (!v) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>

          {children}

          {error && (
            <div role="alert">
              <p className="text-sm text-red-600">{error.mensaje}</p>
              {error.ref && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setError(null);
              }}
              disabled={pendiente}
              className="btn-secundario inline-flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-sm font-medium disabled:opacity-60 sm:min-h-9"
            >
              Cancelar
            </button>
            <Button
              onClick={confirmar}
              disabled={pendiente}
              aria-busy={pendiente}
              variant={destructivo ? "destructive" : "default"}
              className="min-h-11 px-4 sm:min-h-9"
            >
              {pendiente && <Spinner />}
              {pendiente ? textoPendiente : textoConfirmar}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

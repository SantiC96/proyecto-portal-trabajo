"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon, type LucideIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-heading/50 backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * Diálogo del portal (ronda 9): 520 px de ancho (100 % − 32 px en el
 * celular), radio 20, el botón de cerrar de 44 px arriba a la derecha y el
 * pie gris (DialogFooter). Base UI pone role="dialog", aria-modal, atrapa el
 * foco y cierra con Escape.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-[20px] bg-surface p-5 text-[15px] leading-[1.45] text-foreground shadow-[var(--sombra-dialogo)] outline-none sm:max-w-[520px] sm:p-6",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Cerrar"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 size-11 sm:top-4 sm:right-4"
                size="icon"
              />
            }
          >
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

const CLASE_TONO_ICONO = {
  peligro: "bg-danger/10 text-danger",
  teal: "bg-teal/10 text-teal",
  primario: "bg-primary/10 text-primary",
} as const

export type TonoIconoDialogo = keyof typeof CLASE_TONO_ICONO

/**
 * Encabezado: el título (20 px) y una línea de explicación. Con `icono`, va
 * a la izquierda en un círculo de 44 px: rojo para rechazar, teal para
 * derivar, verde para invitar o aprobar. Deja lugar a la derecha para el
 * botón de cerrar.
 */
function DialogHeader({
  className,
  icono: Icono,
  tonoIcono = "primario",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icono?: LucideIcon
  tonoIcono?: TonoIconoDialogo
}) {
  if (!Icono) {
    return (
      <div
        data-slot="dialog-header"
        className={cn("flex flex-col gap-1.5 pr-12", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex items-start gap-3.5 pr-12", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full [&_svg]:size-[22px]",
          CLASE_TONO_ICONO[tonoIcono]
        )}
      >
        <Icono />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">{children}</div>
    </div>
  )
}

/** Recuadro gris con el resumen de lo que se está confirmando (título, empresa, fecha). */
function DialogResumen({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-resumen"
      className={cn(
        "rounded-[14px] bg-tabla-cabecera px-4 py-3 text-[15px] leading-[1.45] text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Pie gris (`background`) de borde a borde: Cancelar y la acción a la
 * derecha; en el celular, apilados con la acción arriba.
 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:gap-3 sm:px-6",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Cerrar
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-xl leading-tight font-extrabold text-heading",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-[15px] leading-[1.45] text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogResumen,
  DialogTitle,
  DialogTrigger,
}

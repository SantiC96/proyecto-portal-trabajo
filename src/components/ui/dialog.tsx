"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * "amplio": el diálogo del rediseño de las pantallas del postulante (540 px,
 * radio 20, título de 22 px, X de 44 px y acciones a la derecha; en el celular,
 * a todo el ancho y apiladas con la principal abajo).
 */
type TamanoDialogo = "normal" | "amplio"

const TamanoDialogoContext = React.createContext<TamanoDialogo>("normal")

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

function DialogContent({
  className,
  children,
  showCloseButton = true,
  tamano = "normal",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  tamano?: TamanoDialogo
}) {
  const amplio = tamano === "amplio"
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-xl)] bg-surface p-4 text-[15px] leading-[1.45] text-foreground shadow-[var(--sombra-dialogo)] outline-none sm:max-w-sm sm:p-5",
          amplio &&
            "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-[20px] px-[18px] py-[22px] sm:max-w-[540px] sm:p-7",
          className
        )}
        {...props}
      >
        <TamanoDialogoContext.Provider value={tamano}>{children}</TamanoDialogoContext.Provider>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className={amplio ? "absolute top-3 right-3 size-11 sm:top-4 sm:right-4" : "absolute top-2 right-2"}
                size={amplio ? "icon" : "icon-sm"}
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const amplio = React.useContext(TamanoDialogoContext) === "amplio"
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        amplio
          ? "flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3"
          : "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-[var(--radius-xl)] border-t border-border bg-surface-tinted p-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:px-5",
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
  const amplio = React.useContext(TamanoDialogoContext) === "amplio"
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg leading-snug font-extrabold text-heading",
        amplio && "pr-10 text-[22px] leading-tight",
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
  DialogTitle,
  DialogTrigger,
}

"use client"

import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, Search } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface OpcionCombobox {
  id: string
  nombre: string
}

/** Compara sin mayúsculas ni tildes ("logística" encuentra "Logistica"). */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * Popup de opciones de los combobox (MultiCombobox y Combobox): la lista con
 * check, de 44 px por opción, y el texto de "sin resultados". `encabezado` va
 * arriba de la lista (el buscador interno del Combobox de selección única).
 */
export function PopupCombobox({
  opciones,
  vacioTexto,
  encabezado,
  className,
}: {
  opciones: OpcionCombobox[]
  vacioTexto: string
  encabezado?: ReactNode
  className?: string
}) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
        <BaseCombobox.Popup
          data-slot="combobox-popup"
          className={cn(
            "w-[var(--anchor-width)] rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--sombra-dialogo)]",
            className,
          )}
        >
          {encabezado}
          <BaseCombobox.List className="max-h-64 overflow-y-auto p-1 empty:hidden">
            {opciones.map((opt) => (
              <BaseCombobox.Item
                key={opt.id}
                value={opt.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[15px] text-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary data-[highlighted]:bg-secondary data-[highlighted]:text-primary"
              >
                <span className="flex w-4 flex-shrink-0 items-center justify-center text-primary">
                  <BaseCombobox.ItemIndicator>
                    <Check size={14} />
                  </BaseCombobox.ItemIndicator>
                </span>
                {opt.nombre}
              </BaseCombobox.Item>
            ))}
          </BaseCombobox.List>
          {opciones.length === 0 && (
            <BaseCombobox.Empty className="px-3 py-3 text-sm text-muted-foreground">
              {vacioTexto}
            </BaseCombobox.Empty>
          )}
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  )
}

/**
 * Desplegable de selección única con buscador interno: un botón que muestra
 * la opción elegida y abre el mismo popup que MultiCombobox, con un campo para
 * filtrar arriba de la lista. Teclado: Enter o flecha abajo abren, las flechas
 * recorren las opciones, Enter elige y Escape cierra.
 *
 * Con `name`, el valor viaja en un input oculto: el formulario lo manda igual
 * que un <select>, también sin JavaScript (con el valor inicial).
 *
 * En un formulario con noValidate y useErroresCampo, `aria-invalid` y
 * `aria-describedby` van al botón: con `triggerClassName="campo"` se pinta el
 * borde rojo y useErroresCampo lo enfoca como a cualquier otro campo.
 */
export function Combobox({
  opciones,
  valor,
  onCambiar,
  id,
  name,
  opcionVacia,
  placeholder = "Elegí una opción",
  placeholderBusqueda = "Buscar",
  etiquetaBusqueda = "Buscar una opción",
  vacioTexto = "No hay opciones con ese nombre",
  triggerClassName,
  popupClassName,
  requerido = false,
  deshabilitado = false,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  opciones: OpcionCombobox[]
  valor: string
  onCambiar: (valor: string) => void
  /** id del botón, para el <label htmlFor>. */
  id?: string
  name?: string
  /** Primera opción, con valor "" ("Todos los rubros"). */
  opcionVacia?: string
  placeholder?: string
  placeholderBusqueda?: string
  etiquetaBusqueda?: string
  vacioTexto?: string
  triggerClassName?: string
  popupClassName?: string
  /** aria-required en el botón; la validación la hace el formulario. */
  requerido?: boolean
  deshabilitado?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const todas = opcionVacia !== undefined ? [{ id: "", nombre: opcionVacia }, ...opciones] : opciones
  const filtradas = busqueda
    ? opciones.filter((o) => normalizarBusqueda(o.nombre).includes(normalizarBusqueda(busqueda)))
    : todas
  const etiqueta = todas.find((o) => o.id === valor)?.nombre ?? placeholder

  return (
    <>
      <BaseCombobox.Root
        value={valor}
        onValueChange={(v) => onCambiar(typeof v === "string" ? v : "")}
        open={abierto}
        onOpenChange={setAbierto}
        inputValue={busqueda}
        onInputValueChange={setBusqueda}
        autoComplete="none"
        disabled={deshabilitado}
      >
        <BaseCombobox.Trigger
          id={id}
          aria-required={requerido || undefined}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "flex min-h-11 items-center justify-between gap-2 text-left text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60",
            triggerClassName,
          )}
        >
          <span className="min-w-0 truncate">{etiqueta}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-[18px] shrink-0 text-muted-icon transition-transform duration-200",
              abierto && "rotate-180",
            )}
          />
        </BaseCombobox.Trigger>

        <PopupCombobox
          opciones={filtradas}
          vacioTexto={vacioTexto}
          className={popupClassName}
          encabezado={
            <div className="border-b border-border p-2">
              <div className="relative flex items-center">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 size-4 text-muted-icon"
                />
                <BaseCombobox.Input
                  aria-label={etiquetaBusqueda}
                  placeholder={placeholderBusqueda}
                  className="h-11 w-full rounded-[var(--radius-md)] border-[1.5px] border-border bg-surface pr-3 pl-9 text-base text-foreground outline-none placeholder:text-placeholder focus-visible:border-primary focus-visible:shadow-[var(--sombra-foco-campo)]"
                />
              </div>
            </div>
          }
        />
      </BaseCombobox.Root>
      {name && <input type="hidden" name={name} value={valor} />}
    </>
  )
}

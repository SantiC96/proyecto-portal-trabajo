"use client"

import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown, X } from "lucide-react"
import { useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { PopupCombobox, normalizarBusqueda, type OpcionCombobox } from "@/components/ui/combobox"

interface MultiComboboxProps {
  opciones: OpcionCombobox[]
  seleccionados: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  id?: string
  vacioTexto?: string
  campoClassName?: string
  /** aria-invalid / aria-describedby del input cuando el campo tiene un error. */
  ariaInput?: { "aria-invalid"?: true; "aria-describedby"?: string }
  /**
   * Texto corto de lo elegido ("Gastronomía y 2 más") que reemplaza a los
   * chips, para un campo de una sola línea (filtro del celular). Se quita
   * desmarcando en la lista.
   */
  resumen?: string
}

export function MultiCombobox({
  opciones,
  seleccionados,
  onChange,
  placeholder = "Buscá o elegí...",
  id,
  vacioTexto = "No hay rubros que coincidan",
  campoClassName,
  ariaInput,
  resumen,
}: MultiComboboxProps) {
  const idResumen = useId()
  const conResumen = resumen !== undefined
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtradas = inputValue
    ? opciones.filter((o) => normalizarBusqueda(o.nombre).includes(normalizarBusqueda(inputValue)))
    : opciones

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && inputValue === "" && seleccionados.length > 0) {
      onChange(seleccionados.slice(0, -1))
    }
  }

  return (
    <Combobox.Root
      multiple
      value={seleccionados}
      onValueChange={(value) => {
        onChange(value as string[])
        setInputValue("")
      }}
      open={open}
      onOpenChange={setOpen}
      autoComplete="none"
      inputValue={inputValue}
      onInputValueChange={setInputValue}
    >
      {/* Campo: chips + input + botón chevron */}
      <div
        className={cn(
          "campo-grupo flex cursor-text items-start gap-2 px-3.5 py-2.5",
          campoClassName,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips + input en fila inline */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5 pt-px">
          {conResumen && seleccionados.length > 0 && (
            <span id={idResumen} className="text-base font-semibold text-foreground">
              {resumen}
            </span>
          )}
          {!conResumen && seleccionados.map((sid) => {
            const opcion = opciones.find((o) => o.id === sid)
            if (!opcion) return null
            return (
              <span
                key={sid}
                className="flex items-center gap-1 rounded-full border-[1.5px] border-primary bg-white py-0.5 pl-2.5 pr-1 text-[13px] font-semibold text-primary-hover"
              >
                {opcion.nombre}
                <button
                  type="button"
                  aria-label={`Quitar ${opcion.nombre}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(seleccionados.filter((s) => s !== sid))
                  }}
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full hover:bg-primary/20 focus:outline-none"
                >
                  <X size={10} />
                </button>
              </span>
            )
          })}
          <Combobox.Input
            ref={inputRef}
            id={id}
            placeholder={seleccionados.length === 0 ? placeholder : ""}
            onKeyDown={handleKeyDown}
            aria-describedby={conResumen && seleccionados.length > 0 ? idResumen : undefined}
            {...ariaInput}
            className="min-w-[8rem] flex-1 bg-transparent text-base text-foreground placeholder:text-placeholder focus:outline-none"
          />
        </div>

        {/* Botón para abrir/cerrar con flecha */}
        <Combobox.Trigger className="mt-0.5 flex-shrink-0 text-muted-icon focus:outline-none">
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200", open && "rotate-180")}
          />
        </Combobox.Trigger>
      </div>

      <PopupCombobox opciones={filtradas} vacioTexto={vacioTexto} />
    </Combobox.Root>
  )
}

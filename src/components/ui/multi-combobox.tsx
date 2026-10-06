"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, X } from "lucide-react"
import { useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface Opcion {
  id: string
  nombre: string
}

interface MultiComboboxProps {
  opciones: Opcion[]
  seleccionados: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  id?: string
  vacioTexto?: string
  campoClassName?: string
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function MultiCombobox({
  opciones,
  seleccionados,
  onChange,
  placeholder = "Buscá o elegí...",
  id,
  vacioTexto = "No hay rubros que coincidan",
  campoClassName,
}: MultiComboboxProps) {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtradas = inputValue
    ? opciones.filter((o) => normalizar(o.nombre).includes(normalizar(inputValue)))
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
          "flex min-h-[2.75rem] cursor-text items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 transition",
          "focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20",
          campoClassName,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips + input en fila inline */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5 pt-px">
          {seleccionados.map((sid) => {
            const opcion = opciones.find((o) => o.id === sid)
            if (!opcion) return null
            return (
              <span
                key={sid}
                className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary"
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
            className="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground placeholder:text-placeholder focus:outline-none"
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

      {/* Popup */}
      <Combobox.Portal>
        <Combobox.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Combobox.Popup className="w-[var(--anchor-width)] rounded-lg border border-border bg-white shadow-md">
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {filtradas.map((opt) => (
                <Combobox.Item
                  key={opt.id}
                  value={opt.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                >
                  <span className="flex w-4 flex-shrink-0 items-center justify-center text-primary">
                    <Combobox.ItemIndicator>
                      <Check size={14} />
                    </Combobox.ItemIndicator>
                  </span>
                  {opt.nombre}
                </Combobox.Item>
              ))}
            </Combobox.List>
            {filtradas.length === 0 && (
              <Combobox.Empty className="px-3 py-3 text-sm text-muted-foreground">
                {vacioTexto}
              </Combobox.Empty>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

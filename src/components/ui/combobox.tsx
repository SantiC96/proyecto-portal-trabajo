"use client"

import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { Select as BaseSelect } from "@base-ui/react/select"
import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface OpcionCombobox {
  id: string
  nombre: string
  /** Se ve en gris y no se puede elegir (por ejemplo, un horario que ya pasó). */
  deshabilitada?: boolean
}

/** Con más opciones que esto, el Combobox muestra el buscador interno. */
export const MAXIMO_SIN_BUSCADOR = 7

/** Compara sin mayúsculas ni tildes ("logística" encuentra "Logistica"). */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * id del Combobox con `enviarAlCambiar` que envió el formulario. Al navegar,
 * la página vuelve a montar el Combobox (su key depende del valor) y el foco
 * quedaría en el body: el nuevo, con el mismo id, lo recupera.
 */
let idParaEnfocar: string | null = null

const CLASE_POPUP =
  "w-[var(--anchor-width)] rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--sombra-dialogo)]"

const CLASE_LISTA = "max-h-64 overflow-y-auto p-1"

const CLASE_OPCION =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[15px] text-foreground outline-none transition-colors duration-150 hover:bg-secondary hover:text-primary data-[highlighted]:bg-secondary data-[highlighted]:text-primary data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-muted-foreground"

function MarcaElegida({ children }: { children: ReactNode }) {
  return (
    <span className="flex w-4 flex-shrink-0 items-center justify-center text-primary">
      {children}
    </span>
  )
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
        <BaseCombobox.Popup data-slot="combobox-popup" className={cn(CLASE_POPUP, className)}>
          {encabezado}
          <BaseCombobox.List className={cn(CLASE_LISTA, "empty:hidden")}>
            {opciones.map((opt) => (
              <BaseCombobox.Item
                key={opt.id}
                value={opt.id}
                disabled={opt.deshabilitada}
                className={CLASE_OPCION}
              >
                <MarcaElegida>
                  <BaseCombobox.ItemIndicator>
                    <Check size={14} />
                  </BaseCombobox.ItemIndicator>
                </MarcaElegida>
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
 * Desplegable de selección única de todo el sistema: un botón que muestra la
 * opción elegida y abre el mismo popup que MultiCombobox. Con más de
 * MAXIMO_SIN_BUSCADOR opciones lleva un campo para filtrar arriba de la lista;
 * con menos, es una lista simple (el Select de Base UI, que es el control
 * accesible cuando no hay buscador; las letras saltan a la opción).
 * Teclado: Enter o flecha abajo abren, las flechas recorren las opciones,
 * Enter elige y Escape cierra.
 *
 * Controlado con `valor` y `onCambiar`, o no controlado con `valorInicial`
 * (por ejemplo, en un formulario GET de una página del servidor).
 *
 * Con `name`, el valor viaja en un input oculto: el formulario lo manda igual
 * que un <select>, también sin JavaScript (con el valor inicial).
 *
 * Con `enviarAlCambiar` (y `name`), elegir una opción distinta de la actual
 * envía el formulario que lo contiene (form.requestSubmit()), como los
 * filtros de un listado. Después de navegar, el foco vuelve a este botón.
 *
 * En un formulario con noValidate y useErroresCampo, `aria-invalid` y
 * `aria-describedby` van al botón: con `triggerClassName="campo"` se pinta el
 * borde rojo y useErroresCampo lo enfoca como a cualquier otro campo.
 */
export function Combobox({
  opciones,
  valor,
  valorInicial = "",
  onCambiar,
  id,
  name,
  opcionVacia,
  placeholder = "Elegí una opción",
  placeholderBusqueda = "Buscar",
  etiquetaBusqueda = "Buscar una opción",
  vacioTexto = "No hay opciones con ese nombre",
  buscador,
  triggerClassName,
  popupClassName,
  requerido = false,
  deshabilitado = false,
  enviarAlCambiar = false,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  opciones: OpcionCombobox[]
  valor?: string
  /** Sin `valor`: el valor con el que arranca. */
  valorInicial?: string
  onCambiar?: (valor: string) => void
  /** id del botón, para el <label htmlFor>. */
  id?: string
  name?: string
  /** Primera opción, con valor "" ("Todos los rubros"). */
  opcionVacia?: string
  placeholder?: string
  placeholderBusqueda?: string
  etiquetaBusqueda?: string
  vacioTexto?: string
  /** Por defecto, solo con más de MAXIMO_SIN_BUSCADOR opciones. */
  buscador?: boolean
  triggerClassName?: string
  popupClassName?: string
  /** aria-required en el botón; la validación la hace el formulario. */
  requerido?: boolean
  deshabilitado?: boolean
  /** Envía el formulario al elegir una opción distinta (requiere `name`). */
  enviarAlCambiar?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [interno, setInterno] = useState(valorInicial)
  const refOculto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id || idParaEnfocar !== id) return
    idParaEnfocar = null
    const activo = document.activeElement
    if (!activo || activo === document.body) document.getElementById(id)?.focus()
  }, [id])

  const actual = valor ?? interno
  const conBuscador = buscador ?? opciones.length > MAXIMO_SIN_BUSCADOR

  function cambiar(nuevo: string) {
    if (valor === undefined) setInterno(nuevo)
    onCambiar?.(nuevo)
    if (enviarAlCambiar && nuevo !== actual) enviar(nuevo)
  }

  function enviar(nuevo: string) {
    const input = refOculto.current
    if (!input?.form) return
    // El input oculto todavía tiene el valor anterior hasta el próximo render.
    input.value = nuevo
    idParaEnfocar = id ?? null
    input.form.requestSubmit()
  }

  const todas = opcionVacia !== undefined ? [{ id: "", nombre: opcionVacia }, ...opciones] : opciones
  const etiqueta = todas.find((o) => o.id === actual)?.nombre ?? placeholder

  const propsBoton = {
    id,
    "aria-required": requerido || undefined,
    "aria-invalid": ariaInvalid || undefined,
    "aria-describedby": ariaDescribedBy,
    className: cn(
      "flex min-h-11 items-center justify-between gap-2 text-left text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60",
      triggerClassName,
    ),
  }
  const contenidoBoton = (
    <>
      <span className="min-w-0 truncate">{etiqueta}</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-[18px] shrink-0 text-muted-icon transition-transform duration-200",
          abierto && "rotate-180",
        )}
      />
    </>
  )
  const inputOculto = name && <input ref={refOculto} type="hidden" name={name} value={actual} />

  if (!conBuscador) {
    return (
      <>
        <BaseSelect.Root
          // El Select usa null para "sin valor"; el resto del sistema, "".
          value={actual === "" ? null : actual}
          onValueChange={(v) => cambiar(typeof v === "string" ? v : "")}
          open={abierto}
          onOpenChange={setAbierto}
          disabled={deshabilitado}
          modal={false}
        >
          <BaseSelect.Trigger {...propsBoton}>{contenidoBoton}</BaseSelect.Trigger>
          <BaseSelect.Portal>
            <BaseSelect.Positioner
              side="bottom"
              align="start"
              sideOffset={4}
              alignItemWithTrigger={false}
              className="z-50"
            >
              <BaseSelect.Popup data-slot="combobox-popup" className={cn(CLASE_POPUP, popupClassName)}>
                <BaseSelect.List className={CLASE_LISTA}>
                  {todas.map((opt) => (
                    <BaseSelect.Item
                      key={opt.id}
                      value={opt.id === "" ? null : opt.id}
                      disabled={opt.deshabilitada}
                      className={CLASE_OPCION}
                    >
                      <MarcaElegida>
                        <BaseSelect.ItemIndicator>
                          <Check size={14} />
                        </BaseSelect.ItemIndicator>
                      </MarcaElegida>
                      <BaseSelect.ItemText>{opt.nombre}</BaseSelect.ItemText>
                    </BaseSelect.Item>
                  ))}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        </BaseSelect.Root>
        {inputOculto}
      </>
    )
  }

  const filtradas = busqueda
    ? opciones.filter((o) => normalizarBusqueda(o.nombre).includes(normalizarBusqueda(busqueda)))
    : todas

  return (
    <>
      <BaseCombobox.Root
        value={actual}
        onValueChange={(v) => cambiar(typeof v === "string" ? v : "")}
        open={abierto}
        onOpenChange={setAbierto}
        inputValue={busqueda}
        onInputValueChange={setBusqueda}
        autoComplete="none"
        disabled={deshabilitado}
      >
        <BaseCombobox.Trigger {...propsBoton}>{contenidoBoton}</BaseCombobox.Trigger>

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
      {inputOculto}
    </>
  )
}

"use client"

import * as React from "react"
import { cn } from "cn"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

// Base de shadcn con los tokens del proyecto (design system, sección 15):
// celdas de 44 px (un poco menos en pantallas de 320 px para que entren las
// 7 columnas), el día elegido en primary con texto blanco, hoy con un anillo
// verde y el foco con --sombra-foco. Sin colores por defecto de shadcn.

const CLASE_NAVEGACION =
  "inline-flex size-(--cell-size) items-center justify-center rounded-[var(--radius-md)] text-control-foreground outline-none select-none transition-colors duration-150 hover:bg-secondary focus-visible:shadow-[var(--sombra-foco)] aria-disabled:pointer-events-none aria-disabled:opacity-40"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-surface [--cell-size:min(44px,calc((100vw_-_56px)/7))]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(CLASE_NAVEGACION, defaultClassNames.button_previous),
        button_next: cn(CLASE_NAVEGACION, defaultClassNames.button_next),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-[15px] font-bold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn("relative rounded-[var(--radius-md)]", defaultClassNames.dropdown_root),
        dropdown: cn("absolute inset-0 bg-surface opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "text-[15px] font-bold text-heading select-none first-letter:uppercase",
          captionLayout !== "label" &&
            "flex items-center gap-1 rounded-[var(--radius-md)] [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-8 w-(--cell-size) items-center justify-center text-[13px] font-semibold text-muted-foreground uppercase select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn("text-[13px] text-muted-foreground select-none", defaultClassNames.week_number),
        day: cn(
          "group/day relative size-(--cell-size) p-0 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-[var(--radius-md)] bg-surface-tinted", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-[var(--radius-md)] bg-surface-tinted", defaultClassNames.range_end),
        today: cn(defaultClassNames.today),
        outside: cn(defaultClassNames.outside),
        disabled: cn(defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-5", className)} {...props} />
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-5", className)} {...props} />
          }
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      className={cn(
        "relative flex size-(--cell-size) items-center justify-center rounded-[var(--radius-md)] text-[15px] text-foreground tabular-nums outline-none transition-colors duration-150",
        "hover:bg-secondary focus-visible:shadow-[var(--sombra-foco)]",
        "data-[outside]:text-muted-foreground",
        "data-[today]:font-bold data-[today]:text-primary data-[today]:shadow-[inset_0_0_0_1.5px_var(--color-primary)] data-[today]:focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-primary),var(--sombra-foco)]",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:font-bold data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary-hover",
        "disabled:cursor-not-allowed disabled:text-muted-icon disabled:line-through disabled:hover:bg-transparent",
        "aria-disabled:cursor-not-allowed aria-disabled:text-muted-icon aria-disabled:line-through aria-disabled:hover:bg-transparent",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }

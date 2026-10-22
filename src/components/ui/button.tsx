import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Las variantes con relleno o borde usan las clases de globals.css
// (.btn-primario, .btn-secundario, .btn-neutro, .btn-peligro, .btn-acento)
// para que un <Button> y un link con esas clases se vean igual.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border-[1.5px] border-transparent bg-clip-padding text-[15px] font-bold whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:shadow-[var(--sombra-foco)] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "btn-primario",
        secondary: "btn-secundario",
        outline: "btn-neutro",
        destructive: "btn-peligro",
        accent: "btn-acento",
        ghost: "text-foreground hover:bg-surface-tinted hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-[18px]",
        xs: "h-11 px-[18px]",
        sm: "h-11 px-[18px]",
        lg: "h-11 px-[18px]",
        icon: "size-11",
        "icon-xs": "size-11",
        "icon-sm": "size-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

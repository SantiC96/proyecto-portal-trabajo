import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "campo flex field-sizing-content min-h-24",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

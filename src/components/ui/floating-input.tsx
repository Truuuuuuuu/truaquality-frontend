import * as React from "react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FloatingLabelInputProps = React.ComponentProps<"input"> & {
  label: string
  containerClassName?: string
}

// A text input whose label lives inside the field at rest (vertically centered, standing in for a
// placeholder) and floats up into the field's own upper band on focus or once it has a value — never
// crossing or sitting on the border the way the classic Material outlined-label does. Detecting "has a
// value" is done in pure CSS via :placeholder-shown (the input always carries a single-space placeholder)
// so the float survives uncontrolled inputs and autofill, not just onChange.
function FloatingLabelInput({
  label,
  id,
  className,
  containerClassName,
  ...props
}: FloatingLabelInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        id={inputId}
        placeholder=" "
        className={cn(
          "peer h-12 px-3.5 pt-5 pb-1.5 text-base placeholder:text-transparent md:text-base",
          className
        )}
        {...props}
      />
      <Label
        htmlFor={inputId}
        className={cn(
          "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base font-normal text-muted-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-foreground",
          "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-muted-foreground",
          "peer-aria-invalid:text-destructive peer-aria-invalid:peer-focus:text-destructive"
        )}
      >
        {label}
      </Label>
    </div>
  )
}

export { FloatingLabelInput }

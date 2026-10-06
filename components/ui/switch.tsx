import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      nativeButton
      render={<button type="button" />}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-slate-300 bg-slate-200 p-0.5 transition-colors data-checked:border-black data-checked:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-3.5 rounded-full bg-white transition-transform data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

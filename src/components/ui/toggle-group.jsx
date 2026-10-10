"use client";
import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

/** @typedef {{ variant: "default" | "outline", size: "default" | "sm" | "lg" }} ToggleGroupStyle */
const ToggleGroupContext = React.createContext(/** @type {ToggleGroupStyle} */ ({
  size: "default",
  variant: "default",
}))

const ToggleGroup = React.forwardRef((
  /** @type {React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & { variant?: "default" | "outline", size?: "default" | "sm" | "lg" }} */
  { className, variant, size, children, ...props }, 
  ref
) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}>
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef((
  /** @type {React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & { variant?: "default" | "outline", size?: "default" | "sm" | "lg" }} */
  { className, children, variant, size, ...props }, 
  ref
) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    (<ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(toggleVariants({
        variant: context.variant || variant,
        size: context.size || size,
      }), className)}
      {...props}>
      {children}
    </ToggleGroupPrimitive.Item>)
  );
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }

"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "./utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full">
      {children}
    </ScrollAreaPrimitive.Viewport>

    {/* Vertical scrollbar pinned to the RIGHT and clipped by Root */}
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      className={cn(
        "absolute right-0 top-0 h-full w-2.5 touch-none select-none p-0.5",
        "transition-opacity data-[state=hidden]:opacity-0"
      )}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-muted-foreground/30" />
    </ScrollAreaPrimitive.Scrollbar>

    {/* Optional horizontal bar (kept for completeness, also clipped by Root) */}
    <ScrollAreaPrimitive.Scrollbar
      orientation="horizontal"
      className={cn(
        "absolute bottom-0 left-0 w-full h-2.5 touch-none select-none p-0.5",
        "transition-opacity data-[state=hidden]:opacity-0"
      )}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-muted-foreground/30" />
    </ScrollAreaPrimitive.Scrollbar>

    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
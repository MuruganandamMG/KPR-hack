import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui's locally owned Button pattern, styled with this application's tokens.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-emerald-800 text-white hover:bg-emerald-900",
        outline:
          "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
        ghost: "text-stone-600 hover:bg-stone-100",
      },
      size: { default: "min-h-11 px-5 py-2.5", sm: "min-h-9 px-3 py-2" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={twMerge(clsx(buttonVariants({ variant, size }), className))}
      {...props}
    />
  );
}

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        gold: "bg-gradient-to-b from-gold-300 to-gold-600 text-ink-950 shadow-[0_6px_0_-2px_rgba(143,113,29,0.6)] hover:brightness-110 glow-gold",
        purple:
          "bg-gradient-to-b from-neon-purple to-purple-700 text-white shadow-[0_6px_0_-2px_rgba(88,28,135,0.7)] hover:brightness-110 glow-purple",
        outline:
          "border border-gold-500/40 bg-ink-800/60 text-gold-100 hover:border-gold-400 hover:bg-ink-700/70",
        ghost:
          "text-text-secondary hover:bg-ink-700/60 hover:text-text-primary",
        danger: "bg-red-600/90 text-white hover:bg-red-500",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "gold", size: "md" },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

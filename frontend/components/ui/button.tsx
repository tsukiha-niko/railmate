import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/utils/cn";

const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground shadow-[0_10px_25px_-16px_color-mix(in_oklab,var(--primary)_65%,transparent)] hover:bg-primary/90 hover:shadow-[0_14px_28px_-18px_color-mix(in_oklab,var(--primary)_75%,transparent)]",
  secondary: "bg-secondary/85 text-secondary-foreground shadow-sm hover:bg-secondary",
  outline: "border border-input/80 bg-card/75 shadow-sm hover:bg-accent/80 hover:text-accent-foreground",
  ghost: "hover:bg-accent/70 hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground shadow-[0_10px_24px_-18px_color-mix(in_oklab,var(--destructive)_70%,transparent)] hover:bg-destructive/90",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes: Record<string, string> = {
  default: "h-10 px-4 py-2 text-sm rounded-xl",
  sm: "h-9 px-3 text-xs rounded-lg",
  lg: "h-11 px-6 text-base rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.99]",
          variants[variant],
          sizes[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

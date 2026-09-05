import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "custom";
  size?: "default" | "sm" | "lg" | "icon" | "custom";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "custom", size = "custom", ...props }, ref) => {
  return (
    <button
      className={cn(
        // Base tactile styles
        variant !== "custom" && "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-black transition-all disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-1 hover:shadow-lg active:translate-y-1 group",
        {
          "bg-blue-500 hover:bg-blue-600 text-white border-b-4 border-blue-700 active:border-b-0 active:border-t-4 active:border-t-transparent": variant === "default",
          "bg-red-500 hover:bg-red-600 text-white border-b-4 border-red-700 active:border-b-0 active:border-t-4 active:border-t-transparent": variant === "destructive",
          "bg-white hover:bg-slate-50 text-slate-700 border-2 border-b-4 border-slate-200 active:border-b-2 active:border-t-4 active:border-t-transparent hover:border-slate-300": variant === "outline",
          "bg-indigo-500 hover:bg-indigo-600 text-white border-b-4 border-indigo-700 active:border-b-0 active:border-t-4 active:border-t-transparent": variant === "secondary",
          "text-slate-600 hover:bg-slate-100 hover:-translate-y-0 active:translate-y-0": variant === "ghost",
          "text-blue-600 underline-offset-4 hover:underline hover:-translate-y-0 active:translate-y-0": variant === "link",
        },
        {
          "h-12 px-6 py-3 text-base": size === "default",
          "h-10 rounded-xl px-4 text-sm": size === "sm",
          "h-16 rounded-2xl px-8 text-xl": size === "lg",
          "h-12 w-12": size === "icon",
        },
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };

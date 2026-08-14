import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "custom";
  size?: "default" | "sm" | "lg" | "icon" | "custom";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        {
          "bg-blue-600 text-white hover:bg-blue-700 shadow-sm": variant === "default",
          "bg-red-600 text-white hover:bg-red-700 shadow-sm": variant === "destructive",
          "border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm": variant === "outline",
          "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm": variant === "secondary",
          "text-slate-600 hover:bg-slate-100": variant === "ghost",
          "text-blue-600 underline-offset-4 hover:underline": variant === "link",
        },
        {
          "h-12 px-6 py-3 text-base": size === "default",
          "h-10 rounded-lg px-4 text-sm": size === "sm",
          "h-14 rounded-2xl px-8 text-lg": size === "lg",
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

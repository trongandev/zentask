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
        // Base styles are minimal to allow existing custom buttons to look identical,
        // only add base styles when a specific variant/size is chosen.
        variant !== "custom" && "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        {
          "bg-blue-600 text-white hover:bg-blue-700 shadow-sm": variant === "default",
          "bg-red-600 text-white hover:bg-red-700 shadow-sm": variant === "destructive",
          "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm": variant === "outline",
          "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm": variant === "secondary",
          "text-gray-600 hover:bg-gray-100": variant === "ghost",
          "text-blue-600 underline-offset-4 hover:underline": variant === "link",
        },
        {
          "h-10 px-5 py-2.5": size === "default",
          "h-9 rounded-lg px-3 text-sm": size === "sm",
          "h-12 rounded-xl px-8 text-lg": size === "lg",
          "h-10 w-10": size === "icon",
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

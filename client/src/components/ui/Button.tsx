import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "ghost" | "outline";
    loading?: boolean;
    icon?: ReactNode;
}

export default function Button({
    children,
    variant = "primary",
    loading = false,
    icon,
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold",
                "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                variant === "primary" && [
                    "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25",
                    "hover:from-primary-700 hover:to-primary-600 hover:shadow-xl hover:shadow-primary-500/30",
                    "focus:ring-primary-500",
                    "active:scale-[0.98]",
                ],
                variant === "ghost" && [
                    "text-text-secondary",
                    "hover:bg-primary-50 hover:text-primary-700",
                    "focus:ring-primary-200",
                ],
                variant === "outline" && [
                    "border border-border text-text-secondary",
                    "hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700",
                    "focus:ring-primary-200",
                ],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Please wait…</span>
                </>
            ) : (
                <>
                    {icon}
                    {children}
                </>
            )}
        </button>
    );
}

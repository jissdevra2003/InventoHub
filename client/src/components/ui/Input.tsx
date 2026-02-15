import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className, id, ...props }, ref) => {
        const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="space-y-1.5">
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-text-secondary"
                >
                    {label}
                </label>
                <div className="relative">
                    {icon && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary",
                            "placeholder:text-text-muted",
                            "outline-none transition-all duration-200",
                            "focus:border-border-focus focus:ring-2 focus:ring-primary-200",
                            "hover:border-primary-300",
                            icon && "pl-10",
                            error && "border-error focus:border-error focus:ring-error/20",
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="flex items-center gap-1 text-xs text-error animate-in fade-in slide-in-from-top-1">
                        <svg
                            className="h-3.5 w-3.5 shrink-0"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;

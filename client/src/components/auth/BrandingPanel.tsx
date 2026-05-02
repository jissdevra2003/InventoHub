import { Boxes } from "lucide-react";

// ─── Branding Panel ───
// WHY a shared component? Both Login and Register use the exact same left-side
// branding. Extracting it avoids 50+ lines of duplication between the two pages.
// Only visible on large screens (hidden on mobile via `hidden lg:flex`).

interface BrandingPanelProps {
    /** Hero headline — differs between Login ("Welcome back") and Register ("Manage your inventory smarter"). */
    headline: React.ReactNode;
    /** Subtext below the headline. */
    subtext: string;
}

export default function BrandingPanel({ headline, subtext }: BrandingPanelProps) {
    return (
        <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-10 text-white relative overflow-hidden">

            {/* Decorative blurs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-700/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary-600/15 blur-2xl" />

            {/* Logo */}
            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                        <Boxes className="h-6 w-6 text-primary-200" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">InventoHub</span>
                </div>
            </div>

            {/* Hero text */}
            <div className="relative z-10 space-y-6">
                <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                    {headline}
                </h1>
                <p className="max-w-sm text-base leading-relaxed text-primary-200/80">
                    {subtext}
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-3 pt-2">
                    {["Multi-shop support", "Role-based access", "Real-time tracking"].map((feat) => (
                        <span
                            key={feat}
                            className="rounded-full border border-primary-600/40 bg-primary-800/40 px-4 py-1.5 text-xs font-medium text-primary-200 backdrop-blur-sm"
                        >
                            {feat}
                        </span>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 text-xs text-primary-400">
                © {new Date().getFullYear()} InventoHub. All rights reserved.
            </div>
        </div>
    );
}

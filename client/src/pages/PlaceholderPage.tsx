import { motion } from "framer-motion";
import { Construction } from "lucide-react";

// ─── Placeholder Page ───
// WHY? Every sidebar link needs a matching route. Pages that haven't been
// built yet render this placeholder so the user stays inside the app
// instead of being kicked to the login screen by the catch-all redirect.

interface PlaceholderPageProps {
    title: string;
    description?: string;
}

export default function PlaceholderPage({
    title,
    description = "This page is under development and will be available soon.",
}: PlaceholderPageProps) {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-md text-center"
            >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 ring-4 ring-primary-100">
                    <Construction className="h-8 w-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {description}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-text-secondary">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    Coming Soon
                </div>
            </motion.div>
        </div>
    );
}

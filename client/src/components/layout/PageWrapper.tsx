import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// ─── Page Wrapper ───
// WHY? Consistent padding and max-width for every page's content.
// Instead of adding p-6 and max-w-7xl to every page, wrap with this.
//
// USAGE:
//   <PageWrapper title="Dashboard">
//     <StatCards />
//     <RecentOrders />
//   </PageWrapper>

interface PageWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Optional content rendered to the right of the title (e.g., buttons). */
  actions?: ReactNode;
}

export default function PageWrapper({
  title,
  description,
  children,
  className,
  actions,
}: PageWrapperProps) {
  return (
    <div className={cn("mx-auto max-w-7xl px-6 py-6", className)}>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}

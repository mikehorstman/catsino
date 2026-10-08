import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeading({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-text-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {href && action && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
        >
          {action}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

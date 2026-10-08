import { SectionHeading } from "@/components/casino/section-heading";

/** Consistent page container. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</div>;
}

export { SectionHeading };

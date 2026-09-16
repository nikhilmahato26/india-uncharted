import { cn } from "@/lib/cn";

const STYLES: Record<string, string> = {
  NEW: "border-terracotta-600/40 bg-terracotta-50 text-terracotta-800",
  CONTACTED: "border-gold-500/40 bg-gold-100 text-warning",
  QUOTED: "border-forest-400/40 bg-forest-50 text-forest-800",
  CONFIRMED: "border-success/40 bg-success-soft text-success",
  COMPLETED: "border-ink/25 bg-paper-3 text-ink-2",
  LOST: "border-ink/15 bg-paper-2 text-ink-3",
};

/** Stage is never colour alone — the word is always there too. */
export function EnquiryStatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-caption font-semibold", STYLES[status] ?? STYLES.NEW)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

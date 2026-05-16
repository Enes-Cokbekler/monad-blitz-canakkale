import { clsx } from "clsx";

export type StatusBadgeVariant = "verified" | "not_verified" | "expired" | "pending";

const variantStyles: Record<StatusBadgeVariant, string> = {
  verified:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  not_verified:
    "border-surface-border bg-surface-secondary text-text-muted",
  expired:
    "border-amber-500/30 bg-amber-500/10 text-amber-400",
  pending:
    "border-monad-purple/30 bg-monad-purple/10 text-monad-purple-light",
};

const variantLabels: Record<StatusBadgeVariant, string> = {
  verified: "Verified",
  not_verified: "Not Verified",
  expired: "Expired",
  pending: "Pending",
};

type StatusBadgeProps = {
  variant: StatusBadgeVariant;
  label?: string;
  className?: string;
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
    >
      <span
        className={clsx("h-1.5 w-1.5 rounded-full", {
          "bg-emerald-400": variant === "verified",
          "bg-text-muted": variant === "not_verified",
          "bg-amber-400": variant === "expired",
          "animate-pulse bg-monad-purple": variant === "pending",
        })}
      />
      {label ?? variantLabels[variant]}
    </span>
  );
}
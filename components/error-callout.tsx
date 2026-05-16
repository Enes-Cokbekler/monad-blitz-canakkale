import { clsx } from "clsx";

type ErrorCalloutProps = {
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info";
  className?: string;
};

const variantStyles = {
  error: "border-error/30 bg-error/5 text-error",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  info: "border-monad-cyan/30 bg-monad-cyan/5 text-monad-cyan",
};

const variantIcons = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

export function ErrorCallout({
  title,
  message,
  variant = "error",
  className,
}: ErrorCalloutProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-lg border px-4 py-3 text-sm",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base leading-none" aria-hidden="true">
          {variantIcons[variant]}
        </span>
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <p className={title ? "mt-0.5 text-text-secondary" : ""}>{message}</p>
        </div>
      </div>
    </div>
  );
}
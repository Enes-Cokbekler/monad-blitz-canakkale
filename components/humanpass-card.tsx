import { clsx } from "clsx";
import { StatusBadge, type StatusBadgeVariant } from "./status-badge";

type HumanPassCardProps = {
  status: StatusBadgeVariant;
  txHash?: string;
  validUntil?: number;
  chainName?: string;
  className?: string;
};

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs}s remaining`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function HumanPassCard({
  status,
  txHash,
  validUntil,
  chainName,
  className,
}: HumanPassCardProps) {
  return (
    <div
      className={clsx(
        "card-base bg-card-shine animate-fade-in",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">HumanPass Proof</h3>
        <StatusBadge variant={status} />
      </div>

      <div className="space-y-3 text-sm">
        {txHash && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Transaction</span>
            <span className="font-mono text-monad-cyan">
              {truncateHash(txHash)}
            </span>
          </div>
        )}

        {validUntil && validUntil > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Expires</span>
            <span
              className={
                status === "expired"
                  ? "text-error"
                  : status === "verified"
                    ? "text-emerald-400"
                    : "text-text-secondary"
              }
            >
              {formatExpiry(validUntil)}
            </span>
          </div>
        )}

        {chainName && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Network</span>
            <span className="text-text-secondary">{chainName}</span>
          </div>
        )}
      </div>

      {status === "verified" && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-secondary">
          <div className="h-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan transition-all duration-1000" />
        </div>
      )}
    </div>
  );
}
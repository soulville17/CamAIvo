import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface PlanUsageCardProps {
  email: string;
  plan: string;
  pointsBalance: number;
  pointsQuota: number;
  /** Barème : points consommés par minute de swap */
  pointsPerMinute?: number;
}

/** Mini-carte user en bas de sidebar : email, plan, barre de quota, minutes restantes. */
export function PlanUsageCard({
  email,
  plan,
  pointsBalance,
  pointsQuota,
  pointsPerMinute = 20,
}: PlanUsageCardProps) {
  const minutesLeft = Math.floor(pointsBalance / pointsPerMinute);
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-snow" title={email}>
          {email}
        </p>
        <Badge variant="plan">{plan}</Badge>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Points restants</span>
          <span className="font-semibold tabular-nums text-snow">
            {pointsBalance.toLocaleString("fr-FR")}/{pointsQuota.toLocaleString("fr-FR")}
          </span>
        </div>
        <ProgressBar value={pointsBalance} max={pointsQuota} />
        <p className="text-[11px] text-muted">
          +{minutesLeft} min de swap
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Coins, Radio, UserRound } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Alert } from "@/components/ui/Alert";
import { DailyPointsChart } from "@/components/stats/DailyPointsChart";
import { fetchStats, type StatsData } from "@/features/stats/statsApi";
import { formatPoints } from "@/lib/format";

function formatTotalTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  const s = totalSeconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")}` : `${s} s`;
}

interface KpiTileProps {
  icon: typeof Clock;
  label: string;
  value: string;
  detail?: string;
}

function KpiTile({ icon: Icon, label, value, detail }: KpiTileProps) {
  return (
    <GlassPanel className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span className="font-display text-2xl font-bold text-snow">{value}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </GlassPanel>
  );
}

/** STATISTIQUES — KPI + consommation par jour (30 j). */
export function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchStats().then(({ stats, error }) => {
      if (cancelled) return;
      setStats(stats);
      setError(error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        title="Statistiques"
        subtitle="Ton activité de swap en un coup d'œil"
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={Clock}
              label="Temps de swap total"
              value={formatTotalTime(stats.totalSeconds)}
            />
            <KpiTile
              icon={Coins}
              label="Points consommés"
              value={`${formatPoints(stats.pointsMonth)} pts`}
              detail={`Aujourd'hui : ${formatPoints(stats.pointsToday)} · 7 j : ${formatPoints(stats.pointsWeek)}`}
            />
            <KpiTile
              icon={Radio}
              label="Sessions"
              value={String(stats.totalSessions)}
              detail="sessions terminées"
            />
            <KpiTile
              icon={UserRound}
              label="Avatar favori"
              value={stats.topAvatar?.name ?? "—"}
              detail={
                stats.topAvatar
                  ? `${stats.topAvatar.sessions} session${stats.topAvatar.sessions > 1 ? "s" : ""}`
                  : "aucune session"
              }
            />
          </div>

          <GlassPanel className="mt-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
              Points consommés par jour — 30 derniers jours
            </h2>
            <DailyPointsChart data={stats.daily} />
          </GlassPanel>
        </>
      ) : null}
    </motion.div>
  );
}

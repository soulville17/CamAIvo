import { supabase } from "@/lib/supabase";

export interface DailyPoints {
  /** Date au format YYYY-MM-DD (heure locale) */
  date: string;
  points: number;
}

export interface StatsData {
  totalSeconds: number;
  totalSessions: number;
  pointsToday: number;
  pointsWeek: number;
  pointsMonth: number;
  topAvatar: { name: string; sessions: number } | null;
  /** Points consommés par jour, 30 derniers jours (jours vides inclus) */
  daily: DailyPoints[];
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Agrège swap_sessions + point_transactions (30 j) côté client. */
export async function fetchStats(): Promise<{
  stats: StatsData | null;
  error: string | null;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [sessionsRes, txRes] = await Promise.all([
    supabase
      .from("swap_sessions")
      .select("duration_seconds, avatar_id, avatars(name)")
      .eq("status", "ended")
      .limit(1000),
    supabase
      .from("point_transactions")
      .select("amount, created_at")
      .eq("type", "consumption")
      .gte("created_at", since.toISOString())
      .limit(5000),
  ]);

  if (sessionsRes.error || txRes.error) {
    return { stats: null, error: "Impossible de charger les statistiques." };
  }

  type SessionRow = {
    duration_seconds: number;
    avatar_id: string | null;
    avatars: { name: string } | null;
  };
  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  const transactions = (txRes.data ?? []) as { amount: number; created_at: string }[];

  // KPI sessions
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const totalSessions = sessions.length;

  // Avatar le plus utilisé
  const byAvatar = new Map<string, { name: string; sessions: number }>();
  for (const s of sessions) {
    if (!s.avatar_id) continue;
    const entry = byAvatar.get(s.avatar_id) ?? {
      name: s.avatars?.name ?? "Avatar supprimé",
      sessions: 0,
    };
    entry.sessions += 1;
    byAvatar.set(s.avatar_id, entry);
  }
  const topAvatar =
    [...byAvatar.values()].sort((a, b) => b.sessions - a.sessions)[0] ?? null;

  // Consommation par jour (30 jours, jours vides à 0)
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dailyMap.set(localDateKey(d), 0);
  }
  const now = new Date();
  const todayKey = localDateKey(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  let pointsToday = 0;
  let pointsWeek = 0;
  let pointsMonth = 0;

  for (const tx of transactions) {
    const spent = Math.abs(tx.amount);
    const created = new Date(tx.created_at);
    const key = localDateKey(created);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + spent);
    pointsMonth += spent;
    if (created >= weekStart) pointsWeek += spent;
    if (key === todayKey) pointsToday += spent;
  }

  return {
    stats: {
      totalSeconds,
      totalSessions,
      pointsToday,
      pointsWeek,
      pointsMonth,
      topAvatar,
      daily: [...dailyMap.entries()].map(([date, points]) => ({ date, points })),
    },
    error: null,
  };
}

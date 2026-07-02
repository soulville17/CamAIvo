import { useMemo, useState } from "react";
import type { DailyPoints } from "@/features/stats/statsApi";
import { formatPoints } from "@/lib/format";

/** Couleur validée (OKLCH L 0.48–0.67, contraste ≥ 3:1 sur #0E1117). */
const BAR_COLOR = "#E5541B";
const BAR_HOVER = "#FF6A2E";

const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 26, left: 40 };

function fmtDay(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Points consommés par jour (30 j) — barres fines, tooltip au survol. */
export function DailyPointsChart({ data }: { data: DailyPoints[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { max, ticks } = useMemo(() => {
    const rawMax = Math.max(...data.map((d) => d.points), 0);
    // Échelle "propre" : arrondit le max à un multiple lisible
    const niceMax = rawMax <= 0 ? 100 : Math.ceil(rawMax / 50) * 50;
    return { max: niceMax, ticks: [0, niceMax / 2, niceMax] };
  }, [data]);

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const step = plotW / data.length;
  const barW = Math.max(step - 2, 4); // 2px d'écart entre barres

  const hasData = data.some((d) => d.points > 0);
  const hoveredPoint = hovered !== null ? data[hovered] : undefined;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="min-w-[560px] w-full"
        role="img"
        aria-label="Points consommés par jour sur les 30 derniers jours"
      >
        {/* Grille horizontale discrète + valeurs d'axe */}
        {ticks.map((t) => {
          const y = MARGIN.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="#9AA0AA"
              >
                {formatPoints(t)}
              </text>
            </g>
          );
        })}

        {/* Barres */}
        {data.map((d, i) => {
          const h = max > 0 ? (d.points / max) * plotH : 0;
          const x = MARGIN.left + i * step + (step - barW) / 2;
          const y = MARGIN.top + plotH - h;
          return (
            <g key={d.date}>
              {/* Zone de survol pleine hauteur (cible plus grande que la barre) */}
              <rect
                x={MARGIN.left + i * step}
                y={MARGIN.top}
                width={step}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {d.points > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={Math.min(4, barW / 2)}
                  fill={hovered === i ? BAR_HOVER : BAR_COLOR}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Étiquettes x : 1 jour sur 7 */}
        {data.map((d, i) =>
          i % 7 === 0 ? (
            <text
              key={d.date}
              x={MARGIN.left + i * step + step / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#9AA0AA"
            >
              {fmtDay(d.date)}
            </text>
          ) : null,
        )}

        {!hasData && (
          <text
            x={MARGIN.left + plotW / 2}
            y={MARGIN.top + plotH / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#9AA0AA"
          >
            Pas encore de consommation — lance ton premier swap !
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && hoveredPoint.points > 0 && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-glass-border bg-ink-soft px-2.5 py-1.5 text-xs shadow-glass"
          style={{
            left: `${((MARGIN.left + (hovered ?? 0) * step + step / 2) / WIDTH) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-muted">{fmtDay(hoveredPoint.date)} · </span>
          <span className="font-bold text-snow">
            {formatPoints(hoveredPoint.points)} pts
          </span>
        </div>
      )}
    </div>
  );
}

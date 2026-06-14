"use client";

// Interactieve omzet + leads-lijngrafiek (port van PLineChart). De periode
// onder de muis wordt uitgelicht met een tooltip (hover scrubt langs de
// punten); klikken werkt ook nog. Inline geometrie (assen, paden, posities)
// is toegestaan voor charts.

import type { MouseEvent } from "react";
import type { PeriodeReeks } from "./analyses-data";
import styles from "./OmzetLeadsChart.module.css";

interface OmzetLeadsChartProps {
  p: PeriodeReeks;
  hi: number;
  onPick: (i: number) => void;
}

const W = 1240;
const H = 360;
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 26;
const PAD_B = 38;

export function OmzetLeadsChart({ p, hi, onPick }: OmzetLeadsChartProps) {
  const n = p.omzet.length;
  const x = (i: number) => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
  const yO = (v: number) => PAD_T + (1 - v / p.max) * (H - PAD_T - PAD_B);
  const yL = (v: number) => PAD_T + (1 - v / p.lmax) * (H - PAD_T - PAD_B);

  const ptsO = p.omzet.map((v, i) => `${x(i)},${yO(v)}`).join(" ");
  const ptsL = p.leads.map((v, i) => `${x(i)},${yL(v)}`).join(" ");
  const areaO = `${PAD_L},${H - PAD_B} ${ptsO} ${W - PAD_R},${H - PAD_B}`;
  const stappen = Array.from({ length: p.max + 1 }, (_, i) => i);

  // Hover: licht het punt uit dat het dichtst bij de muis-x ligt (de SVG
  // schaalt via viewBox, dus reken de muispositie terug naar het puntindex).
  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || n < 2) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const span = W - PAD_L - PAD_R;
    const frac = (svgX - PAD_L) / span;
    const i = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    if (i !== hi) onPick(i);
  }

  return (
    <div className={styles.wrap}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        onMouseMove={handleMove}
      >
        <defs>
          <linearGradient id="rbOmzetVlak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(26,86,255,0.22)" />
            <stop offset="100%" stopColor="rgba(26,86,255,0)" />
          </linearGradient>
        </defs>

        {/* horizontale gridlijnen + y-as labels */}
        {stappen.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={yO(v)}
              x2={W - PAD_R}
              y2={yO(v)}
              stroke="rgba(33,42,69,0.07)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 10}
              y={yO(v) + 4}
              textAnchor="end"
              className={styles.axisText}
            >
              €{v}k
            </text>
          </g>
        ))}

        {/* x-as labels */}
        {p.labels.map((l, i) =>
          l ? (
            <text
              key={i}
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              className={i === hi ? styles.axisTextActive : styles.axisText}
            >
              {l}
            </text>
          ) : null
        )}

        {/* omzet: vlak + lijn */}
        <polygon points={areaO} fill="url(#rbOmzetVlak)" />
        <polyline
          points={ptsO}
          fill="none"
          stroke="var(--rb-blue)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* leads: gestippelde lijn */}
        <polyline
          points={ptsL}
          fill="none"
          stroke="var(--rb-cyan)"
          strokeWidth={2.5}
          strokeDasharray="2 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* uitgelichte verticale lijn */}
        <line
          x1={x(hi)}
          y1={PAD_T - 4}
          x2={x(hi)}
          y2={H - PAD_B}
          stroke="rgba(26,86,255,0.25)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* klikbare punten op de omzetlijn */}
        {p.omzet.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={yO(v)}
            r={i === hi ? 8 : 6}
            fill={i === hi ? "var(--rb-blue)" : "#fff"}
            stroke="var(--rb-blue)"
            strokeWidth={2.5}
            className={styles.dot}
            onClick={() => onPick(i)}
          />
        ))}
      </svg>

      {/* tooltip bij uitgelichte punt */}
      <div
        className={styles.tooltip}
        style={{ left: `${(x(hi) / W) * 100}%` }}
      >
        {p.labels[hi] || `punt ${hi + 1}`} ·{" "}
        <span className={styles.tipOmzet}>€{p.omzet[hi]}k omzet</span> ·{" "}
        <span className={styles.tipLeads}>{p.leads[hi]} leads</span>
      </div>
    </div>
  );
}

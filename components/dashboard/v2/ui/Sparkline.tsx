// Mini-sparkline (SVG polyline, geen library). Port van RBSpark uit de
// design-handoff. Dynamische geometrie (punten) via SVG-attributen,
// conform de bestaande chart-componenten (ui/Donut, ui/Sparkline).

interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  /** Lijnkleur; geef een token mee, bv. "var(--rb-blue)". */
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function Sparkline({
  data = [4, 6, 5, 8, 7, 10, 9, 12, 11, 14],
  width = 120,
  height = 36,
  stroke = "var(--rb-blue)",
  strokeWidth = 2,
  opacity = 1,
}: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((v - min) / span) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    </svg>
  );
}

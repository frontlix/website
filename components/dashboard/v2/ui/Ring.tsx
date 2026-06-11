// Voortgangsring / donut (SVG). Port van RBRing uit de design-handoff.
// Dynamische geometrie (size, dasharray, label-grootte) via inline style /
// SVG-attributen, conform ui/Donut.tsx in deze codebase.

interface RingProps {
  pct?: number;
  size?: number;
  stroke?: number;
  /** Boogkleur; geef een token mee, bv. "var(--rb-blue)". */
  color?: string;
  track?: string;
  label?: React.ReactNode;
  sub?: React.ReactNode;
  labelColor?: string;
}

export function Ring({
  pct = 51,
  size = 92,
  stroke = 9,
  color = "var(--rb-blue)",
  track = "rgba(33,42,69,0.08)",
  label,
  sub,
  labelColor = "inherit",
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: size * 0.2, color: labelColor }}>{label}</span>
        {sub ? <span style={{ fontSize: size * 0.1, opacity: 0.6 }}>{sub}</span> : null}
      </div>
    </div>
  );
}

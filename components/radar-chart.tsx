import { DIMENSIONS, dimensionMeta, type Dimension } from "@/lib/assessment";

type RadarChartProps = {
  scores: Record<Dimension, number>;
  color?: string;
};

export function RadarChart({ scores, color = "#cf6843" }: RadarChartProps) {
  const center = 140;
  const radius = 92;
  const pointFor = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / DIMENSIONS.length;
    const r = radius * (value / 100);
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] as const;
  };
  const polygon = DIMENSIONS.map((dimension, index) => pointFor(index, scores[dimension]).join(",")).join(" ");

  return (
    <svg className="radar" viewBox="0 0 280 280" role="img" aria-label="六维人格雷达图">
      {[20, 40, 60, 80, 100].map((level) => (
        <polygon
          key={level}
          points={DIMENSIONS.map((_, index) => pointFor(index, level).join(",")).join(" ")}
          fill="none"
          stroke="rgba(36, 42, 56, 0.12)"
          strokeWidth="1"
        />
      ))}
      {DIMENSIONS.map((_, index) => {
        const [x, y] = pointFor(index, 100);
        return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="rgba(36, 42, 56, 0.1)" />;
      })}
      <polygon points={polygon} fill={`${color}36`} stroke={color} strokeWidth="3" strokeLinejoin="round" />
      {DIMENSIONS.map((dimension, index) => {
        const [x, y] = pointFor(index, scores[dimension]);
        const [labelX, labelY] = pointFor(index, 124);
        return (
          <g key={dimension}>
            <circle cx={x} cy={y} r="4" fill={color} stroke="#fffaf2" strokeWidth="2" />
            <text x={labelX} y={labelY - 2} textAnchor="middle" className="radar-label">
              {dimensionMeta[dimension].short}
            </text>
            <text x={labelX} y={labelY + 13} textAnchor="middle" className="radar-value">
              {scores[dimension]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

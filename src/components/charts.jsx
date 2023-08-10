// THS Data Commons: charts.
// Hand-built SVG so every mark follows the design tokens. Series colors come
// from --color-series-*; numerals are tabular via the .data-num class.

const W = 720;
const H = 400;
const M = { top: 24, right: 24, bottom: 48, left: 64 };

const niceTicks = (min, max, count = 5) => {
  if (min === max) return [min];
  const span = max - min;
  const step = 10 ** Math.floor(Math.log10(span / count));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const ticks = [];
  for (let v = Math.ceil(min / s) * s; v <= max + s * 0.001; v += s) {
    ticks.push(Math.round(v / s) * s);
  }
  return ticks;
};

const fmt = (v) => {
  // Years are never grouped: 2019, not 2,019.
  if (Number.isInteger(v) && v >= 1000 && v <= 2100) return String(v);
  return Math.abs(v) >= 1000
    ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const frame = (xTicks, yTicks, xScale, yScale, xLabel, yLabel, xFormat = fmt) => (
  <g>
    {yTicks.map((t) => (
      <g key={`y${t}`}>
        <line
          x1={M.left}
          x2={W - M.right}
          y1={yScale(t)}
          y2={yScale(t)}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        <text
          x={M.left - 10}
          y={yScale(t) + 4}
          textAnchor="end"
          fontSize="12"
          fill="var(--color-text-muted)"
          className="data-num"
        >
          {fmt(t)}
        </text>
      </g>
    ))}
    {xTicks.map((t) => (
      <text
        key={`x${t}`}
        x={xScale(t)}
        y={H - M.bottom + 22}
        textAnchor="middle"
        fontSize="12"
        fill="var(--color-text-muted)"
        className="data-num"
      >
        {xFormat(t)}
      </text>
    ))}
    <text
      x={(M.left + W - M.right) / 2}
      y={H - 8}
      textAnchor="middle"
      fontSize="12.5"
      fill="var(--color-text-secondary)"
    >
      {xLabel}
    </text>
    <text
      x={16}
      y={(M.top + H - M.bottom) / 2}
      textAnchor="middle"
      fontSize="12.5"
      fill="var(--color-text-secondary)"
      transform={`rotate(-90 16 ${(M.top + H - M.bottom) / 2})`}
    >
      {yLabel}
    </text>
  </g>
);

export const LineChart = ({ series, xLabel, yLabel }) => {
  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, Math.min(...ys));
  const yMax = Math.max(...ys);
  const xScale = (v) =>
    M.left + ((v - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
  const yScale = (v) =>
    H - M.bottom - ((v - yMin) / (yMax - yMin || 1)) * (H - M.top - M.bottom);
  const xTicks = niceTicks(xMin, xMax);
  const yTicks = niceTicks(yMin, yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {frame(
        xTicks,
        yTicks,
        xScale,
        yScale,
        xLabel,
        yLabel,
        (t) => String(Math.round(t)),
      )}
      {series.map((s, i) => {
        const pts = s.points.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(' ');
        return (
          <g key={s.label}>
            <polyline
              points={pts}
              fill="none"
              stroke={`var(--color-series-${i + 1})`}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {s.points.map((p) => (
              <circle
                key={`${s.label}-${p.x}`}
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                r="4"
                fill={`var(--color-series-${i + 1})`}
              >
                <title>{`${s.label}: ${fmt(p.y)} (${p.x})`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
};

export const ScatterPlot = ({ points, fit, xLabel, yLabel }) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const pad = (yMax - yMin) * 0.1 || 1;
  const xScale = (v) =>
    M.left + ((v - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
  const yScale = (v) =>
    H - M.bottom - ((v - (yMin - pad)) / (yMax - yMin + 2 * pad || 1)) * (H - M.top - M.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} against ${xLabel}`}>
      {frame(
        niceTicks(xMin, xMax),
        niceTicks(yMin - pad, yMax + pad),
        xScale,
        yScale,
        xLabel,
        yLabel,
      )}
      {fit && (
        <line
          x1={xScale(xMin)}
          y1={yScale(fit.intercept + fit.slope * xMin)}
          x2={xScale(xMax)}
          y2={yScale(fit.intercept + fit.slope * xMax)}
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
      )}
      {points.map((p) => (
        <circle
          key={`${p.x}-${p.y}`}
          cx={xScale(p.x)}
          cy={yScale(p.y)}
          r="6"
          fill="var(--color-series-1)"
          fillOpacity="0.85"
        >
          <title>{`${xLabel}: ${fmt(p.x)} · ${yLabel}: ${fmt(p.y)}${p.note ? ` · ${p.note}` : ''}`}</title>
        </circle>
      ))}
    </svg>
  );
};

export const BarChart = ({ bars, xLabel, yLabel, color = 'var(--color-series-1)' }) => {
  const yMax = Math.max(...bars.map((b) => b.y));
  const innerW = W - M.left - M.right;
  const band = innerW / bars.length;
  const yScale = (v) =>
    H - M.bottom - (v / (yMax || 1)) * (H - M.top - M.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {niceTicks(0, yMax).map((t) => (
        <g key={t}>
          <line
            x1={M.left}
            x2={W - M.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--color-border)"
          />
          <text
            x={M.left - 10}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize="12"
            fill="var(--color-text-muted)"
            className="data-num"
          >
            {fmt(t)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => (
        <g key={b.label}>
          <rect
            x={M.left + i * band + band * 0.15}
            y={yScale(b.y)}
            width={band * 0.7}
            height={H - M.bottom - yScale(b.y)}
            rx="4"
            fill={color}
          >
            <title>{`${b.label}: ${fmt(b.y)}`}</title>
          </rect>
          <text
            x={M.left + i * band + band / 2}
            y={H - M.bottom + 18}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-text-muted)"
            transform={`rotate(-40 ${M.left + i * band + band / 2} ${H - M.bottom + 18})`}
          >
            {b.label.length > 16 ? `${b.label.slice(0, 15)}…` : b.label}
          </text>
        </g>
      ))}
      <text
        x={(M.left + W - M.right) / 2}
        y={H - 4}
        textAnchor="middle"
        fontSize="12.5"
        fill="var(--color-text-secondary)"
      >
        {xLabel}
      </text>
    </svg>
  );
};

export const CoefficientPlot = ({ rows, xLabel, yLabel }) => {
  const lows = rows.map((r) => r.beta - 2 * r.se);
  const highs = rows.map((r) => r.beta + 2 * r.se);
  const xMin = Math.min(0, ...lows);
  const xMax = Math.max(0, ...highs);
  const xScale = (v) =>
    M.left + ((v - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
  const band = (H - M.top - M.bottom) / rows.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {niceTicks(xMin, xMax).map((t) => (
        <g key={t}>
          <line
            x1={xScale(t)}
            x2={xScale(t)}
            y1={M.top}
            y2={H - M.bottom}
            stroke="var(--color-border)"
          />
          <text
            x={xScale(t)}
            y={H - M.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-text-muted)"
            className="data-num"
          >
            {fmt(t)}
          </text>
        </g>
      ))}
      <line
        x1={xScale(0)}
        x2={xScale(0)}
        y1={M.top}
        y2={H - M.bottom}
        stroke="var(--color-text-muted)"
        strokeWidth="1.5"
      />
      {rows.map((r, i) => (
        <g key={`${r.section}-${r.variable}-${i}`}>
          <text
            x={M.left - 10}
            y={M.top + i * band + band / 2 + 4}
            textAnchor="end"
            fontSize="11.5"
            fill="var(--color-text-secondary)"
          >
            {r.variable.length > 18 ? `${r.variable.slice(0, 17)}…` : r.variable}
          </text>
          <line
            x1={xScale(r.beta - 2 * r.se)}
            x2={xScale(r.beta + 2 * r.se)}
            y1={M.top + i * band + band / 2}
            y2={M.top + i * band + band / 2}
            stroke="var(--color-series-1)"
            strokeWidth="2"
          />
          <circle
            cx={xScale(r.beta)}
            cy={M.top + i * band + band / 2}
            r="5"
            fill="var(--color-series-1)"
          >
            <title>{`${r.variable}: β = ${fmt(r.beta)} (± ${fmt(2 * r.se)} at 95%)`}</title>
          </circle>
        </g>
      ))}
      <text
        x={(M.left + W - M.right) / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize="12.5"
        fill="var(--color-text-secondary)"
      >
        {xLabel}
      </text>
    </svg>
  );
};

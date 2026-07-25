import { useState, useCallback, useRef, useId, useMemo } from 'react';
import './SensorChart.css';

const SVG_W = 400;
const SVG_H = 90;

/**
 * Maps a data value to SVG Y coordinate (top = high value).
 */
function valToY(val, yMin, yMax) {
  const clamped = Math.max(yMin, Math.min(yMax, val));
  return SVG_H - ((clamped - yMin) / (yMax - yMin)) * SVG_H;
}

/**
 * Maps index 0..N-1 to SVG X coordinate.
 */
function idxToX(i, total) {
  return (i / (total - 1)) * SVG_W;
}

/**
 * Builds SVG polyline points string from data array.
 */
function buildPoints(data, yMin, yMax) {
  return data
    .map((pt, i) => `${idxToX(i, data.length)},${valToY(pt.value, yMin, yMax)}`)
    .join(' ');
}

/**
 * Builds closed polygon for gradient fill (adds bottom corners).
 */
function buildPolygon(data, yMin, yMax) {
  const top = buildPoints(data, yMin, yMax);
  return `${idxToX(0, data.length)},${SVG_H} ${top} ${idxToX(data.length - 1, data.length)},${SVG_H}`;
}

// ── Y-axis labels ─────────────────────────────────────────────────────────
function yLabels(yMin, yMax, steps = 3) {
  const out = [];
  for (let i = steps - 1; i >= 0; i--) {
    const val = yMin + ((yMax - yMin) * i) / (steps - 1);
    out.push(val);
  }
  return out;
}

// ── X-axis labels (time): LEFT = oldest, RIGHT = "ahora" ────────────────
// data[0] = oldest (largest tsAgo), data[N-1] = newest (tsAgo ≈ 0)
// SVG x=0 maps to data[0] (LEFT), SVG x=SVG_W maps to data[N-1] (RIGHT)
function xLabels(data, steps = 5) {
  const out = [];
  const indices = [];
  for (let i = 0; i < steps; i++) {
    indices.push(Math.round((i * (data.length - 1)) / (steps - 1)));
  }
  for (const idx of indices) {
    const tsAgo = data[idx]?.tsAgo ?? 0;
    // Rightmost point (tsAgo ≈ 0) → "ahora", others → "−Xs"
    out.push(tsAgo < 1 ? 'ahora' : `−${Math.round(tsAgo)}s`);
  }
  // No reverse — left=oldest, right=newest naturally
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SensorChart({
  data = [],
  color = '#4caf50',
  yMin = 0,
  yMax = 100,
  unit = '',
  decimals = 1,
  thresholdY = null,   // real value (e.g. 450 ppm) — draws dashed red line
}) {
  const uid = useId().replace(/:/g, '');
  const gradId = `grad-${uid}`;
  const clipId = `clip-${uid}`;

  const bodyRef = useRef(null);
  const [hover, setHover] = useState(null); // { idx, x, y, value, tsAgo }

  // ── Auto-scale Y to actual data range + padding ──────────────────────────
  // This ensures the line always fills the chart vertically and includes the threshold
  const effectiveYMin = useMemo(() => {
    if (data.length === 0) return yMin;
    const dMin = Math.min(...data.map(d => d.value));
    const dMax = Math.max(...data.map(d => d.value));
    const pad = Math.max((dMax - dMin) * 0.25, (yMax - yMin) * 0.05);

    let targetMin = dMin - pad;
    if (thresholdY !== null && thresholdY < dMin) {
      targetMin = Math.min(targetMin, thresholdY - pad * 0.5);
    }
    return Math.max(yMin, targetMin);
  }, [data, yMin, yMax, thresholdY]);

  const effectiveYMax = useMemo(() => {
    if (data.length === 0) return yMax;
    const dMin = Math.min(...data.map(d => d.value));
    const dMax = Math.max(...data.map(d => d.value));
    const pad = Math.max((dMax - dMin) * 0.25, (yMax - yMin) * 0.05);

    let targetMax = dMax + pad;
    if (thresholdY !== null && thresholdY > dMax) {
      targetMax = Math.max(targetMax, thresholdY + pad * 0.5);
    }
    return Math.min(yMax, targetMax);
  }, [data, yMax, yMin, thresholdY]);

  // ── Mouse tracking ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!bodyRef.current || data.length === 0) return;
    const rect = bodyRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, relX / rect.width));
    const idx = Math.round(frac * (data.length - 1));
    const pt = data[idx];
    if (!pt) return;

    // Convert SVG coordinates back to pixel for tooltip positioning
    const svgX = idxToX(idx, data.length);
    const svgY = valToY(pt.value, effectiveYMin, effectiveYMax);
    const pxX = (svgX / SVG_W) * rect.width;
    const pxY = (svgY / SVG_H) * (rect.height);

    setHover({ idx, pxX, pxY, pxYFrac: pxY / rect.height, value: pt.value, tsAgo: pt.tsAgo });
  }, [data, effectiveYMin, effectiveYMax]);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  // ── Derived SVG data ────────────────────────────────────────────────────
  const polyPoints = buildPoints(data, effectiveYMin, effectiveYMax);
  const polygonPoints = buildPolygon(data, effectiveYMin, effectiveYMax);
  const lastPt = data[data.length - 1];
  const lastX = lastPt ? idxToX(data.length - 1, data.length) : 0;
  const lastY = lastPt ? valToY(lastPt.value, effectiveYMin, effectiveYMax) : SVG_H;

  const thresholdSvgY = thresholdY != null ? valToY(thresholdY, effectiveYMin, effectiveYMax) : null;

  const yLbls = yLabels(effectiveYMin, effectiveYMax, 3);
  const xLbls = xLabels(data, 5);

  return (
    <div className="sensor-chart-root">
      <div className="sensor-chart-axes">
        {/* Y-Axis */}
        <div className="sensor-chart-y">
          {yLbls.map((v, i) => (
            <span key={i}>
              {Number.isInteger(v) ? v : v.toFixed(decimals > 2 ? 1 : decimals)}
            </span>
          ))}
        </div>

        {/* Chart body (SVG + tooltip) */}
        <div
          className="sensor-chart-body"
          ref={bodyRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            className="sensor-chart-svg"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.03" />
              </linearGradient>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={SVG_W} height={SVG_H} />
              </clipPath>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
              <line
                key={i}
                x1={0} y1={frac * SVG_H}
                x2={SVG_W} y2={frac * SVG_H}
                stroke="#2a3038" strokeWidth="0.6"
              />
            ))}

            {/* Threshold line */}
            {thresholdSvgY != null && (
              <line
                x1={0} y1={thresholdSvgY}
                x2={SVG_W} y2={thresholdSvgY}
                stroke="#ef5350" strokeWidth="0.9" strokeDasharray="5 3"
                opacity="0.7"
              />
            )}

            {/* Area gradient */}
            <polygon points={polygonPoints} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

            {/* Main line */}
            <polyline
              points={polyPoints}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Cursor guideline */}
            {hover && (
              <line
                className="sensor-cursor-line"
                x1={idxToX(hover.idx, data.length)} y1={0}
                x2={idxToX(hover.idx, data.length)} y2={SVG_H}
                stroke="rgba(255,255,255,0.18)" strokeWidth="1"
                strokeDasharray="3 2"
              />
            )}

            {/* Data dots */}
            {data.map((pt, i) => {
              const cx = idxToX(i, data.length);
              const cy = valToY(pt.value, effectiveYMin, effectiveYMax);
              const isLast = i === data.length - 1;
              const isHovered = hover?.idx === i;
              const r = isHovered ? 4.5 : isLast ? 3 : 2.5;
              return (
                <g key={i}>
                  {/* Pulse ring for latest point */}
                  {isLast && (
                    <circle
                      cx={cx} cy={cy} r={3}
                      fill="none" stroke={color} strokeWidth="1.2"
                      className="sensor-dot--pulse-ring"
                      opacity="0.7"
                    />
                  )}
                  <circle
                    cx={cx} cy={cy}
                    r={r}
                    fill={isHovered || isLast ? color : 'rgba(255, 255, 255, 0.08)'}
                    stroke={color}
                    strokeWidth={isHovered ? 1.8 : 1.2}
                    className={`sensor-dot${isHovered ? ' sensor-dot--hover' : ''}`}
                    style={{ '--dot-color': color }}
                    opacity={isHovered || isLast ? 1 : 0.85}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating tooltip — flips below point when point is in top 35% of chart */}
          {hover && (
            <div
              className="sensor-tooltip"
              style={{
                left: hover.pxX,
                top: hover.pxYFrac < 0.35 ? hover.pxY + 12 : hover.pxY,
                borderColor: color,
                transform: hover.pxYFrac < 0.35
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, -115%)',
              }}
            >
              <span className="sensor-tooltip__value" style={{ color }}>
                {hover.value.toFixed ? hover.value.toFixed(decimals) : hover.value} {unit}
              </span>
              <span className="sensor-tooltip__sep">·</span>
              <span className="sensor-tooltip__time">
                {hover.tsAgo < 1 ? 'ahora' : `${Math.round(hover.tsAgo)}s`}
              </span>
              <div
                className="sensor-tooltip__arrow"
                style={{
                  borderTopColor: hover.pxYFrac < 0.35 ? 'transparent' : color,
                  borderBottomColor: hover.pxYFrac < 0.35 ? color : 'transparent',
                  top: hover.pxYFrac < 0.35 ? '-4px' : 'auto',
                  bottom: hover.pxYFrac < 0.35 ? 'auto' : '-4px',
                  borderTop: hover.pxYFrac < 0.35 ? 'none' : `4px solid ${color}`,
                  borderBottom: hover.pxYFrac < 0.35 ? `4px solid ${color}` : 'none',
                }}
              ></div>
            </div>
          )}

          {/* X Axis */}
          <div className="sensor-chart-x">
            {xLabels(data, 5).map((lbl, i) => <span key={i}>{lbl}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

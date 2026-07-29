import { useState, useCallback, useRef, useId, useMemo, useEffect } from 'react';
import './SensorChart.css';

const SVG_W = 400;
const SVG_H = 90;
const PAD_Y = 6; // Padding vertical para evitar que puntos y líneas toquen los bordes extremos

/**
 * Maps a data value to SVG Y coordinate (top = high value).
 */
function valToY(val, yMin, yMax) {
  if (yMax === yMin) return SVG_H / 2;
  const clamped = Math.max(yMin, Math.min(yMax, val));
  const usableH = SVG_H - PAD_Y * 2;
  return (SVG_H - PAD_Y) - ((clamped - yMin) / (yMax - yMin)) * usableH;
}

/**
 * Maps index 0..N-1 to SVG X coordinate.
 */
function idxToX(i, total) {
  if (total <= 1) return SVG_W / 2;
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
  return `${idxToX(0, data.length)},${SVG_H - PAD_Y} ${top} ${idxToX(data.length - 1, data.length)},${SVG_H - PAD_Y}`;
}

// ── Fixed Y-axis labels (Static) ─────────────────────────────────────────
function yLabels(yMin, yMax, steps = 3) {
  const out = [];
  for (let i = steps - 1; i >= 0; i--) {
    const val = yMin + ((yMax - yMin) * i) / (steps - 1);
    out.push(val);
  }
  return out;
}

// ── Fixed X-axis labels (Static time steps e.g. -20s, -15s, -10s, -5s, ahora) ──
function xLabels(steps = 5, windowSecs = 20) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    if (i === steps - 1) {
      out.push('ahora');
    } else {
      const secAgo = Math.round(windowSecs * (1 - i / (steps - 1)));
      out.push(`−${secAgo}s`);
    }
  }
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
  thresholdY = null,      // real value (e.g. 450 ppm) — draws dashed red line
  autoScaleY = false,     // Default FALSE to keep Y-axis values static and fixed!
}) {
  const uid = useId().replace(/:/g, '');
  const gradId = `grad-${uid}`;
  const clipId = `clip-${uid}`;

  const bodyRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [bodyDim, setBodyDim] = useState({ w: 400, h: 72 });

  // ── Measure physical container dimensions to correct circle scale ───────
  useEffect(() => {
    if (!bodyRef.current) return;
    const updateDim = () => {
      if (bodyRef.current) {
        const rect = bodyRef.current.getBoundingClientRect();
        setBodyDim({
          w: Math.max(1, rect.width),
          h: Math.max(1, rect.height - 18), // Subtract x-axis labels height
        });
      }
    };
    updateDim();
    const observer = new ResizeObserver(updateDim);
    observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, []);

  const scaleX = bodyDim.w / SVG_W;
  const scaleY = bodyDim.h / SVG_H;

  // ── Static Y axis bounds (or auto-scale if autoScaleY === true) ───────────
  const effectiveYMin = useMemo(() => {
    if (!autoScaleY || data.length === 0) return yMin;
    const dMin = Math.min(...data.map(d => d.value));
    const dMax = Math.max(...data.map(d => d.value));
    const pad = Math.max((dMax - dMin) * 0.25, (yMax - yMin) * 0.05);

    let targetMin = dMin - pad;
    if (thresholdY !== null && thresholdY < dMin) {
      targetMin = Math.min(targetMin, thresholdY - pad * 0.5);
    }
    return Math.max(yMin, targetMin);
  }, [data, yMin, yMax, thresholdY, autoScaleY]);

  const effectiveYMax = useMemo(() => {
    if (!autoScaleY || data.length === 0) return yMax;
    const dMin = Math.min(...data.map(d => d.value));
    const dMax = Math.max(...data.map(d => d.value));
    const pad = Math.max((dMax - dMin) * 0.25, (yMax - yMin) * 0.05);

    let targetMax = dMax + pad;
    if (thresholdY !== null && thresholdY > dMax) {
      targetMax = Math.max(targetMax, thresholdY + pad * 0.5);
    }
    return Math.min(yMax, targetMax);
  }, [data, yMax, yMin, thresholdY, autoScaleY]);

  // Determine windowSecs from dataset or default to 20s
  const maxTsAgo = useMemo(() => {
    if (data.length === 0) return 20;
    const maxAgo = Math.max(...data.map(d => d.tsAgo ?? 0));
    return maxAgo > 0 ? Math.ceil(maxAgo / 5) * 5 : 20;
  }, [data]);

  // ── Mouse tracking ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!bodyRef.current || data.length === 0) return;
    const rect = bodyRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, relX / rect.width));
    const idx = Math.round(frac * (data.length - 1));
    const pt = data[idx];
    if (!pt) return;

    const svgX = idxToX(idx, data.length);
    const svgY = valToY(pt.value, effectiveYMin, effectiveYMax);
    const pxX = (svgX / SVG_W) * rect.width;
    const svgHPx = rect.height - 18;
    const pxY = (svgY / SVG_H) * svgHPx;

    setHover({ idx, pxX, pxY, pxYFrac: pxY / svgHPx, value: pt.value, tsAgo: pt.tsAgo });
  }, [data, effectiveYMin, effectiveYMax]);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  // ── Derived SVG data ────────────────────────────────────────────────────
  const polyPoints = buildPoints(data, effectiveYMin, effectiveYMax);
  const polygonPoints = buildPolygon(data, effectiveYMin, effectiveYMax);
  const thresholdSvgY = thresholdY != null ? valToY(thresholdY, effectiveYMin, effectiveYMax) : null;

  const yLbls = yLabels(effectiveYMin, effectiveYMax, 3);
  const xLbls = xLabels(5, maxTsAgo);

  // Clamp tooltip left to prevent sticking out of card
  const tooltipLeft = bodyRef.current && hover
    ? Math.max(55, Math.min(bodyRef.current.getBoundingClientRect().width - 55, hover.pxX))
    : hover?.pxX;

  return (
    <div className="sensor-chart-root">
      <div className="sensor-chart-axes">
        {/* Y-Axis (Fixed, Static Values) */}
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

            <g clipPath={`url(#${clipId})`}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                const lineY = PAD_Y + frac * (SVG_H - PAD_Y * 2);
                return (
                  <line
                    key={i}
                    x1={0} y1={lineY}
                    x2={SVG_W} y2={lineY}
                    stroke="#2a3038" strokeWidth="0.6"
                  />
                );
              })}

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
              <polygon points={polygonPoints} fill={`url(#${gradId})`} />

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

              {/* Data dots rendered as aspect-ratio corrected ellipses (perfect circles on screen) */}
              {data.map((pt, i) => {
                const cx = idxToX(i, data.length);
                const cy = valToY(pt.value, effectiveYMin, effectiveYMax);
                const isLast = i === data.length - 1;
                const isHovered = hover?.idx === i;
                const targetPixelRadius = isHovered ? 4.5 : isLast ? 3 : 2.5;

                const rx = targetPixelRadius / scaleX;
                const ry = targetPixelRadius / scaleY;

                const pulseRx = 6.5 / scaleX;
                const pulseRy = 6.5 / scaleY;

                return (
                  <g key={i}>
                    {/* Pulse ring for latest point */}
                    {isLast && (
                      <ellipse
                        cx={cx} cy={cy}
                        rx={pulseRx} ry={pulseRy}
                        fill="none" stroke={color} strokeWidth="1.2"
                        className="sensor-dot--pulse-ring"
                        opacity="0.7"
                      />
                    )}
                    <ellipse
                      cx={cx} cy={cy}
                      rx={rx} ry={ry}
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
            </g>
          </svg>

          {/* Floating tooltip */}
          {hover && (
            <div
              className="sensor-tooltip"
              style={{
                left: tooltipLeft,
                top: hover.pxYFrac < 0.35 ? hover.pxY + 12 : hover.pxY,
                borderColor: color,
                transform: hover.pxYFrac < 0.35
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, -115%)',
              }}
            >
              <span className="sensor-tooltip__value" style={{ color }}>
                {hover.value?.toFixed ? hover.value.toFixed(decimals) : hover.value} {unit}
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

          {/* X Axis (Fixed, Static Steps) */}
          <div className="sensor-chart-x">
            {xLbls.map((lbl, i) => <span key={i}>{lbl}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

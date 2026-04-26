// src/components/charts/AnnualBalanceChart.tsx
// Pure SVG — two-line chart (planned vs actual)

import React, { useState, useCallback } from 'react';
import { formatCurrency } from '../../lib/formatUtils';

interface DataPoint {
  month: string;
  planned: number;
  actual: number;
}

interface AnnualBalanceChartProps {
  data: DataPoint[];
  height?: number;
}

const PRIMARY  = '#3347B0';
const PLANNED  = '#94A3B8';
const PAD = { top: 16, right: 20, bottom: 32, left: 58 };

function fmtY(v: number): string {
  const a = Math.abs(v);
  if (a >= 10000) {
    const man = v / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}万`;
  }
  if (a >= 1000) {
    const sen = v / 1000;
    return `${Number.isInteger(sen) ? sen : sen.toFixed(1)}千`;
  }
  return `${v}`;
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const range = max - min || 1;
  const roughStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const candidates = [1, 2, 2.5, 5, 10].map(m => m * mag);
  const step = candidates.find(s => range / s <= count + 1) ?? mag * 10;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

export default function AnnualBalanceChart({ data, height = 280 }: AnnualBalanceChartProps) {
  const [tooltip, setTooltip] = useState<{ i: number; x: number; y: number } | null>(null);

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 400;
    const W = 400;
    const plotW = W - PAD.left - PAD.right;
    const step = plotW / Math.max(data.length - 1, 1);
    const i = Math.round((svgX - PAD.left) / step);
    if (i >= 0 && i < data.length) setTooltip({ i, x: svgX, y: e.clientY - rect.top });
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0A7B4', fontSize: 13 }}>
        データがありません
      </div>
    );
  }

  const W = 400;
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const allValues = [...data.map(d => d.planned), ...data.map(d => d.actual)];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yMin = Math.min(0, rawMin);
  const yMax = Math.max(0, rawMax);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  const zeroY = toY(0);

  const makePath = (key: 'planned' | 'actual') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(' ');

  const actualPath  = makePath('actual');
  const plannedPath = makePath('planned');

  const firstX = toX(0).toFixed(1);
  const lastX  = toX(data.length - 1).toFixed(1);
  const areaPath = `${actualPath} L${lastX},${zeroY.toFixed(1)} L${firstX},${zeroY.toFixed(1)} Z`;

  const ticks = niceTicks(yMin, yMax);

  // Show every other month label if 12 months
  const xLabels = data.map((d, i) => ({ i, label: d.month })).filter((_, i) => i % 2 === 0 || i === data.length - 1);

  const tip = tooltip !== null ? data[tooltip.i] : null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: '#6B7280', paddingLeft: PAD.left }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke={PLANNED} strokeWidth="2" strokeDasharray="4 3" /></svg>
          計画残高
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke={PRIMARY} strokeWidth="2" /></svg>
          実績残高
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="abc-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={PRIMARY} stopOpacity="0.18" />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.01" />
          </linearGradient>
          <clipPath id="abc-clip">
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Y-axis grid + labels */}
        {ticks.map(tick => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#EAECF0" strokeWidth="1" />
              <text x={PAD.left - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#A0A7B4">
                {fmtY(tick)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line x1={PAD.left} y1={zeroY} x2={PAD.left + plotW} y2={zeroY}
            stroke="#EAECF0" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        {!ticks.includes(0) && (
          <text x={PAD.left - 6} y={zeroY} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#A0A7B4">0</text>
        )}

        {/* Actual area fill */}
        <path d={areaPath} fill="url(#abc-area-grad)" clipPath="url(#abc-clip)" />

        {/* Planned line (dashed) */}
        <path d={plannedPath} fill="none" stroke={PLANNED} strokeWidth="1.5" strokeDasharray="5 4"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#abc-clip)" />

        {/* Actual line */}
        <path d={actualPath} fill="none" stroke={PRIMARY} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#abc-clip)" />

        {/* Tooltip crosshair */}
        {tooltip !== null && (
          <>
            <line
              x1={toX(tooltip.i)} y1={PAD.top}
              x2={toX(tooltip.i)} y2={PAD.top + plotH}
              stroke="#EAECF0" strokeWidth="1" strokeDasharray="3 2"
            />
            <circle cx={toX(tooltip.i)} cy={toY(data[tooltip.i].planned)} r="3.5" fill={PLANNED} />
            <circle cx={toX(tooltip.i)} cy={toY(data[tooltip.i].actual)}  r="3.5" fill={PRIMARY} />
          </>
        )}

        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={toX(i)} y={H - 6}
            textAnchor="middle" fontSize="10" fill="#A0A7B4">
            {label}
          </text>
        ))}
      </svg>

      {/* Floating tooltip */}
      {tooltip !== null && tip && (
        <div style={{
          position: 'absolute',
          top: Math.max(0, (tooltip.y ?? 0) - 60),
          left: tooltip.i < data.length / 2 ? 'calc(25% + 4px)' : undefined,
          right: tooltip.i >= data.length / 2 ? 'calc(25% + 4px)' : undefined,
          background: '#fff',
          border: '1px solid #EAECF0',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 11,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3, color: '#1A1D2E' }}>{tip.month}</div>
          <div style={{ color: PLANNED }}>計画: {formatCurrency(tip.planned)}</div>
          <div style={{ color: PRIMARY }}>実績: {formatCurrency(tip.actual)}</div>
        </div>
      )}
    </div>
  );
}

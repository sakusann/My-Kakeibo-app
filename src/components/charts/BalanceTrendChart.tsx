// src/components/charts/BalanceTrendChart.tsx
// Pure SVG implementation — no recharts dependency

import React from 'react';
import { formatCurrency } from '../../lib/formatUtils';

interface DataPoint {
  date: string;   // "M/d" format
  balance: number;
}

interface BalanceTrendChartProps {
  data: DataPoint[];
  height?: number;
}

const PRIMARY = '#3347B0';
const PAD = { top: 12, right: 16, bottom: 28, left: 54 };

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

export default function BalanceTrendChart({ data, height = 240 }: BalanceTrendChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0A7B4', fontSize: 13 }}>データがありません</div>;
  }

  const W = 400;
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.balance);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const yMin = Math.min(0, rawMin);
  const yMax = Math.max(0, rawMax);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  const zeroY = toY(0);

  // Line path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.balance).toFixed(1)}`)
    .join(' ');

  // Area path (line + down to zero line + back)
  const firstX = toX(0).toFixed(1);
  const lastX  = toX(data.length - 1).toFixed(1);
  const areaPath = `${linePath} L${lastX},${zeroY.toFixed(1)} L${firstX},${zeroY.toFixed(1)} Z`;

  const ticks = niceTicks(yMin, yMax);

  // X-axis: show only first and last label
  const xLabels = [
    { i: 0,                  label: data[0].date },
    { i: data.length - 1,    label: data[data.length - 1].date },
  ].filter((v, idx, arr) => idx === 0 || v.i !== arr[0].i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id="btc-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={PRIMARY} stopOpacity="0.22" />
          <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="btc-clip">
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>
      </defs>

      {/* Y-axis grid lines + labels */}
      {ticks.map(tick => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line
              x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y}
              stroke="#EAECF0" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize="10" fill="#A0A7B4"
            >
              {fmtY(tick)}
            </text>
          </g>
        );
      })}

      {/* Zero line (dashed, more prominent) */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD.left} y1={zeroY} x2={PAD.left + plotW} y2={zeroY}
          stroke="#EAECF0" strokeWidth="1.5" strokeDasharray="4 3"
        />
      )}
      {/* Zero label on Y axis always */}
      {!ticks.includes(0) && (
        <text x={PAD.left - 6} y={zeroY} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#A0A7B4">0</text>
      )}

      {/* Area fill */}
      <path d={areaPath} fill="url(#btc-area-grad)" clipPath="url(#btc-clip)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#btc-clip)" />

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : 'end'}
          fontSize="10"
          fill="#A0A7B4"
        >
          {label}
        </text>
      ))}

      {/* Tooltip-like hover dots (title tags for accessibility) */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.balance)} r="3" fill={PRIMARY} fillOpacity="0" style={{ cursor: 'crosshair' }} clipPath="url(#btc-clip)">
          <title>{`${d.date}: ${formatCurrency(d.balance)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

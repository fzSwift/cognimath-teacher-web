/* ============================================================
   CogniMath Teacher — Charts.jsx
   Tiny dependency-free SVG charts (port of the app's Charts.js)
   ============================================================ */

import React from "react";

const W = 340;
const H = 200;
const PAD = { l: 40, r: 12, t: 16, b: 40 };

function Ticks({ m, ih, iw }) {
  return [0, 0.5, 1].map(f => {
    const y = PAD.t + ih - f * ih;
    return (
      <g key={f}>
        <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(51,48,43,0.10)" />
        <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#8A7F6A" fontWeight="700">
          {Math.round(m * f)}
        </text>
      </g>
    );
  });
}

export function Bars({ labels, values, colors, max, unit = "" }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const m = max || Math.max(...values) * 1.15;
  const bw = Math.min(36, (iw / values.length) * 0.55);
  const step = iw / values.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img">
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} stroke="rgba(51,48,43,0.18)" />
      <Ticks m={m} ih={ih} iw={iw} />
      {values.map((v, i) => {
        const x = PAD.l + i * step + (step - bw) / 2;
        const bh = (v / m) * ih;
        const y = PAD.t + ih - bh;
        const lx = PAD.l + i * step + step / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={6} fill={colors[i] || "#3B82C4"} />
            <text x={lx} y={PAD.t + ih + 16} textAnchor="middle" fontSize={8.5} fill="#8A7F6A" fontWeight="700">
              {labels[i]}
            </text>
            <text x={lx} y={PAD.t + ih + 30} textAnchor="middle" fontSize={8.5} fill="#B7AC93" fontWeight="700">
              {v}{unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Lines({ labels, series }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const all = series.flatMap(s => s.values);
  const m = Math.max(...all) * 1.12;
  const step = iw / Math.max(1, labels.length - 1);
  const px = i => PAD.l + i * step;
  const py = v => PAD.t + ih - (v / m) * ih;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img">
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} stroke="rgba(51,48,43,0.18)" />
      <Ticks m={m} ih={ih} iw={iw} />
      {series.map(s => (
        <g key={s.name}>
          <polyline
            points={s.values.map((v, i) => `${px(i)},${py(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {s.values.map((v, i) => (
            <circle key={i} cx={px(i)} cy={py(v)} r={4.5} fill={s.color} />
          ))}
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={px(i)} y={PAD.t + ih + 18} textAnchor="middle" fontSize={9} fill="#8A7F6A" fontWeight="700">
          {l}
        </text>
      ))}
    </svg>
  );
}

export function Scatter({ points, xLabel, yLabel, maxX = 45, maxY = 100 }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const px = x => PAD.l + (x / maxX) * iw;
  const py = y => PAD.t + ih - (y / maxY) * ih;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img">
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} stroke="rgba(51,48,43,0.18)" />
      <line x1={PAD.l} y1={PAD.t + ih} x2={W - PAD.r} y2={PAD.t + ih} stroke="rgba(51,48,43,0.18)" />
      {[0, 50, 100].map(f => {
        const y = PAD.t + ih - (f / maxY) * ih;
        return (
          <g key={f}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(51,48,43,0.10)" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#8A7F6A" fontWeight="700">{f}</text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.x)} cy={py(p.y)} r={6} fill={p.color || "#3B82C4"} stroke="#fff" strokeWidth={1.5} />
          <title>{p.label}</title>
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#8A7F6A" fontWeight="700">{xLabel} →</text>
      <text x={14} y={H / 2} textAnchor="middle" fontSize={9} fill="#8A7F6A" fontWeight="700" transform={`rotate(-90 14 ${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map(it => (
        <span key={it.name}>
          <i style={{ backgroundColor: it.color }} /> {it.name}
        </span>
      ))}
    </div>
  );
}

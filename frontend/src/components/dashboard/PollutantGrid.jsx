/**
 * UrbanAir — PollutantGrid Component
 */
import React from 'react';
import { motion } from 'framer-motion';

const POLLUTANTS = [
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', max: 250, emoji: '💨' },
  { key: 'pm10', label: 'PM10',  unit: 'µg/m³', max: 400, emoji: '🌫' },
  { key: 'no2',  label: 'NO₂',   unit: 'ppb',    max: 200, emoji: '🚗' },
  { key: 'o3',   label: 'O₃',    unit: 'ppb',    max: 150, emoji: '☀️' },
];

function PollutantCard({ label, unit, value, max, emoji, loading, delay }) {
  const pct = value ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 70 ? '#ff3366' : pct > 40 ? '#ff8c00' : '#00ff88';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '9px 10px',
        cursor: 'default', transition: 'all 0.2s',
      }}
      whileHover={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border2)' }}
    >
      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>
        {emoji} {label}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
        color: loading ? 'var(--text3)' : color,
      }}>
        {loading ? '--' : (value ?? '--')}
        <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 2, fontFamily: 'Space Grotesk, sans-serif' }}>
          {unit}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: loading ? '0%' : `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.2 }}
          style={{ height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}55` }}
        />
      </div>
    </motion.div>
  );
}

export function PollutantGrid({ pollutants, aqi, loading }) {
  const getVal = (key) => {
    if (!pollutants) return null;
    const v = pollutants[key];
    if (v !== undefined && v !== null) return v;
    if (!aqi) return null;
    const fallbacks = { pm25: 0.45, pm10: 0.70, no2: 0.28, o3: 0.22 };
    return Math.round(aqi * (fallbacks[key] || 0.3));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
      {POLLUTANTS.map((p, i) => (
        <PollutantCard key={p.key} {...p} value={getVal(p.key)} loading={loading} delay={i * 0.06} />
      ))}
    </div>
  );
}

export default PollutantGrid;

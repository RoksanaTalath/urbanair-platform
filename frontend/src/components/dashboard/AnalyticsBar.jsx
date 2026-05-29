/**
 * UrbanAir — AnalyticsBar Component
 * Bottom status strip showing live metrics
 */
import React from 'react';
import { motion } from 'framer-motion';
import useUrbanAirStore, { getAqiConfig } from '../../store/urbanAirStore';

function Metric({ icon, label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: 'var(--text2)',
      padding: '0 12px',
      borderRight: '1px solid var(--border)',
    }}>
      <span>{icon}</span>
      <span>{label}:</span>
      <span style={{
        fontWeight: 600, color: valueColor || 'var(--text)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>{value}</span>
    </div>
  );
}

export function AnalyticsBar() {
  const { microzones, aqiData, location, lastUpdated } = useUrbanAirStore(s => ({
    microzones: s.microzones,
    aqiData: s.aqiData,
    location: s.location,
    lastUpdated: s.lastUpdated,
  }));

  const hotspotCount = microzones.filter(z => z.aqi > 150).length;
  const avg = microzones.length > 0
    ? Math.round(microzones.reduce((s, z) => s + z.aqi, 0) / microzones.length)
    : null;
  const avgCfg = avg ? getAqiConfig(avg) : null;
  const dominant = aqiData?.dominant_pollutant?.toUpperCase() || '--';
  const updatedStr = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      height: 38, display: 'flex', alignItems: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <Metric icon="🔥" label="Hotspots" value={hotspotCount} valueColor={hotspotCount > 0 ? '#ff3366' : 'var(--green)'} />
      <Metric icon="📍" label="Zones" value={microzones.length} />
      <Metric icon="📊" label="Avg AQI" value={avg ?? '--'} valueColor={avgCfg?.color} />
      <Metric icon="⚠️" label="Risk" value={avgCfg?.label || '--'} valueColor={avgCfg?.color} />
      <Metric icon="🌡" label="Dominant" value={dominant} valueColor="var(--accent)" />
      <div style={{ flex: 1 }} />
      <div style={{
        fontSize: 11, color: 'var(--text3)', padding: '0 14px',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        ↺ {updatedStr}
      </div>
    </div>
  );
}

/**
 * UrbanAir — ErrorBanner Component
 */
export function ErrorBanner({ message }) {
  const clearError = useUrbanAirStore(s => s.clearError);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: 'rgba(255,51,102,0.1)',
        border: '1px solid rgba(255,51,102,0.3)',
        borderRadius: 0, padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13, color: '#ff6688', flexShrink: 0,
      }}
    >
      <span>⚠️ {message}</span>
      <button
        onClick={clearError}
        style={{
          background: 'none', border: 'none', color: '#ff6688',
          cursor: 'pointer', fontSize: 16, padding: '0 4px',
        }}
      >×</button>
    </motion.div>
  );
}

export default AnalyticsBar;

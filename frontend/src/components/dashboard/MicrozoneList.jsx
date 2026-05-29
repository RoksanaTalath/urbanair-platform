/**
 * UrbanAir — MicrozoneList Component
 * Shows street-level AQI variation across nearby zones
 */
import React from 'react';
import { motion } from 'framer-motion';
import { getAqiConfig } from '../../store/urbanAirStore';

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      borderRadius: 8, marginBottom: 5,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
      <div style={{
        flex: 1, height: 12, borderRadius: 4,
        background: 'linear-gradient(90deg, var(--border) 25%, var(--border2) 50%, var(--border) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{ width: 32, height: 12, borderRadius: 4, background: 'var(--border)' }} />
    </div>
  );
}

export default function MicrozoneList({ zones, loading }) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '20px 0' }}>
        No zone data available
      </div>
    );
  }

  const displayZones = zones.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {displayZones.map((zone, i) => {
        const cfg = getAqiConfig(zone.aqi);
        const trendColor = zone.trend === '↑' ? '#ff6666' : zone.trend === '↓' ? '#00ff88' : 'var(--text3)';

        return (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border2)' }}
          >
            {/* indicator dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: cfg.color, flexShrink: 0,
              boxShadow: `0 0 6px ${cfg.color}66`,
            }} />

            {/* name + type */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {zone.icon} {zone.name}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{zone.typeLabel}</div>
            </div>

            {/* AQI value */}
            <div style={{
              fontSize: 13, fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: cfg.color, flexShrink: 0,
            }}>
              {zone.aqi}
            </div>

            {/* Trend */}
            <div style={{ fontSize: 11, color: trendColor, flexShrink: 0, width: 12 }}>
              {zone.trend}
            </div>
          </motion.div>
        );
      })}

      {zones.length > 10 && (
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', paddingTop: 4 }}>
          +{zones.length - 10} more zones
        </div>
      )}
    </div>
  );
}

/**
 * UrbanAir — ZoneTab Component
 * Zone type filter + zone list with category breakdown
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getAqiConfig } from '../../store/urbanAirStore';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'industrial', label: '🏭 Industrial' },
  { id: 'traffic_corridor', label: '🚗 Traffic' },
  { id: 'residential_dense', label: '🏘 Residential' },
  { id: 'commercial', label: '🏪 Commercial' },
  { id: 'green_space', label: '🌿 Green' },
];

export function ZoneTab({ zones, loading }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? zones
    : zones.filter(z => z.type === activeFilter);

  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>Loading zones...</div>;

  return (
    <div>
      <div style={{ marginBottom: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {FILTERS.slice(0, 4).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 10,
              border: `1px solid ${activeFilter === f.id ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
              background: activeFilter === f.id ? 'rgba(0,212,255,0.1)' : 'none',
              color: activeFilter === f.id ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filtered.slice(0, 12).map((zone, i) => {
          const cfg = getAqiConfig(zone.aqi);
          return (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cfg.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {zone.icon} {zone.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{zone.typeLabel}</div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: cfg.color, flexShrink: 0,
              }}>
                {zone.aqi}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
            No zones in this category
          </div>
        )}
      </div>
    </div>
  );
}

export default ZoneTab;

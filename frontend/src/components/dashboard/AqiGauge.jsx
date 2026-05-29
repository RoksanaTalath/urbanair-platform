/**
 * UrbanAir — AQI Gauge Component
 * Animated circular AQI indicator with level badge
 */
import React from 'react';
import { motion } from 'framer-motion';
import { getAqiConfig } from '../../store/urbanAirStore';

function SkeletonBox({ w, h, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--border2) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

export default function AqiGauge({ aqi, loading, city, aqiData }) {
  const cfg = aqi !== null && aqi !== undefined ? getAqiConfig(aqi) : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '3px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 20, height: 20, border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin-ring 0.8s linear infinite',
          }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBox w={60} h={20} />
          <SkeletonBox w={100} h={14} />
          <SkeletonBox w={80} h={12} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Circle gauge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* Spinning ring */}
        {cfg && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: -3,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: cfg.color,
              opacity: 0.4,
            }}
          />
        )}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            border: `3px solid ${cfg?.color || 'var(--border)'}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: cfg ? `0 0 20px ${cfg.color}30, inset 0 0 20px ${cfg.color}10` : 'none',
            background: cfg ? `${cfg.color}08` : 'transparent',
          }}
        >
          <motion.div
            key={aqi}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 24, fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: cfg?.color || 'var(--text3)',
              lineHeight: 1,
            }}
          >
            {aqi ?? '--'}
          </motion.div>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            AQI
          </div>
        </motion.div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <motion.div
          key={cfg?.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            fontSize: 15, fontWeight: 600,
            color: cfg?.color || 'var(--text3)',
            marginBottom: 3, lineHeight: 1.2,
          }}
        >
          {cfg?.label || 'Loading...'}
        </motion.div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          📍 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city || '---'}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
          {aqiData?.time ? `Updated ${new Date(aqiData.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Fetching...'}
        </div>
        {aqiData?.source === 'waqi' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
            background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 20, padding: '2px 8px',
            fontSize: 9, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.5px',
          }}>
            ● LIVE DATA
          </div>
        )}
      </div>
    </div>
  );
}

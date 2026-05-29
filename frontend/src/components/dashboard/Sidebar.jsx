/**
 * UrbanAir — Sidebar Component
 * AQI display, weather, pollutant grid, tab navigation
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUrbanAirStore, { getAqiConfig } from '../../store/urbanAirStore';
import AqiGauge from './AqiGauge';
import PollutantGrid from './PollutantGrid';
import MicrozoneList from './MicrozoneList';
import ForecastTab from '../charts/ForecastTab';
import ZoneTab from './ZoneTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'zones',    label: 'Zones',    icon: '🗺' },
  { id: 'forecast', label: 'Forecast', icon: '📈' },
];

function WeatherCard({ label, value, icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 8px',
      flex: 1, textAlign: 'center',
    }}>
      <div style={{ fontSize: 15, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 15, fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text)', lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

export default function Sidebar() {
  const { aqiData, microzones, hourlyForecast, weeklyTrend, loading, activeTab, setActiveTab, location }
    = useUrbanAirStore(s => ({
      aqiData: s.aqiData,
      microzones: s.microzones,
      hourlyForecast: s.hourlyForecast,
      weeklyTrend: s.weeklyTrend,
      loading: s.loading,
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      location: s.location,
    }));

  const aqi = aqiData?.aqi ?? null;
  const cfg = aqi !== null ? getAqiConfig(aqi) : null;

  return (
    <aside style={{
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>

        {/* ── AQI Card ─────────────────────────────────────── */}
        <SectionTitle>Air Quality Index</SectionTitle>
        <motion.div
          layout
          style={{
            background: 'var(--card-bg)',
            border: `1px solid var(--border2)`,
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            position: 'relative', overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          {/* top accent bar */}
          {cfg && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3, background: cfg.color,
              boxShadow: `0 0 12px ${cfg.color}55`,
            }} />
          )}

          <AqiGauge aqi={aqi} loading={loading.aqi} city={location.city} aqiData={aqiData} />

          {/* AQI progress bar */}
          {aqi !== null && (
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', margin: '12px 0' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((aqi / 300) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', background: cfg?.color, borderRadius: 2, boxShadow: `0 0 8px ${cfg?.color}66` }}
              />
            </div>
          )}

          <PollutantGrid pollutants={aqiData?.pollutants} aqi={aqi} loading={loading.aqi} />
        </motion.div>

        {/* ── Weather ─────────────────────────────────────── */}
        <SectionTitle>Weather Conditions</SectionTitle>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <WeatherCard label="Temp" icon="🌡"
            value={aqiData?.temp ? `${aqiData.temp}°C` : '--°C'} />
          <WeatherCard label="Humidity" icon="💧"
            value={aqiData?.humidity ? `${aqiData.humidity}%` : '--%'} />
          <WeatherCard label="Wind" icon="💨"
            value={aqiData?.wind ? `${aqiData.wind}km/h` : '--'} />
        </div>

        {/* ── Tab Nav ─────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10, padding: 4, marginBottom: 12,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '7px 4px',
                border: 'none', cursor: 'pointer',
                borderRadius: 7, fontSize: 11, fontWeight: 500,
                fontFamily: 'Space Grotesk, sans-serif',
                background: activeTab === tab.id ? 'var(--bg4)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text2)',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 0 16px rgba(0,212,255,0.08)' : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <SectionTitle>Microzone AQI Variation</SectionTitle>
              <MicrozoneList zones={microzones} loading={loading.microzones} />
            </motion.div>
          )}
          {activeTab === 'zones' && (
            <motion.div key="zones"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <ZoneTab zones={microzones} loading={loading.microzones} />
            </motion.div>
          )}
          {activeTab === 'forecast' && (
            <motion.div key="forecast"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <ForecastTab hourly={hourlyForecast} weekly={weeklyTrend} loading={loading.forecast} />
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height: 14 }} />
      </div>
    </aside>
  );
}

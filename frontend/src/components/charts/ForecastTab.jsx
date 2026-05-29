/**
 * UrbanAir — ForecastTab Component
 * 24-hour bar chart + 7-day weekly trend line
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { getAqiConfig } from '../../store/urbanAirStore';

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

const ForecastTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const aqi = payload[0].value;
    const cfg = getAqiConfig(aqi);
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 8, padding: '6px 10px', fontSize: 11,
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 700, color: cfg.color, fontFamily: 'JetBrains Mono, monospace' }}>
          AQI {aqi}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{cfg.label}</div>
      </div>
    );
  }
  return null;
};

export default function ForecastTab({ hourly, weekly, loading }) {
  // Sample every 2 hours for display
  const hourlyDisplay = hourly.filter((_, i) => i % 2 === 0).slice(0, 12);
  const avgAqi = weekly.length > 0
    ? Math.round(weekly.reduce((s, d) => s + d.aqi, 0) / weekly.length)
    : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[120, 100].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 12,
            background: 'var(--card-bg)', border: '1px solid var(--border2)',
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 24-hour Forecast */}
      <SectionTitle>24-Hour AQI Forecast</SectionTitle>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: '12px 10px',
      }}>
        {hourlyDisplay.length > 0 ? (
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={hourlyDisplay} barSize={14}>
              <XAxis
                dataKey="time"
                tick={{ fill: '#4a5a73', fontSize: 8 }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<ForecastTooltip />} />
              <Bar dataKey="aqi" radius={[3, 3, 0, 0]}>
                {hourlyDisplay.map((d, i) => (
                  <Cell
                    key={i}
                    fill={getAqiConfig(d.aqi).color}
                    fillOpacity={d.isRushHour ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
            No forecast data
          </div>
        )}

        {/* Peak/Low strip */}
        {hourly.length > 0 && (() => {
          const peak = hourly.reduce((a, b) => b.aqi > a.aqi ? b : a);
          const low  = hourly.reduce((a, b) => b.aqi < a.aqi ? b : a);
          return (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{
                flex: 1, background: `${getAqiConfig(peak.aqi).color}15`,
                border: `1px solid ${getAqiConfig(peak.aqi).color}35`,
                borderRadius: 8, padding: '6px 10px',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>🔺 PEAK</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: getAqiConfig(peak.aqi).color }}>
                  {peak.aqi}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>at {peak.time}</div>
              </div>
              <div style={{
                flex: 1, background: `${getAqiConfig(low.aqi).color}15`,
                border: `1px solid ${getAqiConfig(low.aqi).color}35`,
                borderRadius: 8, padding: '6px 10px',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>🔻 LOWEST</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: getAqiConfig(low.aqi).color }}>
                  {low.aqi}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>at {low.time}</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 7-day trend */}
      <SectionTitle>7-Day AQI Trend</SectionTitle>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: '12px 10px',
      }}>
        {weekly.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={weekly}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#4a5a73', fontSize: 8 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<ForecastTooltip />} />
                {avgAqi && <ReferenceLine y={avgAqi} stroke="rgba(0,212,255,0.2)" strokeDasharray="4 4" />}
                <Line
                  type="monotone" dataKey="aqi"
                  stroke="var(--accent)" strokeWidth={2}
                  dot={(p) => {
                    const isToday = weekly[p.index]?.isToday;
                    return (
                      <circle key={p.key} cx={p.cx} cy={p.cy} r={isToday ? 5 : 3}
                        fill={isToday ? 'var(--accent)' : getAqiConfig(weekly[p.index]?.aqi || 0).color}
                        stroke="var(--bg3)" strokeWidth={1}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Day badges */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {weekly.map((d, i) => {
                const cfg = getAqiConfig(d.aqi);
                return (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center', padding: '4px 2px',
                    background: d.isToday ? `${cfg.color}20` : 'transparent',
                    border: `1px solid ${d.isToday ? cfg.color + '50' : 'transparent'}`,
                    borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 8, color: d.isToday ? 'var(--text)' : 'var(--text3)', marginBottom: 1 }}>
                      {d.isToday ? 'NOW' : d.day}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: cfg.color }}>
                      {d.aqi}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
            No weekly data
          </div>
        )}
      </div>
    </div>
  );
}

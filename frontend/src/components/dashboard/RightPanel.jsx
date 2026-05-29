/**
 * UrbanAir — RightPanel Component
 * AI insights, top hotspots, distribution chart, hourly chart
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUrbanAirStore, { getAqiConfig } from '../../store/urbanAirStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function SectionTitle({ children, extra }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 8,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '1.5px',
      }}>
        {children}
      </div>
      {extra}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border2)',
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

function InsightCard({ insights, loading }) {
  if (loading) return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(0,212,255,0.04))',
      border: '1px solid rgba(139,92,246,0.18)',
      borderRadius: 'var(--radius-lg)', padding: 14,
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--border)' }} />
        <div style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--border)', alignSelf: 'center' }} />
      </div>
      {[100, 85, 70].map((w, i) => (
        <div key={i} style={{ height: 11, borderRadius: 3, background: 'var(--border)', marginBottom: 6, width: `${w}%` }} />
      ))}
    </div>
  );

  if (!insights) return null;

  const ALERT_COLORS = { warning: '#ff8c00', danger: '#ff3366', critical: '#cc0044' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(0,212,255,0.04))',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 'var(--radius-lg)', padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg,#8b5cf6,#00d4ff)',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14, flexShrink: 0,
        }}>🧠</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>AI Health Analysis</div>
        {insights.mask_required && (
          <div style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 600,
            background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)',
            color: '#ff6688', padding: '2px 8px', borderRadius: 20,
          }}>😷 Mask Required</div>
        )}
      </div>

      {/* Alerts */}
      {insights.alerts?.map((a, i) => (
        <div key={i} style={{
          background: `${ALERT_COLORS[a.level]}15`,
          border: `1px solid ${ALERT_COLORS[a.level]}40`,
          borderRadius: 8, padding: '6px 10px',
          fontSize: 11, color: ALERT_COLORS[a.level],
          marginBottom: 8,
        }}>
          ⚠️ {a.text}
        </div>
      ))}

      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 10 }}>
        {insights.summary}
      </p>

      {/* Activity list */}
      {insights.activities?.slice(0, 3).map((act, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: act.safe ? 'var(--green)' : '#ff6688',
          marginBottom: 4,
        }}>
          <span>{act.safe ? '✅' : '❌'}</span>
          <span>{act.a}</span>
        </div>
      ))}

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
        {insights.mask_required && (
          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff6688' }}>
            😷 Wear Mask
          </span>
        )}
        {insights.air_purifier_advised && (
          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', color: '#ffaa44' }}>
            🌀 Use Purifier
          </span>
        )}
        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
          background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent)' }}>
          💧 Stay Hydrated
        </span>
        {insights.is_rush_hour && (
          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: 'var(--yellow)' }}>
            🚗 Rush Hour
          </span>
        )}
      </div>

      {/* Risk meter */}
      {insights.risk_score !== undefined && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
            <span>Risk Score</span>
            <span style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{insights.risk_score}/100</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${insights.risk_score}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 2,
                background: insights.risk_score > 70 ? '#ff3366' : insights.risk_score > 40 ? '#ff8c00' : '#00ff88',
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function HotspotItem({ zone, rank }) {
  const cfg = getAqiConfig(zone.aqi);
  const RANK_COLORS = ['#ff3366', '#ff5500', '#ff7700', '#ff9900', '#ffaa00', '#ffcc00', '#ffdd44', '#ffee88'];
  const rc = RANK_COLORS[rank] || '#aaa';

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px',
        background: 'var(--card-bg)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      whileHover={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: `${rc}18`, color: rc,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
      }}>
        #{rank + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {zone.icon} {zone.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
          {zone.typeLabel} · {cfg.label}
        </div>
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
        color: cfg.color, flexShrink: 0,
      }}>
        {zone.aqi}
      </div>
    </motion.div>
  );
}

function StatsRow({ microzones }) {
  const worst = microzones[0]?.aqi ?? '--';
  const best = microzones[microzones.length - 1]?.aqi ?? '--';
  const highRiskPct = microzones.length > 0
    ? Math.round((microzones.filter(z => z.aqi > 150).length / microzones.length) * 100)
    : 0;

  const stats = [
    { label: 'Worst Zone', value: worst, color: worst !== '--' ? getAqiConfig(worst).color : 'var(--text3)' },
    { label: 'Best Zone',  value: best,  color: best  !== '--' ? getAqiConfig(best).color  : 'var(--text3)' },
    { label: 'High Risk',  value: `${highRiskPct}%`, color: highRiskPct > 30 ? '#ff3366' : '#00ff88' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: 'var(--card-bg)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-md)', padding: '10px 8px', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: s.color, marginBottom: 4,
          }}>
            {s.value}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const aqi = payload[0].value;
    const cfg = getAqiConfig(aqi);
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 8, padding: '6px 10px', fontSize: 11,
      }}>
        <div style={{ color: 'var(--text2)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 700, color: cfg.color, fontFamily: 'JetBrains Mono, monospace' }}>
          {aqi} AQI
        </div>
      </div>
    );
  }
  return null;
};

export default function RightPanel() {
  const { aiInsights, microzones, hourlyForecast, loading } = useUrbanAirStore(s => ({
    aiInsights: s.aiInsights,
    microzones: s.microzones,
    hourlyForecast: s.hourlyForecast,
    loading: s.loading,
  }));

  // Zone type distribution for bar chart
  const typeData = React.useMemo(() => {
    const map = {};
    microzones.forEach(z => {
      const t = z.type.replace('_', ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      if (!map[t]) map[t] = { type: t, aqi: 0, count: 0 };
      map[t].aqi += z.aqi; map[t].count++;
    });
    return Object.values(map)
      .map(d => ({ type: d.type.slice(0, 8), avg: Math.round(d.aqi / d.count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [microzones]);

  // Hourly chart data (every 3 hours)
  const hourlyData = React.useMemo(
    () => hourlyForecast.filter((_, i) => i % 3 === 0).slice(0, 8),
    [hourlyForecast]
  );

  const hotspots = microzones.slice(0, 6);

  return (
    <aside style={{
      background: 'var(--bg2)',
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>

        {/* AI Insights */}
        <SectionTitle>AI Health Intelligence</SectionTitle>
        <div style={{ marginBottom: 14 }}>
          <InsightCard insights={aiInsights} loading={loading.insights} />
        </div>

        {/* Hotspots */}
        <SectionTitle>Top Pollution Hotspots</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <AnimatePresence>
            {loading.microzones ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  height: 52, borderRadius: 'var(--radius-md)',
                  background: 'var(--card-bg)', border: '1px solid var(--border2)',
                  animation: 'shimmer 1.5s infinite',
                }} />
              ))
            ) : (
              hotspots.map((zone, i) => <HotspotItem key={zone.id} zone={zone} rank={i} />)
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <SectionTitle>City Statistics</SectionTitle>
        <div style={{ marginBottom: 14 }}>
          <StatsRow microzones={microzones} />
        </div>

        {/* Distribution Chart */}
        <SectionTitle>Pollution by Zone Type</SectionTitle>
        <Card style={{ marginBottom: 14, padding: '12px 10px' }}>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={typeData} barSize={18}>
              <XAxis dataKey="type" tick={{ fill: '#4a5a73', fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {typeData.map((d, i) => (
                  <Cell key={i} fill={getAqiConfig(d.avg).color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Hourly Pattern */}
        <SectionTitle>Today's AQI Pattern</SectionTitle>
        <Card style={{ marginBottom: 14, padding: '12px 10px' }}>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={hourlyData}>
              <XAxis dataKey="time" tick={{ fill: '#4a5a73', fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="aqi" stroke="#ff8c00"
                strokeWidth={2} dot={false}
                fill="rgba(255,140,0,0.1)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ height: 14 }} />
      </div>
    </aside>
  );
}

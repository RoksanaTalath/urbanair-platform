/**
 * UrbanAir — Header Component
 * Logo, search bar with city suggestions, live badge, clock
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUrbanAirStore from '../../store/urbanAirStore';
import toast from 'react-hot-toast';

const CITIES = [
  { name: 'Hyderabad',       lat: 17.3850, lng: 78.4867, meta: 'Telangana' },
  { name: 'Bangalore',       lat: 12.9716, lng: 77.5946, meta: 'Karnataka' },
  { name: 'Delhi',           lat: 28.6139, lng: 77.2090, meta: 'NCT Delhi' },
  { name: 'Mumbai',          lat: 19.0760, lng: 72.8777, meta: 'Maharashtra' },
  { name: 'Chennai',         lat: 13.0827, lng: 80.2707, meta: 'Tamil Nadu' },
  { name: 'Pune',            lat: 18.5204, lng: 73.8567, meta: 'Maharashtra' },
  { name: 'Kolkata',         lat: 22.5726, lng: 88.3639, meta: 'West Bengal' },
  { name: 'Ahmedabad',       lat: 23.0225, lng: 72.5714, meta: 'Gujarat' },
  { name: 'Noida',           lat: 28.5355, lng: 77.3910, meta: 'Uttar Pradesh' },
  { name: 'Gurgaon',         lat: 28.4595, lng: 77.0266, meta: 'Haryana' },
  { name: 'Madhapur',        lat: 17.4486, lng: 78.3908, meta: 'Hyderabad' },
  { name: 'Gachibowli',      lat: 17.4399, lng: 78.3489, meta: 'Hyderabad' },
  { name: 'Hitech City',     lat: 17.4435, lng: 78.3772, meta: 'Hyderabad' },
  { name: 'Banjara Hills',   lat: 17.4126, lng: 78.4484, meta: 'Hyderabad' },
  { name: 'Secunderabad',    lat: 17.4399, lng: 78.4983, meta: 'Hyderabad' },
  { name: 'Jubilee Hills',   lat: 17.4320, lng: 78.4072, meta: 'Hyderabad' },
  { name: 'Kondapur',        lat: 17.4609, lng: 78.3560, meta: 'Hyderabad' },
  { name: 'Kukatpally',      lat: 17.4948, lng: 78.3996, meta: 'Hyderabad' },
  { name: 'Uppal',           lat: 17.3980, lng: 78.5590, meta: 'Hyderabad' },
  { name: 'Koramangala',     lat: 12.9352, lng: 77.6245, meta: 'Bangalore' },
  { name: 'Whitefield',      lat: 12.9698, lng: 77.7500, meta: 'Bangalore' },
  { name: 'Indiranagar',     lat: 12.9784, lng: 77.6408, meta: 'Bangalore' },
  { name: 'Electronic City', lat: 12.8399, lng: 77.6770, meta: 'Bangalore' },
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, meta: 'Delhi' },
  { name: 'Anand Vihar',     lat: 28.6469, lng: 77.3160, meta: 'Delhi' },
  { name: 'Powai',           lat: 19.1176, lng: 72.9060, meta: 'Mumbai' },
  { name: 'Bandra',          lat: 19.0596, lng: 72.8295, meta: 'Mumbai' },
  { name: 'Anna Nagar',      lat: 13.0850, lng: 80.2101, meta: 'Chennai' },
  { name: 'Salt Lake',       lat: 22.5897, lng: 88.4143, meta: 'Kolkata' },
  { name: 'Lucknow',         lat: 26.8467, lng: 80.9462, meta: 'Uttar Pradesh' },
  { name: 'Jaipur',          lat: 26.9124, lng: 75.7873, meta: 'Rajasthan' },
  { name: 'Surat',           lat: 21.1702, lng: 72.8311, meta: 'Gujarat' },
  { name: 'Patna',           lat: 25.5941, lng: 85.1376, meta: 'Bihar' },
  { name: 'Nagpur',          lat: 21.1458, lng: 79.0882, meta: 'Maharashtra' },
];

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>
      {time}
    </span>
  );
}

export default function Header() {
  const { location, setLocation, loading } = useUrbanAirStore(s => ({
    location: s.location, setLocation: s.setLocation, loading: s.loading,
  }));

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync input with current location
  useEffect(() => { setQuery(location.city); }, [location.city]);

  const handleInput = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      // Local filter first
      const local = CITIES.filter(c =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        c.meta.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6);

      // Nominatim for anything not found locally
      let extra = [];
      if (local.length < 3) {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=in`,
            { headers: { 'User-Agent': 'UrbanAir/2.0' } }
          );
          const data = await r.json();
          extra = data.map(x => ({
            name: x.display_name.split(',')[0].trim(),
            lat: parseFloat(x.lat),
            lng: parseFloat(x.lon),
            meta: x.display_name.split(',').slice(1, 3).join(',').trim(),
          }));
        } catch (_) {}
      }

      const combined = [...local, ...extra.filter(e => !local.find(l => l.name === e.name))].slice(0, 8);
      setResults(combined);
      setOpen(combined.length > 0);
      setSearching(false);
    }, 220);
  }, []);

  const selectCity = useCallback((city) => {
    setQuery(city.name);
    setOpen(false);
    setLocation(city.name, city.lat, city.lng, city.meta ? `${city.name}, ${city.meta}` : city.name);
    toast.success(`📍 Switched to ${city.name}`, { duration: 2000 });
  }, [setLocation]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      background: 'rgba(5,8,16,0.97)',
      borderBottom: '1px solid var(--border)',
      height: 58,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
          borderRadius: 9, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, flexShrink: 0,
          boxShadow: '0 0 16px rgba(0,212,255,0.25)',
        }}>🌐</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            UrbanAir
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Hyperlocal Pollution Intelligence
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(0,212,255,0.4)' : 'var(--border2)'}`,
          borderRadius: 10, padding: '7px 14px',
          width: 300, transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {loading.global ? '⏳' : '🔍'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => query.length >= 2 && setOpen(results.length > 0)}
            placeholder="Search city, locality, area..."
            style={{
              background: 'none', border: 'none', color: 'var(--text)',
              fontSize: 13, fontFamily: 'Space Grotesk, sans-serif',
              outline: 'none', width: '100%',
            }}
          />
          {(searching || loading.global) && (
            <div style={{
              width: 14, height: 14, border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin-ring 0.8s linear infinite', flexShrink: 0,
            }} />
          )}
        </div>

        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 12, overflow: 'hidden', zIndex: 200,
                boxShadow: '0 12px 40px rgba(0,0,0,0.7)', transformOrigin: 'top',
              }}
            >
              {results.map((city, i) => (
                <motion.div
                  key={`${city.name}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => selectCity(city)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 16 }}>🇮🇳</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{city.name}</div>
                    {city.meta && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{city.meta}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.25)',
          color: 'var(--green)', padding: '4px 12px',
          borderRadius: 20, fontSize: 11, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <div style={{
            width: 6, height: 6, background: 'var(--green)',
            borderRadius: '50%', animation: 'pulse-dot 1.5s infinite',
          }} />
          LIVE
        </div>
        <Clock />
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', fontSize: 14,
        }}
          title="User account"
        >
          👤
        </div>
      </div>
    </header>
  );
}

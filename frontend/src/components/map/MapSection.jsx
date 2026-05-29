/**
 * UrbanAir — MapSection Component
 * Full Leaflet map with:
 *   - Dark CartoDB basemap
 *   - Microzone pollution circles (heatmap simulation)
 *   - Hotspot markers with popups
 *   - AQI label overlays
 *   - Layer toggles
 *   - Fly-to animation on city change
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUrbanAirStore, { getAqiConfig } from '../../store/urbanAirStore';

// Dynamically import Leaflet (no SSR issues)
let L = null;

export default function MapSection() {
  const mapRef   = useRef(null);
  const mapInst  = useRef(null);
  const layersRef = useRef([]);

  const { location, microzones, aqiData, mapLayers, toggleMapLayer, loading } = useUrbanAirStore(s => ({
    location:    s.location,
    microzones:  s.microzones,
    aqiData:     s.aqiData,
    mapLayers:   s.mapLayers,
    toggleMapLayer: s.toggleMapLayer,
    loading:     s.loading,
  }));

  const [tooltip, setTooltip] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredAqi, setHoveredAqi] = useState(null);

  // ── Init Map ──────────────────────────────────────────────
  useEffect(() => {
    if (mapInst.current || !mapRef.current) return;

    import('leaflet').then(leaflet => {
      L = leaflet.default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInst.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  // ── Fly to location on city change ───────────────────────
  useEffect(() => {
    if (!mapInst.current || !mapReady) return;
    mapInst.current.flyTo([location.lat, location.lng], 13, {
      duration: 1.4, easeLinearity: 0.4,
    });
  }, [location.lat, location.lng, mapReady]);

  // ── Render layers when microzones or toggles change ──────
  useEffect(() => {
    if (!mapInst.current || !L || !mapReady) return;

    // Clear all dynamic layers
    layersRef.current.forEach(l => { try { mapInst.current.removeLayer(l); } catch (_) {} });
    layersRef.current = [];

    // ── Heatmap circles ──
    if (mapLayers.heatmap) {
      microzones.forEach(zone => {
        const cfg = getAqiConfig(zone.aqi);

        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radius + 100,
          color: cfg.color,
          fillColor: cfg.color,
          fillOpacity: 0.12,
          weight: 0.8,
          opacity: 0.35,
        });

        circle.on('mouseover', (e) => {
          setHoveredAqi(`${zone.aqi} AQI — ${zone.name}`);
          setTooltip({
            name: zone.name,
            type: zone.typeLabel,
            aqi: zone.aqi,
            color: cfg.color,
            level: cfg.label,
            pm25: zone.pm25,
            pm10: zone.pm10,
            risk: zone.risk,
          });
          circle.setStyle({ fillOpacity: 0.28, weight: 1.5, opacity: 0.7 });
        });

        circle.on('mouseout', () => {
          setTooltip(null);
          setHoveredAqi(null);
          circle.setStyle({ fillOpacity: 0.12, weight: 0.8, opacity: 0.35 });
        });

        circle.addTo(mapInst.current);
        layersRef.current.push(circle);
      });
    }

    // ── Hotspot markers ──
    if (mapLayers.hotspots) {
      const topHotspots = microzones.filter(z => z.aqi > 150).slice(0, 8);
      topHotspots.forEach(zone => {
        const cfg = getAqiConfig(zone.aqi);

        const pulse = L.circleMarker([zone.lat, zone.lng], {
          radius: 12, color: cfg.color, fillColor: cfg.color,
          fillOpacity: 0.7, weight: 2,
        });
        pulse.bindPopup(`
          <div style="font-family:Space Grotesk,sans-serif;min-width:160px">
            <div style="font-size:13px;font-weight:600;margin-bottom:6px">${zone.icon} ${zone.name}</div>
            <div style="font-size:12px;color:#8899b4;margin-bottom:4px">${zone.typeLabel}</div>
            <div style="font-size:22px;font-weight:700;color:${cfg.color};font-family:JetBrains Mono,monospace;margin-bottom:4px">${zone.aqi} AQI</div>
            <div style="font-size:11px;color:${cfg.color}">${cfg.label}</div>
            <div style="margin-top:8px;font-size:11px;color:#8899b4">
              PM2.5: ${zone.pm25} µg/m³<br/>
              PM10: ${zone.pm10} µg/m³
            </div>
          </div>
        `, { className: 'urbanair-popup' });

        pulse.addTo(mapInst.current);
        layersRef.current.push(pulse);
      });
    }

    // ── Zone AQI labels ──
    if (mapLayers.zones) {
      microzones.slice(0, 12).forEach(zone => {
        const cfg = getAqiConfig(zone.aqi);
        const icon = L.divIcon({
          html: `<div style="
            background:rgba(5,8,16,0.9);
            border:1px solid ${cfg.color};
            border-radius:6px;
            padding:2px 6px;
            font-size:10px;
            color:${cfg.color};
            white-space:nowrap;
            font-family:JetBrains Mono,monospace;
            font-weight:600;
            pointer-events:none;
            box-shadow:0 0 8px ${cfg.color}33;
          ">${zone.aqi}</div>`,
          className: '',
          iconAnchor: [18, 9],
        });
        const m = L.marker([zone.lat, zone.lng], { icon });
        m.addTo(mapInst.current);
        layersRef.current.push(m);
      });
    }

    // ── Traffic corridor highlights ──
    if (mapLayers.traffic) {
      const trafficZones = microzones.filter(z => z.type === 'traffic_corridor');
      trafficZones.forEach(zone => {
        const poly = L.circle([zone.lat, zone.lng], {
          radius: zone.radius * 1.5,
          color: '#ff8c00',
          fillColor: '#ff8c00',
          fillOpacity: 0.08,
          weight: 1.5,
          opacity: 0.5,
          dashArray: '6 4',
        });
        poly.addTo(mapInst.current);
        layersRef.current.push(poly);
      });
    }

    // ── Center pin ──
    if (L) {
      const centerIcon = L.divIcon({
        html: `<div style="
          width:16px;height:16px;
          background:#00d4ff;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 14px rgba(0,212,255,0.6);
        "></div>`,
        className: '',
        iconAnchor: [8, 8],
      });
      const pin = L.marker([location.lat, location.lng], { icon: centerIcon });
      pin.bindPopup(`<b>${location.city}</b><br>${aqiData?.aqi ?? '--'} AQI`);
      pin.addTo(mapInst.current);
      layersRef.current.push(pin);
    }
  }, [microzones, mapLayers, mapReady, location.lat, location.lng]);

  // ── Layer toggle buttons ──────────────────────────────────
  const layerButtons = [
    { id: 'heatmap',  label: '🌡 Heatmap',  },
    { id: 'hotspots', label: '🔴 Hotspots', },
    { id: 'zones',    label: '🏷 Labels',   },
    { id: 'traffic',  label: '🚗 Traffic',  },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        background: 'rgba(5,8,16,0.95)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        backdropFilter: 'blur(6px)', flexShrink: 0,
      }}>
        {layerButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => toggleMapLayer(btn.id)}
            style={{
              background: mapLayers[btn.id] ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${mapLayers[btn.id] ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
              color: mapLayers[btn.id] ? 'var(--accent)' : 'var(--text2)',
              padding: '5px 12px', borderRadius: 8, fontSize: 12,
              cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.2s',
            }}
          >
            {btn.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
          {hoveredAqi || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
        </div>
      </div>

      {/* Map container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />

        {/* Top-left overlay badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 10,
          background: 'rgba(5,8,16,0.88)',
          border: '1px solid var(--border2)',
          borderRadius: 10, padding: '8px 14px',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
            Street-Level AQI
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: aqiData ? getAqiConfig(aqiData.aqi).color : 'var(--text3)',
          }}>
            {hoveredAqi ? hoveredAqi.split(' — ')[0] : (aqiData ? `${aqiData.aqi} AQI` : '-- AQI')}
          </div>
        </div>

        {/* AQI Legend */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, zIndex: 10,
          background: 'rgba(5,8,16,0.88)',
          border: '1px solid var(--border2)',
          borderRadius: 10, padding: '10px 14px',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 7 }}>
            AQI Scale
          </div>
          {[
            ['#00e400', 'Good (0–50)'],
            ['#ffff00', 'Moderate (51–100)'],
            ['#ff7e00', 'Unhealthy Sensitive (101–150)'],
            ['#ff0000', 'Unhealthy (151–200)'],
            ['#8f3f97', 'Very Unhealthy (201–300)'],
            ['#7e0023', 'Hazardous (300+)'],
          ].map(([color, label]) => (
            <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: `0 0 4px ${color}66`,
              }} />
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Zone hover tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 10,
                background: 'rgba(5,8,16,0.95)',
                border: `1px solid ${tooltip.color}55`,
                borderRadius: 12, padding: 14,
                backdropFilter: 'blur(8px)',
                minWidth: 180, pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{tooltip.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{tooltip.type}</div>
              <div style={{
                fontSize: 28, fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                color: tooltip.color, lineHeight: 1, marginBottom: 2,
              }}>
                {tooltip.aqi}
              </div>
              <div style={{ fontSize: 11, color: tooltip.color, marginBottom: 10 }}>{tooltip.level}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                PM2.5: {tooltip.pm25} µg/m³<br />
                PM10: {tooltip.pm10} µg/m³<br />
                Risk: <span style={{ color: tooltip.color }}>{tooltip.risk}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading overlay */}
        <AnimatePresence>
          {loading.global && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(5,8,16,0.75)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, zIndex: 20,
                backdropFilter: 'blur(4px)',
              }}
            >
              <div style={{
                width: 36, height: 36,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin-ring 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Loading {location.city} pollution data...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

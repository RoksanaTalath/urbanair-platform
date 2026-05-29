/**
 * UrbanAir — API Services Layer
 * Centralized API calls with fallback simulation for Indian cities
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const WAQI_TOKEN = import.meta.env.VITE_WAQI_TOKEN || 'demo';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('urbanair_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => Promise.reject(err)
);

// ─── AQI Level Helper ─────────────────────────────────────────
export const getAqiConfig = (aqi) => {
  const levels = [
    { max: 50,  label: 'Good',                    color: '#00e400', text: '#00cc00' },
    { max: 100, label: 'Moderate',                color: '#ffff00', text: '#cccc00' },
    { max: 150, label: 'Unhealthy for Sensitive', color: '#ff7e00', text: '#ff7e00' },
    { max: 200, label: 'Unhealthy',               color: '#ff0000', text: '#ff4444' },
    { max: 300, label: 'Very Unhealthy',          color: '#8f3f97', text: '#cc66dd' },
    { max: 500, label: 'Hazardous',               color: '#7e0023', text: '#cc4466' },
  ];
  return levels.find(l => aqi <= l.max) || levels[5];
};

// ─── City AQI Baselines (Indian Cities) ──────────────────────
const CITY_BASELINES = {
  delhi: 180, noida: 170, gurgaon: 165, faridabad: 172, ghaziabad: 175,
  kolkata: 145, ahmedabad: 130, patna: 162, lucknow: 155, kanpur: 168,
  mumbai: 105, pune: 90, nagpur: 95, nashik: 88,
  hyderabad: 100, bangalore: 82, bengaluru: 82, chennai: 88,
  madhapur: 88, gachibowli: 82, 'hitech city': 85,
  'banjara hills': 90, secunderabad: 105, 'jubilee hills': 88,
  kondapur: 84, kukatpally: 98, uppal: 112, nacharam: 115,
  koramangala: 80, whitefield: 75, indiranagar: 83,
  'connaught place': 175, 'anand vihar': 195, rohini: 170,
  'salt lake': 130, 'new town': 110,
  'anna nagar': 85, 'adyar': 80, 't nagar': 92,
};

const getHourFactor = () => {
  const h = new Date().getHours();
  if (h >= 7 && h <= 9)   return 1.25;
  if (h >= 17 && h <= 20) return 1.35;
  if (h >= 0 && h <= 5)   return 0.65;
  if (h >= 10 && h <= 16) return 1.08;
  return 1.0;
};

const getSeasonFactor = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 11 || m <= 2) return 1.28;
  if (m >= 6 && m <= 9)  return 0.82;
  return 1.0;
};

const simulateAQI = (lat, lng, cityName) => {
  const key = Object.keys(CITY_BASELINES).find(k => cityName.toLowerCase().includes(k));
  const base = key ? CITY_BASELINES[key] : 100;
  const aqi = Math.round(base * getHourFactor() * getSeasonFactor() * (0.9 + Math.random() * 0.2));
  const clampedAqi = Math.max(10, Math.min(500, aqi));
  const cfg = getAqiConfig(clampedAqi);
  return {
    aqi: clampedAqi,
    city: cityName,
    dominant_pollutant: clampedAqi > 150 ? 'pm25' : 'pm10',
    pollutants: {
      pm25: Math.round(clampedAqi * 0.45 * (0.9 + Math.random() * 0.2)),
      pm10: Math.round(clampedAqi * 0.70 * (0.9 + Math.random() * 0.2)),
      no2:  Math.round(clampedAqi * 0.28 * (0.9 + Math.random() * 0.2)),
      o3:   Math.round(clampedAqi * 0.22 * (0.9 + Math.random() * 0.2)),
      co:   Math.round(clampedAqi * 0.08 * (0.9 + Math.random() * 0.2)),
      so2:  Math.round(clampedAqi * 0.12 * (0.9 + Math.random() * 0.2)),
    },
    temp:     Math.round(24 + (lat - 20) * -0.4 + Math.random() * 8),
    humidity: Math.round(55 + Math.random() * 25),
    wind:     Math.round(8 + Math.random() * 12),
    level:    cfg.label,
    color:    cfg.color,
    source:   'simulated',
    time:     new Date().toISOString(),
  };
};

// ─── Zone Simulation Engine ───────────────────────────────────
const ZONE_PROFILES = {
  industrial:        { mult: 1.65, pm25: 1.8,  pm10: 2.0,  label: 'Industrial Zone',         icon: '🏭', risk: 'HIGH' },
  traffic_corridor:  { mult: 1.45, pm25: 1.5,  pm10: 1.6,  label: 'Traffic Corridor',        icon: '🚗', risk: 'HIGH' },
  commercial:        { mult: 1.20, pm25: 1.2,  pm10: 1.3,  label: 'Commercial Hub',           icon: '🏪', risk: 'MODERATE' },
  residential_dense: { mult: 0.95, pm25: 0.9,  pm10: 0.85, label: 'Dense Residential',       icon: '🏘', risk: 'MODERATE' },
  residential_low:   { mult: 0.75, pm25: 0.7,  pm10: 0.65, label: 'Low-Density Residential', icon: '🏡', risk: 'LOW' },
  green_space:       { mult: 0.45, pm25: 0.4,  pm10: 0.35, label: 'Green Space',             icon: '🌿', risk: 'LOW' },
  airport:           { mult: 1.55, pm25: 1.7,  pm10: 1.5,  label: 'Airport Vicinity',        icon: '✈️', risk: 'HIGH' },
  construction:      { mult: 1.75, pm25: 1.4,  pm10: 2.5,  label: 'Construction Zone',       icon: '🏗', risk: 'VERY HIGH' },
  water_body:        { mult: 0.55, pm25: 0.5,  pm10: 0.45, label: 'Near Water Body',         icon: '💧', risk: 'LOW' },
};

const CITY_ZONES = {
  hyderabad: [
    ['Uppal Industrial Corridor', 'industrial'],
    ['Old City Traffic Hub', 'traffic_corridor'],
    ['Secunderabad Junction', 'traffic_corridor'],
    ['Gachibowli Tech Park', 'commercial'],
    ['Mehdipatnam Intersection', 'traffic_corridor'],
    ['Nacharam Industrial Area', 'industrial'],
    ['LB Nagar Flyover', 'traffic_corridor'],
    ['Kukatpally Housing Board', 'residential_dense'],
    ['Kondapur Residential', 'residential_low'],
    ['Biodiversity Park', 'green_space'],
    ['RGIA Airport Vicinity', 'airport'],
    ['Tarnaka Junction', 'traffic_corridor'],
    ['Dilsukhnagar Market', 'commercial'],
    ['Hussain Sagar Lakefront', 'water_body'],
    ['Miyapur Construction', 'construction'],
    ['Banjara Hills', 'residential_low'],
    ['Hitech City Commercial', 'commercial'],
    ['Shamshabad Industrial', 'industrial'],
    ['Nampally Old Town', 'residential_dense'],
    ['Madhapur IT Corridor', 'commercial'],
  ],
  bangalore: [
    ['Peenya Industrial Area', 'industrial'],
    ['Silk Board Junction', 'traffic_corridor'],
    ['Koramangala Tech', 'commercial'],
    ['Whitefield IT Park', 'commercial'],
    ['Bannerghatta Road', 'traffic_corridor'],
    ['Hebbal Flyover', 'traffic_corridor'],
    ['Cubbon Park', 'green_space'],
    ['Yelahanka Old Town', 'residential_dense'],
    ['Electronic City', 'commercial'],
    ['BIAL Airport Zone', 'airport'],
    ['Indiranagar 100ft', 'commercial'],
    ['Rajajinagar Industrial', 'industrial'],
    ['Bellandur Lake', 'water_body'],
    ['Marathahalli Construction', 'construction'],
    ['JP Nagar Residential', 'residential_low'],
  ],
  delhi: [
    ['Anand Vihar ISBT', 'traffic_corridor'],
    ['Okhla Industrial', 'industrial'],
    ['Connaught Place', 'commercial'],
    ['Lodhi Garden', 'green_space'],
    ['Wazirpur Industrial', 'industrial'],
    ['IGI Airport', 'airport'],
    ['Nehru Place', 'commercial'],
    ['Yamuna Riverfront', 'water_body'],
    ['Dwarka Residential', 'residential_dense'],
    ['Noida Expressway', 'traffic_corridor'],
    ['Rohini Sector 9', 'residential_dense'],
    ['Shahdara Junction', 'traffic_corridor'],
    ['Mundka Industrial', 'industrial'],
    ['Saket Mall Area', 'commercial'],
    ['Hauz Khas Village', 'residential_low'],
  ],
};

const GENERIC_ZONES = [
  ['Industrial Cluster A', 'industrial'], ['Main Traffic Corridor', 'traffic_corridor'],
  ['City Centre Junction', 'commercial'], ['Tech Park Zone', 'commercial'],
  ['Market District', 'commercial'], ['Outer Ring Road', 'traffic_corridor'],
  ['Residential Block N', 'residential_dense'], ['Commercial Hub E', 'commercial'],
  ['Green Belt Area', 'green_space'], ['Transport Terminal', 'traffic_corridor'],
  ['Factory Sector', 'industrial'], ['University Zone', 'residential_low'],
  ['Old Town Area', 'residential_dense'], ['New Township', 'residential_low'],
  ['Highway Interchange', 'traffic_corridor'], ['Airport Vicinity', 'airport'],
  ['Lakefront Area', 'water_body'], ['Construction Site', 'construction'],
  ['Suburban Pocket', 'residential_low'], ['Business District', 'commercial'],
];

const simulateMicrozones = (lat, lng, baseAqi, cityName, count = 20) => {
  const key = Object.keys(CITY_ZONES).find(k => cityName.toLowerCase().includes(k));
  const definitions = key ? CITY_ZONES[key].slice(0, count) : GENERIC_ZONES.slice(0, count);
  const timeFactor = getHourFactor();
  const seasonFactor = getSeasonFactor();

  return definitions.map(([name, type], i) => {
    const profile = ZONE_PROFILES[type] || ZONE_PROFILES.commercial;
    const angle = i * 2.399963; // golden angle
    const dist = (0.2 + (i / count) * 0.8) * 3;
    const latOff = (dist / 111.32) * Math.sin(angle);
    const lngOff = (dist / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.cos(angle);

    const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitter = 0.88 + (seed % 100) / 333;
    const aqi = Math.max(5, Math.min(500, Math.round(baseAqi * profile.mult * timeFactor * seasonFactor * jitter)));
    const cfg = getAqiConfig(aqi);
    const prev = Math.round(aqi * (0.9 + Math.random() * 0.2));
    const trend = aqi > prev ? '↑' : aqi < prev ? '↓' : '→';

    return {
      id: i,
      name,
      type,
      typeLabel: profile.label,
      icon: profile.icon,
      risk: profile.risk,
      lat: +(lat + latOff + (Math.random() - 0.5) * 0.002).toFixed(6),
      lng: +(lng + lngOff + (Math.random() - 0.5) * 0.002).toFixed(6),
      aqi,
      level: cfg.label,
      color: cfg.color,
      trend,
      trendPct: Math.round(Math.abs(aqi - prev) / Math.max(prev, 1) * 100),
      radius: 250 + i * 20,
      distKm: +dist.toFixed(2),
      pm25: Math.round(aqi * 0.45 * profile.pm25),
      pm10: Math.round(aqi * 0.70 * profile.pm10),
      no2: Math.round(aqi * 0.28),
    };
  }).sort((a, b) => b.aqi - a.aqi);
};

// ─── Service Objects ──────────────────────────────────────────
export const aqiService = {
  async fetchAQI(lat, lng, city) {
    try {
      const r = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`
      );
      const d = await r.json();
      if (d.status === 'ok' && d.data?.aqi) {
        const { data: w } = d;
        const iaqi = w.iaqi || {};
        return {
          aqi: parseInt(w.aqi),
          city: w.city?.name || city,
          dominant_pollutant: w.dominentpol || 'pm25',
          pollutants: {
            pm25: iaqi.pm25?.v, pm10: iaqi.pm10?.v,
            no2: iaqi.no2?.v, o3: iaqi.o3?.v, co: iaqi.co?.v, so2: iaqi.so2?.v,
          },
          temp: iaqi.t?.v || Math.round(24 + Math.random() * 8),
          humidity: iaqi.h?.v || Math.round(55 + Math.random() * 25),
          wind: iaqi.w?.v || Math.round(8 + Math.random() * 12),
          level: getAqiConfig(parseInt(w.aqi)).label,
          color: getAqiConfig(parseInt(w.aqi)).color,
          source: 'waqi',
          time: w.time?.s || new Date().toISOString(),
        };
      }
    } catch (_) {}
    return simulateAQI(lat, lng, city);
  },

  async fetchMicrozones(lat, lng, city, count = 20) {
    try {
      const base = await this.fetchAQI(lat, lng, city);
      const zones = simulateMicrozones(lat, lng, base.aqi, city, count);
      return { center: { lat, lng }, city, base_aqi: base.aqi, zones, zone_count: zones.length };
    } catch (_) {
      return { center: { lat, lng }, city, zones: [], zone_count: 0 };
    }
  },
};

export const forecastService = {
  async fetchHourly(lat, lng, city) {
    try {
      const base = await aqiService.fetchAQI(lat, lng, city);
      const baseAqi = base.aqi;
      const FACTORS = [
        0.68, 0.62, 0.58, 0.55, 0.57, 0.65,
        0.80, 1.10, 1.28, 1.20, 1.08, 1.05,
        1.10, 1.15, 1.18, 1.15, 1.12, 1.30,
        1.38, 1.35, 1.20, 1.05, 0.90, 0.75,
      ];
      const now = new Date();
      const hourly = Array.from({ length: 24 }, (_, i) => {
        const t = new Date(now); t.setHours(now.getHours() + i);
        const h = t.getHours();
        const aqi = Math.max(5, Math.min(500, Math.round(baseAqi * FACTORS[h] * (0.88 + Math.random() * 0.24))));
        return {
          hour: h, label: i === 0 ? 'Now' : `+${i}h`,
          time: `${String(h).padStart(2, '0')}:00`,
          aqi, level: getAqiConfig(aqi).label, color: getAqiConfig(aqi).color,
          isPeak: FACTORS[h] >= 1.25, isRushHour: (h >= 7 && h <= 10) || (h >= 17 && h <= 20),
        };
      });

      const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekly = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() + i - 3);
        const wd = d.getDay();
        const weekend = wd === 0 || wd === 6;
        const aqi = Math.max(5, Math.min(500, Math.round(baseAqi * (weekend ? 0.88 : 1.0) * (0.82 + Math.random() * 0.36))));
        return {
          day: DAYS[(d.getDay() + 6) % 7], date: d.toISOString().split('T')[0],
          aqi, level: getAqiConfig(aqi).label, color: getAqiConfig(aqi).color,
          isToday: i === 3, isForecast: i > 3, isWeekend: weekend,
        };
      });

      return { hourly, weekly, base_aqi: baseAqi, city };
    } catch (_) {
      return { hourly: [], weekly: [], city };
    }
  },
};

export const insightService = {
  async fetchInsights(aqi, city, dominant = 'pm25') {
    const hour = new Date().getHours();
    const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    const cfg = getAqiConfig(aqi);

    const POLLUTANT_INFO = {
      pm25: { name: 'PM2.5 (Fine Particles)', source: 'Vehicle exhaust, industrial burning', icon: '💨' },
      pm10: { name: 'PM10 (Coarse Particles)', source: 'Dust, construction, road resuspension', icon: '🌫' },
      no2:  { name: 'Nitrogen Dioxide', source: 'Vehicle engines, power plants', icon: '🚗' },
      o3:   { name: 'Ground-level Ozone', source: 'Photochemical NOx + VOC reaction', icon: '☀️' },
    };

    let recs = [], alerts = [], activities = [];

    if (aqi <= 50) {
      recs = ['Air quality is excellent. Outdoor activities are unrestricted.', 'Great day for morning jogs, cycling, and outdoor sports.'];
      activities = [{ a: 'Outdoor jogging', safe: true }, { a: 'Cycling', safe: true }, { a: "Children's play", safe: true }];
    } else if (aqi <= 100) {
      recs = [`Moderate air quality in ${city}. Acceptable for most people.`, 'Sensitive individuals should limit prolonged strenuous outdoor activity.'];
      activities = [{ a: 'Light jogging', safe: true }, { a: 'Heavy cycling on roads', safe: false }, { a: "Children's play (short)", safe: true }];
    } else if (aqi <= 150) {
      recs = [`Air quality is concerning in ${city}. Sensitive groups should take precautions.`, 'Industrial zones showing elevated PM10. Avoid construction areas.'];
      alerts.push({ level: 'warning', text: 'Sensitive groups: children, elderly, asthma patients — limit outdoor time.' });
      activities = [{ a: 'Strenuous exercise', safe: false }, { a: 'Short walks', safe: true }, { a: 'Children outdoors', safe: false }];
    } else if (aqi <= 200) {
      recs = [`Unhealthy air quality in ${city}. Reduce outdoor exposure for all groups.`, 'Wear N95/KN95 mask outdoors. Run air purifiers indoors.'];
      alerts.push({ level: 'danger', text: 'Unhealthy for everyone. Reduce all outdoor activity.' });
      activities = [{ a: 'Any outdoor exercise', safe: false }, { a: 'Commuting on foot', safe: false }, { a: 'Indoor exercise', safe: true }];
    } else {
      recs = [`HAZARDOUS conditions in ${city}. This is a health emergency.`, 'Avoid all outdoor exposure. Seek shelter immediately if outdoors.'];
      alerts.push({ level: 'critical', text: 'HAZARDOUS: Stay indoors. Health emergency.' });
      activities = [{ a: 'Any outdoor activity', safe: false }, { a: 'Indoor with purifier', safe: true }];
    }

    if (isRushHour && aqi > 80) {
      recs.push('Rush hour detected — traffic corridors showing 30-50% higher AQI than city average.');
    }

    return {
      aqi, city, summary: recs[0], recommendations: recs, alerts, activities,
      dominant_pollutant: dominant,
      pollutant_info: POLLUTANT_INFO[dominant] || POLLUTANT_INFO.pm25,
      mask_required: aqi > 100,
      air_purifier_advised: aqi > 100,
      risk_score: Math.min(100, Math.round((aqi / 300) * 100)),
      is_rush_hour: isRushHour,
      generated_at: new Date().toISOString(),
    };
  },
};

export default api;

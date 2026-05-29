/**
 * UrbanAir — Global State Store (Zustand)
 * 
 * Centralized state management.
 * ALL components read from here.
 * Location changes trigger atomic updates across every widget.
 */
import { create } from 'zustand';
import { aqiService, forecastService, insightService, getAqiConfig } from '../services/aqiService';

export { getAqiConfig };

const useUrbanAirStore = create((set, get) => ({
  // ─── Location State ───────────────────────────────────────
  location: {
    city: 'Hyderabad',
    lat: 17.3850,
    lng: 78.4867,
    displayName: 'Hyderabad, Telangana, India',
  },

  // ─── Data State ───────────────────────────────────────────
  aqiData: null,
  microzones: [],
  hotspots: [],
  hourlyForecast: [],
  weeklyTrend: [],
  aiInsights: null,

  // ─── UI State ─────────────────────────────────────────────
  loading: {
    aqi: false, microzones: false, forecast: false, insights: false, global: false,
  },
  activeTab: 'overview',
  mapLayers: {
    heatmap: true, hotspots: false, zones: false, traffic: false,
  },
  error: null,
  lastUpdated: null,

  // ─── Actions ──────────────────────────────────────────────

  /**
   * setLocation — master action.
   * Atomically resets ALL state and fetches fresh data.
   * Zero stale data guaranteed.
   */
  setLocation: async (city, lat, lng, displayName) => {
    const prev = get().location;
    if (prev.city === city && Math.abs(prev.lat - lat) < 0.001) return;

    // Reset everything immediately
    set({
      location: { city, lat, lng, displayName: displayName || city },
      loading: { aqi: true, microzones: true, forecast: true, insights: true, global: true },
      error: null,
      aqiData: null,
      microzones: [],
      hotspots: [],
      hourlyForecast: [],
      weeklyTrend: [],
      aiInsights: null,
    });

    try {
      // Parallel fetch — all data loads simultaneously
      const [aqiResult, forecastResult, zoneResult] = await Promise.allSettled([
        aqiService.fetchAQI(lat, lng, city),
        forecastService.fetchHourly(lat, lng, city),
        aqiService.fetchMicrozones(lat, lng, city, 20),
      ]);

      const aqi     = aqiResult.status     === 'fulfilled' ? aqiResult.value     : null;
      const forecast = forecastResult.status === 'fulfilled' ? forecastResult.value : null;
      const zones   = zoneResult.status    === 'fulfilled' ? zoneResult.value    : null;

      const microzones = zones?.zones || [];
      const hotspots = microzones.filter(z => z.aqi >= 150).slice(0, 8);

      set({
        aqiData: aqi,
        microzones,
        hotspots,
        hourlyForecast: forecast?.hourly || [],
        weeklyTrend: forecast?.weekly || [],
        loading: { aqi: false, microzones: false, forecast: false, insights: true, global: false },
        lastUpdated: new Date().toISOString(),
      });

      // AI insights after core data loads
      if (aqi) {
        try {
          const insights = await insightService.fetchInsights(
            aqi.aqi, city, aqi.dominant_pollutant || 'pm25'
          );
          set({ aiInsights: insights, loading: { ...get().loading, insights: false } });
        } catch {
          set({ loading: { ...get().loading, insights: false } });
        }
      }

    } catch (err) {
      set({
        error: `Failed to load data for ${city}. Check your internet connection.`,
        loading: { aqi: false, microzones: false, forecast: false, insights: false, global: false },
      });
    }
  },

  refreshData: () => {
    const { location } = get();
    get().setLocation(location.city, location.lat, location.lng, location.displayName);
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleMapLayer: (layer) =>
    set(state => ({
      mapLayers: { ...state.mapLayers, [layer]: !state.mapLayers[layer] },
    })),

  clearError: () => set({ error: null }),
}));

export default useUrbanAirStore;

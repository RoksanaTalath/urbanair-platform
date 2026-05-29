/**
 * UrbanAir — Dashboard Page
 * Master layout: Header + Sidebar + Map + Right Panel
 * All children subscribe to Zustand store — always in sync.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUrbanAirStore from '../store/urbanAirStore';
import Header from '../components/dashboard/Header';
import Sidebar from '../components/dashboard/Sidebar';
import MapSection from '../components/map/MapSection';
import RightPanel from '../components/dashboard/RightPanel';
import AnalyticsBar, { ErrorBanner } from '../components/dashboard/AnalyticsBar';

export default function Dashboard() {
  const { error, loading } = useUrbanAirStore(s => ({ error: s.error, loading: s.loading }));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      <Header />

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>

      {/* Main 3-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr 310px',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <Sidebar />
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MapSection />
          <AnalyticsBar />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}

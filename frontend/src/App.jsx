/**
 * UrbanAir — Main App Component
 * React Router setup, global providers, layout shell
 */
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useUrbanAirStore from './store/urbanAirStore';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const setLocation = useUrbanAirStore(s => s.setLocation);

  useEffect(() => {
    // Boot with Hyderabad as default; attempt geolocation
    setLocation('Hyderabad', 17.3850, 78.4867, 'Hyderabad, Telangana, India');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          // Reverse geocode via Nominatim to get city name
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
            .then(r => r.json())
            .then(d => {
              const city = d.address?.city || d.address?.town || d.address?.county || 'Your Location';
              setLocation(city, coords.latitude, coords.longitude, d.display_name);
            })
            .catch(() => {});
        },
        () => {}
      );
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1224',
            color: '#e8edf5',
            border: '1px solid #1e2a3d',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

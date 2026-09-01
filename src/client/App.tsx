import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import OceanBackground from './components/layout/OceanBackground'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import { useAuthStore } from './store/authStore'
import { syncOfflineData } from './services/offline/cacheService';
import { roleConfigs } from './config/roleConfig';
import type { UserRole } from './config/roleConfig';

// Auth Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Protected Pages
import HomePage from './pages/Home'
import DashboardPage from './pages/Dashboard'
import LiveMapPage from './pages/LiveMap'
import TripPlannerPage from './pages/TripPlanner'
import WeatherOceanPage from './pages/WeatherOcean'
import ClimatePage from './pages/Climate'
import ReportsPage from './pages/Reports'
import FishingZonesPage from './pages/FishingZones'
import AlertsPage from './pages/Alerts'
import BoundariesPage from './pages/Boundaries'
import CommunityPage from './pages/Community'
import SOSPage from './pages/SOS'

// Protected Route Wrapper
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <Outlet />
      </div>
    </div>
  );
};

// Public Route Wrapper
const PublicRoute = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return (
    <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Outlet />
    </div>
  );
};

import { useAppStore } from './store'
import LocationPromptModal from './components/ui/LocationPromptModal'

export default function App() {
  const checkAuth = useAuthStore(state => state.clearError);
  const user = useAppStore(state => state.user);
  const fetchWeather = useAppStore(state => state.fetchWeather);
  const setOfflineMode = useAppStore(state => state.setOfflineMode);
  const setLastSyncTime = useAppStore(state => state.setLastSyncTime);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleOnline = () => {
      setOfflineMode(false);
      setLastSyncTime(new Date());
      if (user?.location?.lat && user?.location?.lon) {
        fetchWeather(user.location.lat, user.location.lon);
        const role: UserRole = (user.role as UserRole) || 'general';
        syncOfflineData(roleConfigs[role], user.location.lat, user.location.lon);
      }
    };
    
    const handleOffline = () => {
      setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineMode, setLastSyncTime, user?.location?.lat, user?.location?.lon, fetchWeather, user?.role]);

  // Fetch weather on mount and every 15 minutes
  useEffect(() => {
    if (user?.location?.lat && user?.location?.lon) {
      const lat = user.location.lat;
      const lon = user.location.lon;
      fetchWeather(lat, lon);
      const interval = setInterval(() => {
        if (navigator.onLine) {
          fetchWeather(lat, lon);
          setLastSyncTime(new Date());
        }
      }, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.location?.lat, user?.location?.lon, fetchWeather, setLastSyncTime]);

  return (
    <>
      {/* Animated ocean background - fixed behind everything */}
      <OceanBackground />

      {/* Global Location Prompt Modal */}
      <LocationPromptModal />

      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home"       element={<HomePage />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/profile"    element={<DashboardPage />} />
          <Route path="/settings"   element={<DashboardPage />} />
          
          <Route path="/map"        element={<LiveMapPage />} />
          <Route path="/planner"    element={<TripPlannerPage />} />
          <Route path="/weather"    element={<WeatherOceanPage />} />
          <Route path="/climate"    element={<ClimatePage />} />
          <Route path="/reports"    element={<ReportsPage />} />
          <Route path="/fishing"    element={<FishingZonesPage />} />
          <Route path="/alerts"     element={<AlertsPage />} />
          <Route path="/boundaries" element={<BoundariesPage />} />
          <Route path="/community"  element={<CommunityPage />} />
          <Route path="/sos"        element={<SOSPage />} />
        </Route>
      </Routes>
    </>
  )
}

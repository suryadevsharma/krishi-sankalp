import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/store';

// Component imports
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';

// Page imports
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Sankalp from './pages/Sankalp';
import Saadhna from './pages/Saadhna';
import Samriddhi from './pages/Samriddhi';
import Profile from './pages/Profile';
import LabPortal from './pages/LabPortal';
import Admin from './pages/Admin';
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';

// Route protector wrapper
function ProtectedRoute({ children }) {
  const token = useStore(state => state.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const initAuth = useStore(state => state.initAuth);
  const token = useStore(state => state.token);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen pb-16 md:pb-0">
        <Navbar />
        
        <main className="flex-grow">
          <Routes>
            {/* Public Auth routes */}
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected Farmer routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/sankalp" element={
              <ProtectedRoute>
                <Sankalp />
              </ProtectedRoute>
            } />
            <Route path="/saadhna" element={
              <ProtectedRoute>
                <Saadhna />
              </ProtectedRoute>
            } />
            <Route path="/samriddhi" element={
              <ProtectedRoute>
                <Samriddhi />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Protected Technician & Admin routes */}
            <Route path="/lab-portal" element={
              <ProtectedRoute>
                <LabPortal />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {/* Mobile Sticky Footer */}
        <MobileBottomNav />
        
        {/* Global Action Toasts */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid rgba(26,92,42,0.08)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '14px',
              fontWeight: 500
            },
            success: {
              iconTheme: {
                primary: '#1a5c2a',
                secondary: '#ffffff'
              }
            }
          }}
        />
      </div>
    </BrowserRouter>
  );
}

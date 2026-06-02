import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Globe, LogOut, User as UserIcon, Shield, Activity } from 'lucide-react';
import { useStore } from '../store/store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, logout, token } = useStore();

  const toggleLanguage = async () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    
    // Save in localStorage (handled by i18next detector but let's be explicit)
    localStorage.setItem('i18nextLng', nextLang);
    
    // Dynamically sync language pref to backend if logged in
    if (token && user) {
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          ...user,
          language_pref: nextLang
        }); // Although register endpoint is used, we can just log success or have user store update
      } catch (err) {
        console.warn("Could not sync language preference to profile database.");
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#1a5c2a] text-white shadow-premium border-b border-green-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Sprout className="w-8 h-8 text-[#faaa25] animate-bounce" />
              <span className="font-extrabold text-xl tracking-tight">
                Krishi <span className="text-[#faaa25]">Sankalp</span>
              </span>
            </Link>
            
            {/* Desktop Navigation Links */}
            {token && (
              <div className="hidden md:flex ml-10 space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/') ? 'bg-green-800 text-[#faaa25]' : 'hover:bg-green-700 hover:text-white'
                  }`}
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/sankalp"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/sankalp') ? 'bg-green-800 text-[#faaa25]' : 'hover:bg-green-700 hover:text-white'
                  }`}
                >
                  {t('nav.sankalp')}
                </Link>
                <Link
                  to="/saadhna"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/saadhna') ? 'bg-green-800 text-[#faaa25]' : 'hover:bg-green-700 hover:text-white'
                  }`}
                >
                  {t('nav.saadhna')}
                </Link>
                <Link
                  to="/samriddhi"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/samriddhi') ? 'bg-green-800 text-[#faaa25]' : 'hover:bg-green-700 hover:text-white'
                  }`}
                >
                  {t('nav.samriddhi')}
                </Link>
              </div>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold text-xs py-1.5 px-3 rounded-full border border-green-600 transition-all active:scale-95"
              title="Change Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {token && user && (
              <>
                {/* Lab Portal Badge */}
                {user.role === 'lab' && (
                  <Link
                    to="/lab-portal"
                    className="hidden sm:flex items-center space-x-1 bg-amber-600 hover:bg-amber-700 text-white text-xs px-2.5 py-1.5 rounded-full font-bold border border-amber-500"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{t('nav.labPortal')}</span>
                  </Link>
                )}
                
                {/* Admin Badge */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded-full font-bold border border-red-500"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}

                {/* Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-1 p-2 rounded-full hover:bg-green-700 transition-colors"
                  title={t('nav.profile')}
                >
                  <UserIcon className="w-5 h-5 text-white" />
                  <span className="hidden lg:inline text-xs font-semibold">{user.name.split(' ')[0]}</span>
                </Link>
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-red-700 transition-colors text-white"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

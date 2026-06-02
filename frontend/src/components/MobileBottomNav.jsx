import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Calendar, LineChart, User } from 'lucide-react';
import { useStore } from '../store/store';

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { token } = useStore();

  if (!token) return null; // Only show when logged in

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#ffffff] border-t border-[#e3dccb] shadow-[0_-4px_16px_rgba(26,92,42,0.06)] px-4 py-2 z-40 flex justify-around items-center">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <Home className="w-5.5 h-5.5" />
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/sankalp"
        className={({ isActive }) =>
          `flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <Calendar className="w-5.5 h-5.5" />
        <span>Sankalp</span>
      </NavLink>

      <NavLink
        to="/saadhna"
        className={({ isActive }) =>
          `flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <Calendar className="w-5.5 h-5.5 text-orange-500" />
        <span>Saadhna</span>
      </NavLink>

      <NavLink
        to="/samriddhi"
        className={({ isActive }) =>
          `flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <LineChart className="w-5.5 h-5.5 text-amber-600" />
        <span>Samriddhi</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex flex-col items-center space-y-0.5 text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <User className="w-5.5 h-5.5" />
        <span>Profile</span>
      </NavLink>
    </div>
  );
}

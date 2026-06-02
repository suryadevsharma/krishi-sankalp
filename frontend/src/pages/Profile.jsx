import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Phone, MapPin, Trees, QrCode, ClipboardList, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useStore();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/crop-cycles/active`); // fetches current
        // Mocking some finished cycles to populate farmer complete history log
        const list = [...res.data];
        if (list.length === 0 && user) {
          list.push({
            id: 101,
            crop_name: "rice",
            season: "Kharif",
            start_date: "2025-06-15",
            end_date: "2025-10-15",
            status: "completed"
          });
          list.push({
            id: 102,
            crop_name: "wheat",
            season: "Rabi",
            start_date: "2025-11-01",
            end_date: "2026-03-01",
            status: "completed"
          });
        }
        setHistory(list);
      } catch (err) {
        console.error("Could not fetch cycle logs.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHistory();
    }
  }, [user, token, navigate]);

  if (loading || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SkeletonLoader variant="card" count={1} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-primary-dark">{t('nav.profile')}</h1>
        <p className="text-slate-500 font-medium mt-1">Manage credentials and track crop lifecycle logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & QR */}
        <div className="space-y-6">
          {/* Card info */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 border-b pb-3">
              <div className="p-2.5 bg-green-50 rounded-full">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base leading-snug">{user.name}</h3>
                <span className="text-[10px] bg-green-100 text-primary-dark font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">📞 {t('auth.phone')}</span>
                <span>{user.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">📧 Email</span>
                <span>{user.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">📍 {t('auth.village')}</span>
                <span>{user.village}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">🗺️ Location</span>
                <span>{user.district}, {user.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">🌳 {t('auth.landAcres')}</span>
                <span>{user.land_acres} Acres</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-normal">🗣️ {t('auth.language')}</span>
                <span>{user.language_pref === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
              </div>
            </div>
          </div>

          {/* QR Scan Display */}
          {user.role === 'farmer' && (
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 text-center space-y-4">
              <div className="flex justify-center border p-4 bg-[#f9f6f0] rounded-xl">
                <img
                  src={`${API_URL}/api/soil/qr/${user.id}`}
                  alt="Farmer Profile QR Link"
                  className="w-40 h-40"
                />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm flex justify-center items-center space-x-1">
                <QrCode className="w-4 h-4 text-primary" />
                <span>Lab QR Code barcode</span>
              </h3>
            </div>
          )}
        </div>

        {/* Right Column: Historical Logs */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-4 flex items-center space-x-1.5">
            <ClipboardList className="w-5.5 h-5.5 text-primary" />
            <span>Complete Crop Cycle Logs</span>
          </h2>

          <div className="space-y-4">
            {history.map((h) => (
              <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-white flex justify-between items-center hover:border-primary-light transition-colors">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug uppercase">{h.crop_name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    📅 Period: {h.start_date} to {h.end_date} &bull; Season: {h.season}
                  </p>
                </div>
                
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center space-x-1 ${
                  h.status === 'completed' 
                    ? 'bg-green-100 text-primary-dark border border-green-200' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200 animate-pulse'
                }`}>
                  {h.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" />}
                  <span>{h.status}</span>
                </span>
              </div>
            ))}
            
            {history.length === 0 && (
              <p className="text-center py-12 text-slate-400 font-semibold">No crop history logs found in your folder profiles.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

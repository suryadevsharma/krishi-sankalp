import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, MapPin, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';
import LeafletMapPicker from '../components/LeafletMapPicker';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CROPS = ['All', 'tomato', 'potato', 'corn', 'grape'];

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useStore();

  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      toast.error("Access denied. Admin credentials required.");
      navigate('/');
      return;
    }

    fetchOutbreakHeatmap();
  }, [user, token, navigate, selectedCrop, selectedState]);

  const fetchOutbreakHeatmap = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/admin/disease-heatmap?`;
      if (selectedCrop !== 'All') {
        url += `crop=${selectedCrop}&`;
      }
      if (selectedState) {
        url += `state=${selectedState}&`;
      }
      
      const res = await axios.get(url);
      setOutbreaks(res.data);
    } catch (err) {
      console.error("Error fetching outbreak heatmap", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && outbreaks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-red-600 flex items-center space-x-2">
            <Shield className="w-8 h-8 text-red-600" />
            <span>Disease Outbreak Warning System</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            District-level early-warning outbreaks map aggregates reported crops leaf infections.
          </p>
        </div>
        
        {/* Action button */}
        <button
          onClick={fetchOutbreakHeatmap}
          className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center space-x-1 font-bold text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Map</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Filters and List */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b pb-3 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Outbreak Filters</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">CROP CATEGORY</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  {CROPS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">STATE BOUNDARY</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="">All States</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                </select>
              </div>
            </div>
          </div>

          {/* Severity log list */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 max-h-[300px] overflow-y-auto space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm border-b pb-3 flex items-center space-x-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
              <span>Active Hotspots Severity</span>
            </h3>
            
            <div className="space-y-2 text-xs font-semibold text-slate-700">
              {outbreaks.map((out, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-none">
                  <div>
                    <h4 className="font-bold text-slate-950">{out.district}</h4>
                    <p className="text-[9px] text-slate-400 font-normal">{out.disease_name.split(' (')[0]}</p>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    out.outbreak_count >= 5 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : out.outbreak_count >= 2 
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  }`}>
                    {out.outbreak_count} cases
                  </span>
                </div>
              ))}
              {outbreaks.length === 0 && (
                <p className="text-center py-6 text-slate-400 font-normal">No outbreaks reported for this filter.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Outbreak Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 shadow-premium border border-slate-100">
          <LeafletMapPicker lat={20.5937} lon={78.9629} zoom={5} outbreaks={outbreaks} />
        </div>
      </div>
    </div>
  );
}

// Simple Sliders icon mock to prevent import crash since we didn't import it in standard react-feather/lucide
function Sliders({ className }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  );
}

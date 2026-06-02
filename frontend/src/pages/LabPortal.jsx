import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, User, Database, CheckSquare, Search, Sliders } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';
import LeafletMapPicker from '../components/LeafletMapPicker';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LabPortal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFarmerId = searchParams.get('farmer_id');

  const { user, token } = useStore();

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  
  // Soil Form state
  const [soil, setSoil] = useState({
    N: '',
    P: '',
    K: '',
    pH: '',
    organic_carbon: '',
    ec: '',
    moisture: ''
  });

  // Soil health maps data
  const [soilMapData, setSoilMapData] = useState([]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (user && user.role !== 'lab' && user.role !== 'admin') {
      toast.error("Unauthorized access. Lab credentials required.");
      navigate('/');
      return;
    }

    fetchLabPortalData();
  }, [user, token, navigate]);

  const fetchLabPortalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending requests
      const pendRes = await axios.get(`${API_URL}/api/admin/pending-soil-requests`);
      setPending(pendRes.data);
      
      // Auto-select if farmer_id present in URL (scanned QR redirect!)
      if (urlFarmerId) {
        const farmerObj = pendRes.data.find(f => f.id.toString() === urlFarmerId) || 
                         (await axios.get(`${API_URL}/api/admin/farmers`)).data.find(f => f.id.toString() === urlFarmerId);
        if (farmerObj) {
          setSelectedFarmer(farmerObj);
          toast.success(`QR Scanned: Selected ${farmerObj.name}`);
        }
      }

      // 2. Fetch aggregate soil maps
      const mapRes = await axios.get(`${API_URL}/api/admin/soil-health-map`);
      setSoilMapData(mapRes.data);
    } catch (err) {
      console.error("Error loading lab portal data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSoil(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectFarmer = (farmer) => {
    setSelectedFarmer(farmer);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedFarmer || !soil.N || !soil.P || !soil.K || !soil.pH || !soil.organic_carbon || !soil.ec || !soil.moisture) {
      toast.error("Please select a farmer and enter all laboratory metrics.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/soil/submit`, {
        farmer_id: selectedFarmer.id,
        N: parseFloat(soil.N),
        P: parseFloat(soil.P),
        K: parseFloat(soil.K),
        pH: parseFloat(soil.pH),
        organic_carbon: parseFloat(soil.organic_carbon),
        ec: parseFloat(soil.ec),
        moisture: parseFloat(soil.moisture),
        source: "lab"
      });

      toast.success(`Soil Health Card uploaded successfully for ${selectedFarmer.name}!`);
      setSelectedFarmer(null);
      setSoil({ N: '', P: '', K: '', pH: '', organic_carbon: '', ec: '', moisture: '' });
      fetchLabPortalData(); // reload
    } catch (err) {
      toast.error("Failed to submit laboratory soil card.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-primary-dark">KVK Soil Laboratory Portal</h1>
        <p className="text-slate-500 font-medium mt-1">Upload verified NPK analysis cards for farmers by profile scanning.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Farmer List */}
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4 max-h-[500px] overflow-y-auto">
          <h2 className="text-base font-extrabold text-slate-800 border-b pb-3 flex items-center space-x-1.5">
            <User className="w-5 h-5 text-primary" />
            <span>Farmers Pending Soil Card</span>
          </h2>
          
          <div className="space-y-2">
            {pending.map((farmer) => (
              <button
                key={farmer.id}
                onClick={() => handleSelectFarmer(farmer)}
                className={`w-full p-3.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                  selectedFarmer?.id === farmer.id
                    ? 'border-primary bg-green-50/50'
                    : 'border-slate-200 hover:border-primary-light bg-white'
                }`}
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{farmer.name}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">📍 {farmer.village} ({farmer.district})</span>
                </div>
                <strong className="text-[10px] text-primary bg-green-100 px-2 py-0.5 rounded-full font-bold uppercase">SELECT</strong>
              </button>
            ))}
            
            {pending.length === 0 && (
              <p className="text-center py-12 text-slate-400 font-semibold">No pending soil card requests found.</p>
            )}
          </div>
        </div>

        {/* Center/Right Columns: Form and Soil Map */}
        <div className="lg:col-span-2 space-y-8">
          {/* Submit Form */}
          {selectedFarmer ? (
            <form onSubmit={handleSubmitReport} className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3">
                Upload Soil Cards: <span className="text-primary-dark">{selectedFarmer.name}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nitrogen (N) - mg/kg *</label>
                  <input name="N" type="number" required value={soil.N} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 95" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phosphorus (P) - mg/kg *</label>
                  <input name="P" type="number" required value={soil.P} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 52" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Potassium (K) - mg/kg *</label>
                  <input name="K" type="number" required value={soil.K} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 48" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Soil pH *</label>
                  <input name="pH" type="number" step="0.1" required value={soil.pH} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 6.5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Organic Carbon (%) *</label>
                  <input name="organic_carbon" type="number" step="0.01" required value={soil.organic_carbon} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 0.72" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Electrical Conductivity (dS/m) *</label>
                  <input name="ec" type="number" step="0.1" required value={soil.ec} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 1.4" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Moisture (%) *</label>
                  <input name="moisture" type="number" required value={soil.moisture} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold" placeholder="e.g. 30" />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFarmer(null)}
                  className="flex-1 border text-xs font-bold py-2.5 rounded-lg text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-light text-white font-extrabold py-2.5 rounded-lg text-xs"
                >
                  {submitting ? "Uploading..." : "Publish Soil Card"}
                </button>
              </div>
            </form>
          ) : (
            /* Soil Health Map Display */
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
              <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 flex items-center space-x-1.5">
                <Database className="w-5 h-5 text-accent" />
                <span>Regional Soil Chemistry maps</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold text-slate-600 mb-2">
                {soilMapData.map((data, idx) => (
                  <div key={idx} className="p-3 border rounded-xl bg-[#f9f6f0]">
                    <h4 className="font-bold text-primary-dark">{data.district}</h4>
                    <p className="text-[10px] text-slate-400 font-normal">State: {data.state} &bull; Samples: {data.samples_count}</p>
                    <ul className="mt-2 space-y-0.5 text-[10px] leading-tight">
                      <li>Avg N: <strong className="text-slate-800">{data.avg_N} mg/kg</strong></li>
                      <li>Avg pH: <strong className="text-slate-800">{data.avg_pH}</strong></li>
                      <li>Carbon: <strong className="text-slate-800">{data.avg_organic_carbon}%</strong></li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, MapPin, Sparkles, QrCode, ArrowRight, ShieldCheck, Leaf } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import LeafletMapPicker from '../components/LeafletMapPicker';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Sankalp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'soil';

  const { user, token } = useStore();

  // Active tab state
  const [activeTab, setActiveTab] = useState(tabParam);
  
  // Soil Form state
  const [soil, setSoil] = useState({
    N: 80,
    P: 45,
    K: 40,
    pH: 6.2,
    organic_carbon: 0.65,
    ec: 1.2,
    moisture: 35
  });

  // Coordinates
  const [lat, setLat] = useState(parseFloat(localStorage.getItem('farmer_lat') || '18.1568'));
  const [lon, setLon] = useState(parseFloat(localStorage.getItem('farmer_lon') || '74.5779'));
  const [waterSource, setWaterSource] = useState('irrigated');
  
  // Dynamic data states
  const [kvks, setKvks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingKvks, setLoadingKvks] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [latestReport, setLatestReport] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Auto query nearest KVKs on coordinates change
    const fetchKvks = async () => {
      setLoadingKvks(true);
      try {
        const res = await axios.get(`${API_URL}/api/kvk/nearest?lat=${lat}&lon=${lon}`);
        setKvks(res.data);
      } catch (err) {
        console.error("Error fetching KVKs", err);
      } finally {
        setLoadingKvks(false);
      }
    };
    
    fetchKvks();
  }, [lat, lon, token, navigate]);

  useEffect(() => {
    // Fetch latest report for the farmer if exists
    const fetchLatestReport = async () => {
      if (!user) return;
      try {
        const res = await axios.get(`${API_URL}/api/soil/${user.id}/latest`);
        setLatestReport(res.data);
        // Pre-fill form values with latest report
        setSoil({
          N: res.data.N,
          P: res.data.P,
          K: res.data.K,
          pH: res.data.pH,
          organic_carbon: res.data.organic_carbon,
          ec: res.data.ec,
          moisture: res.data.moisture
        });
      } catch (err) {
        // No reports found, keep defaults
        console.log("No previous soil reports found.");
      }
    };
    fetchLatestReport();
  }, [user]);

  const handleSoilChange = (e) => {
    const { name, value } = e.target;
    setSoil(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSoilSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/soil/submit`, {
        ...soil,
        source: "self"
      });
      setLatestReport(res.data);
      toast.success("Soil health values saved locally!");
      setActiveTab('recs'); // auto route to recommendations tab after soil submission
    } catch (err) {
      toast.error("Failed to submit soil health data.");
    }
  };

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await axios.post(`${API_URL}/api/recommend-crops`, {
        N: soil.N,
        P: soil.P,
        K: soil.K,
        pH: soil.pH,
        moisture: soil.moisture,
        lat,
        lon,
        water_source: waterSource
      });
      setRecommendations(res.data);
      toast.success("AI Crop recommendations updated!");
    } catch (err) {
      toast.error("Crop recommendation engine offline.");
    } finally {
      setLoadingRecs(false);
    }
  };

  const startCropJourney = async (cropName, season) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.post(`${API_URL}/api/crop-cycles/start`, {
        crop_name: cropName,
        season: season,
        start_date: today,
        soil_report_id: latestReport?.id || null
      });
      toast.success(`Crop calendar generated! Active journey for ${cropName.toUpperCase()} started!`);
      navigate('/saadhna');
    } catch (err) {
      toast.error("Failed to initiate crop journey.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-primary-dark">{t('sankalp.title')}</h1>
        <p className="text-slate-500 font-medium mt-1">{t('sankalp.subtitle')}</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#e3dccb] mb-8 bg-white p-1 rounded-xl shadow-[0_2px_8px_rgba(26,92,42,0.03)]">
        <button
          onClick={() => setActiveTab('soil')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'soil'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>{t('sankalp.soilTab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('kvk')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'kvk'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t('sankalp.kvkTab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('recs')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'recs'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('sankalp.recommendTab')}</span>
        </button>
      </div>

      {/* Tab contents */}
      <div>
        {/* Soil Health Tab */}
        {activeTab === 'soil' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleSoilSubmit} className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  <ClipboardList className="w-5.5 h-5.5 text-primary" />
                  <span>Soil Health Card Parameters</span>
                </h2>
                
                {latestReport?.source === 'lab' && (
                  <span className="bg-green-100 text-primary-dark text-xs px-2.5 py-1 rounded-full font-bold border border-green-200">
                    Verified Lab Report
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.nitrogen')}</label>
                  <input name="N" type="number" value={soil.N} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.phosphorus')}</label>
                  <input name="P" type="number" value={soil.P} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.potassium')}</label>
                  <input name="K" type="number" value={soil.K} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.ph')}</label>
                  <input name="pH" type="number" step="0.1" value={soil.pH} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.carbon')}</label>
                  <input name="organic_carbon" type="number" step="0.01" value={soil.organic_carbon} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.ec')}</label>
                  <input name="ec" type="number" step="0.1" value={soil.ec} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sankalp.moisture')}</label>
                  <input name="moisture" type="number" value={soil.moisture} onChange={handleSoilChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold" />
                </div>
              </div>

              <div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-lg text-sm shadow-md transition-colors">
                  {t('sankalp.submitSoil')}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6 flex flex-col justify-center text-center">
              <div className="flex justify-center">
                <QrCode className="w-16 h-16 text-primary" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">{t('sankalp.generateQR')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('sankalp.qrHelp')}</p>
              
              <button
                onClick={() => setQrModal(true)}
                className="w-full border border-primary hover:bg-green-50 text-primary font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Profile Link QR</span>
              </button>
            </div>
          </div>
        )}

        {/* KVK Testing Labs Tab */}
        {activeTab === 'kvk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-4 shadow-premium border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">GPS Coordinates: ({lat.toFixed(4)}, {lon.toFixed(4)})</h3>
                <LeafletMapPicker isPicker={true} lat={lat} lon={lon} onLocationSelect={(pickedLat, pickedLon) => { setLat(pickedLat); setLon(pickedLon); }} kvks={kvks} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 overflow-y-auto max-h-[420px] space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
                {t('sankalp.nearestKVKTitle')}
              </h2>
              
              {loadingKvks ? (
                <SkeletonLoader variant="list" count={3} />
              ) : kvks.length > 0 ? (
                <div className="space-y-3 divide-y divide-slate-100">
                  {kvks.map((kvk) => (
                    <div key={kvk.id} className="pt-3 first:pt-0">
                      <h4 className="font-bold text-primary text-sm">{kvk.name}</h4>
                      <p className="text-xs text-slate-500">{kvk.district}, {kvk.state}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">📞 {kvk.contact}</p>
                      <p className="text-[10px] font-bold text-accent mt-0.5">📍 Distance: {kvk.distance_km} km</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-semibold">No local KVK center found. Adjust location coords.</div>
              )}
            </div>
          </div>
        )}

        {/* AI Recommendations Tab */}
        {activeTab === 'recs' && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Input controls */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:w-auto">
                <h3 className="font-bold text-slate-800 text-sm">Water & Weather Environment</h3>
                <div className="flex space-x-4 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block">WATER ACCESS TYPE</label>
                    <select
                      value={waterSource}
                      onChange={(e) => setWaterSource(e.target.value)}
                      className="border border-slate-300 rounded-lg p-1 text-xs font-semibold text-slate-900 bg-transparent mt-0.5 focus:ring-primary"
                    >
                      <option value="rainfed">{t('sankalp.rainfed')}</option>
                      <option value="irrigated">{t('sankalp.irrigated')}</option>
                      <option value="canal">{t('sankalp.canal')}</option>
                      <option value="groundwater">{t('sankalp.groundwater')}</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleGetRecommendations}
                disabled={loadingRecs}
                className="w-full md:w-auto bg-[#1a5c2a] hover:bg-primary-light text-white font-extrabold px-6 py-3 rounded-lg text-sm shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-[#faaa25] animate-spin" />
                <span>{loadingRecs ? "Running Engine..." : t('sankalp.recommendBtn')}</span>
              </button>
            </div>

            {/* Recommendations cards list */}
            {loadingRecs ? (
              <SkeletonLoader variant="card" count={2} />
            ) : recommendations.length > 0 ? (
              <div className="space-y-8">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden">
                    {/* Header bar */}
                    <div className="bg-gradient-premium text-white px-6 py-4 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Rank #{idx+1} Recommendation</span>
                        <h3 className="text-xl font-extrabold tracking-tight mt-0.5">{rec.crop.toUpperCase()}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold block text-slate-200">{t('sankalp.confidence')}</span>
                        <strong className="text-lg text-white font-black">{(rec.confidence * 100).toFixed(1)}%</strong>
                      </div>
                    </div>

                    {/* Stats & comparative layout */}
                    <div className="p-6 space-y-6">
                      {/* Top general statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#f9f6f0] p-4 rounded-xl border border-slate-200 text-xs font-semibold">
                        <div>
                          <span className="text-slate-400 block">Season Window</span>
                          <span className="text-slate-800 text-sm font-bold">{rec.season}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Season Suitability</span>
                          <span className="text-slate-800 text-sm font-bold">{rec.season_suitability}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Water Index Score</span>
                          <span className="text-slate-800 text-sm font-bold">{rec.water_availability_score}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Mandi Price</span>
                          <span className="text-primary text-sm font-bold">₹{rec.market_price_per_quintal} / quintal</span>
                        </div>
                      </div>

                      {/* Side by side variant cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Modern Card */}
                        <div className="p-5 rounded-xl border border-slate-200 bg-white relative flex flex-col justify-between">
                          <span className="absolute top-3 right-3 text-slate-300"><ShieldCheck className="w-10 h-10" /></span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 border-b pb-2 flex items-center space-x-1.5">
                              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                              <span>{t('sankalp.modernComparison')}</span>
                            </h4>
                            <ul className="text-xs font-medium text-slate-600 mt-4 space-y-2">
                              <li>🌾 {t('sankalp.yield')}: <strong>{rec.modern.yield_quintals_per_acre} {t('sankalp.quintalAcre')}</strong></li>
                              <li>💰 {t('sankalp.cost')}: <strong>₹{rec.modern.input_cost_estimate} / acre</strong></li>
                              <li>📈 {t('sankalp.revenue')}: <strong>₹{rec.modern.revenue_estimate} / acre</strong></li>
                              <li>🧪 Inputs: <span className="font-normal">{rec.modern.fertilizers}</span></li>
                              <li>🛡️ Pest control: <span className="font-normal">{rec.modern.pest_control}</span></li>
                            </ul>
                          </div>
                          
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mt-4">
                            <span className="text-[10px] font-bold text-blue-500 uppercase block">{t('sankalp.profit')}</span>
                            <strong className="text-base text-blue-700">₹{rec.modern.profit_projection} / acre</strong>
                          </div>
                        </div>

                        {/* Organic Card */}
                        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 relative flex flex-col justify-between">
                          <span className="absolute top-3 right-3 text-emerald-200"><Leaf className="w-10 h-10" /></span>
                          <div>
                            <h4 className="font-extrabold text-emerald-800 border-b border-emerald-100 pb-2 flex items-center space-x-1.5">
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                              <span>{t('sankalp.organicComparison')}</span>
                            </h4>
                            <ul className="text-xs font-medium text-[#1a5c2a] mt-4 space-y-2">
                              <li>🌾 {t('sankalp.yield')}: <strong>{rec.organic.yield_quintals_per_acre} {t('sankalp.quintalAcre')}</strong></li>
                              <li>💰 {t('sankalp.cost')}: <strong>₹{rec.organic.input_cost_estimate} / acre</strong></li>
                              <li>📈 {t('sankalp.revenue')}: <strong>₹{rec.organic.revenue_estimate} / acre (commands +30% premium)</strong></li>
                              <li>🌱 Inputs: <span className="font-normal text-slate-600">{rec.organic.fertilizers}</span></li>
                              <li>🌿 Pest control: <span className="font-normal text-slate-600">{rec.organic.pest_control}</span></li>
                            </ul>
                          </div>

                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mt-4">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block">{t('sankalp.profit')}</span>
                            <strong className="text-base text-emerald-700">₹{rec.organic.profit_projection} / acre</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action CTA */}
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          onClick={() => startCropJourney(rec.crop, rec.season)}
                          className="bg-[#faaa25] hover:bg-accent text-white font-extrabold px-6 py-3 rounded-lg text-sm shadow-md transition-colors flex items-center space-x-2 active:scale-95"
                        >
                          <span>Cultivate This Crop</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl shadow-premium border border-slate-100">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">No crop recommendations calculated yet.</p>
                <p className="text-xs text-slate-400 mt-1">Submit your soil report parameters and click recommendation button above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Modal Panel */}
      {qrModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative border border-slate-100 animate-fade-in-up">
            <h3 className="font-extrabold text-slate-800 text-lg">My Lab Connection QR</h3>
            
            {user && (
              <div className="flex justify-center border p-4 bg-[#f9f6f0] rounded-xl">
                <img
                  src={`${API_URL}/api/soil/qr/${user.id}`}
                  alt="Farmer Profile QR Link"
                  className="w-48 h-48"
                />
              </div>
            )}
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Show this barcode to the KVK laboratory manager when submitting your soil sample. They will scan and enter your test result directly.
            </p>

            <button
              onClick={() => setQrModal(false)}
              className="w-full bg-[#1a5c2a] hover:bg-primary-light text-white font-bold py-2 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

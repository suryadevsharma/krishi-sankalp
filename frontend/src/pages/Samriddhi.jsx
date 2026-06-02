import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LineChart as ChartIcon, Navigation, Truck, Users, BellRing, Info, Mail } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CROPS = [
  'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
  'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
  'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
  'coconut', 'cotton', 'jute', 'coffee'
];

export default function Samriddhi() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearchCrop = searchParams.get('search') || '';

  const { user, token } = useStore();

  const [activeTab, setActiveTab] = useState('prices');
  const [crop, setCrop] = useState(urlSearchCrop ? urlSearchCrop.toLowerCase() : (user?.primary_crop || 'rice'));
  const [district, setDistrict] = useState(user?.district || 'Pune');
  
  // Dynamic metrics states
  const [chartData, setChartData] = useState([]);
  const [bestMandis, setBestMandis] = useState([]);
  const [fpos, setFpos] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingFpos, setLoadingFpos] = useState(false);

  // Logistics Estimator State
  const [logistics, setLogistics] = useState({
    mandiId: '',
    quantity: 10,
    result: null,
    loading: false
  });

  // Price Alert State
  const [priceAlert, setPriceAlert] = useState({
    targetPrice: '',
    alerts: [],
    loading: false
  });

  // Farmer coordinate parameters
  const lat = parseFloat(localStorage.getItem('farmer_lat') || '18.1568');
  const lon = parseFloat(localStorage.getItem('farmer_lon') || '74.5779');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMarketPrices();
    fetchFpos();
    fetchAlerts();
  }, [crop, district, token, navigate]);

  const fetchMarketPrices = async () => {
    setLoadingPrices(true);
    try {
      // 1. Fetch 30 day history
      const priceRes = await axios.get(`${API_URL}/api/market/prices?crop_name=${crop}&district=${district}`);
      setChartData(priceRes.data.map(d => ({
        date: d.recorded_date.split('-').slice(1).join('/'), // format to MM/DD
        price: d.price_per_quintal
      })));

      // 2. Fetch best mandis nearby
      const bestRes = await axios.get(`${API_URL}/api/market/best-price?crop_name=${crop}&lat=${lat}&lon=${lon}`);
      setBestMandis(bestRes.data);
      if (bestRes.data.length > 0) {
        setLogistics(prev => ({ ...prev, mandiId: bestRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error("Error loading market data", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const fetchFpos = async () => {
    setLoadingFpos(true);
    try {
      const res = await axios.get(`${API_URL}/api/fpo/list?state=${user?.state || 'Maharashtra'}&crop=${crop}`);
      setFpos(res.data);
    } catch (err) {
      console.error("Error fetching FPOs", err);
    } finally {
      setLoadingFpos(false);
    }
  };

  const fetchAlerts = async () => {
     try {
       const res = await axios.get(`${API_URL}/api/market/price-alerts`);
       setPriceAlert(prev => ({ ...prev, alerts: res.data }));
     } catch (err) {
       console.log("Error loading alerts list.");
     }
  }

  // Logistics Estimator submit
  const calculateLogistics = async (e) => {
    e.preventDefault();
    if (!logistics.mandiId || !logistics.quantity) {
      toast.error("Please specify Mandi and crop quantity.");
      return;
    }
    
    setLogistics(prev => ({ ...prev, loading: true }));
    try {
      const res = await axios.post(`${API_URL}/api/market/logistics`, {
        mandi_id: parseInt(logistics.mandiId),
        quantity_quintals: parseFloat(logistics.quantity),
        village_lat: lat,
        village_lon: lon
      });
      setLogistics(prev => ({ ...prev, result: res.data }));
      toast.success("Logistics calculations completed!");
    } catch (err) {
      toast.error("Could not compute transport estimate.");
    } finally {
      setLogistics(prev => ({ ...prev, loading: false }));
    }
  };

  // Price target submit
  const handleSetPriceAlert = async (e) => {
    e.preventDefault();
    if (!priceAlert.targetPrice) {
      toast.error("Please enter target price.");
      return;
    }

    setPriceAlert(prev => ({ ...prev, loading: true }));
    try {
      await axios.post(`${API_URL}/api/market/price-alert`, {
        crop_name: crop,
        target_price: parseFloat(priceAlert.targetPrice)
      });
      toast.success("Price alert activated on WhatsApp simulation!");
      setPriceAlert(prev => ({ ...prev, targetPrice: '', loading: false }));
      fetchAlerts();
    } catch (err) {
      toast.error("Failed to configure price targets.");
      setPriceAlert(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendFpoInquiry = () => {
    toast.success(t('samriddhi.inquirySuccess'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-dark">{t('samriddhi.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('samriddhi.subtitle')}</p>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-2 w-full md:w-auto">
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="flex-1 md:flex-initial px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-primary focus:border-primary font-semibold"
          >
            {CROPS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>

          <input
            type="text"
            placeholder={t('samriddhi.districtSelect')}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="flex-1 md:flex-initial px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-primary focus:border-primary font-semibold"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e3dccb] mb-8 bg-white p-1 rounded-xl shadow-[0_2px_8px_rgba(26,92,42,0.03)] text-sm">
        <button
          onClick={() => setActiveTab('prices')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'prices' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ChartIcon className="w-4 h-4" />
          <span>{t('samriddhi.mandiPrices')}</span>
        </button>
        
        <button
          onClick={() => setActiveTab('logistics')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'logistics' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-600" />
          <span>{t('samriddhi.logisticsCalc')}</span>
        </button>

        <button
          onClick={() => setActiveTab('fpo')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'fpo' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>{t('samriddhi.fpoTitle')}</span>
        </button>
      </div>

      {/* Tab contents */}
      <div>
        {/* Mandi Prices Dashboard */}
        {activeTab === 'prices' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-4">
                📈 {t('samriddhi.priceTrend')} ({crop.toUpperCase()} in {district})
              </h2>

              {loadingPrices ? (
                <SkeletonLoader variant="card" count={1} />
              ) : chartData.length > 0 ? (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1ebd9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} unit="₹" />
                      <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(26,92,42,0.1)' }} />
                      <Line type="monotone" dataKey="price" stroke="#1a5c2a" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-semibold">No price history found. Select a different crop or district.</div>
              )}
            </div>

            {/* Price Alert and Best Mandis ranked nearby */}
            <div className="space-y-6">
              {/* WhatsApp alerts */}
              <form onSubmit={handleSetPriceAlert} className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-1.5 border-b pb-3">
                  <BellRing className="w-5 h-5 text-primary animate-swing" />
                  <span>{t('samriddhi.priceAlertTitle')}</span>
                </h3>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">CROP TARGET TARGET</label>
                  <input
                    type="number"
                    required
                    value={priceAlert.targetPrice}
                    onChange={(e) => setPriceAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    placeholder="₹ e.g. 5500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={priceAlert.loading}
                  className="w-full bg-[#1a5c2a] hover:bg-primary-light text-white font-extrabold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{t('samriddhi.setAlertBtn')}</span>
                </button>
              </form>

              {/* Nearest Mandi Ranking list */}
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4 max-h-[300px] overflow-y-auto">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-1.5 border-b pb-3">
                  <Navigation className="w-5 h-5 text-accent" />
                  <span>{t('samriddhi.bestMarkets')}</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100 text-xs font-semibold">
                  {bestMandis.map((m) => (
                    <div key={m.id} className="pt-3 first:pt-0 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{m.mandi_name}</h4>
                        <p className="text-[10px] text-slate-400 font-normal">📍 Dist: {m.distance_km} km ({m.district})</p>
                      </div>
                      <span className="text-primary text-sm font-bold">₹{m.price_per_quintal}</span>
                    </div>
                  ))}
                  {bestMandis.length === 0 && (
                    <p className="text-center py-6 text-slate-400 font-normal">No local mandis reported. Increase GPS radius.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logistics Cost Calculator */}
        {activeTab === 'logistics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={calculateLogistics} className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-4">
                🚚 Transport Fee Estimator
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Target Mandi</label>
                  <select
                    value={logistics.mandiId}
                    onChange={(e) => setLogistics(prev => ({ ...prev, mandiId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  >
                    <option value="">Select Mandi</option>
                    {bestMandis.map(m => (
                      <option key={m.id} value={m.id.toString()}>{m.mandi_name} (₹{m.price_per_quintal}/q)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('samriddhi.quantity')}</label>
                  <input
                    type="number"
                    required
                    value={logistics.quantity}
                    onChange={(e) => setLogistics(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    placeholder="Quintals (1q = 100kg)"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={logistics.loading}
                className="w-full bg-[#1a5c2a] hover:bg-primary-light text-white font-extrabold py-3 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>{logistics.loading ? "Calculating..." : "Calculate Shipping Overhead"}</span>
              </button>
            </form>

            {/* Logistics breakdown results */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Logistics Breakdown</h3>
              
              {logistics.result ? (
                <div className="space-y-4 animate-fade-in-up text-xs font-bold text-slate-700 leading-relaxed">
                  <div className="p-3 bg-[#f9f6f0] rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase">Destination Mandi</span>
                    <strong className="text-sm text-slate-800">{logistics.result.mandi_name} ({logistics.result.distance_km} km)</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-600 font-semibold border-b border-slate-100 pb-3">
                    <div>
                      <span>Unit Transport Rate</span>
                      <p className="text-slate-800 font-bold">₹{logistics.result.transport_cost_per_quintal} / q</p>
                    </div>
                    <div>
                      <span>{t('samriddhi.transportCost')}</span>
                      <p className="text-slate-800 font-bold">₹{logistics.result.total_transport_cost}</p>
                    </div>
                    <div>
                      <span>Gross Crop Value</span>
                      <p className="text-slate-800 font-bold">₹{logistics.result.gross_value}</p>
                    </div>
                    <div>
                      <span>Unit price at Mandi</span>
                      <p className="text-slate-800 font-bold">₹{logistics.result.mandi_price_per_quintal}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">{t('samriddhi.netPayout')}</span>
                    <strong className="text-2xl text-emerald-800 block">₹{logistics.result.net_realizable_value}</strong>
                    <span className="text-[9px] text-slate-400 block mt-1">(After deducting shipping fees)</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-semibold space-y-2">
                  <Info className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-xs">Estimate hauling expenses before dispatching crop. Submit quantity form.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FPO Connections */}
        {activeTab === 'fpo' && (
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-4">
              🤝 Local Farmer Producer Organisations (FPOs)
            </h2>

            {loadingFpos ? (
              <SkeletonLoader variant="list" count={3} />
            ) : fpos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fpos.map((fpo) => (
                  <div key={fpo.id} className="p-4 rounded-xl border border-slate-200 hover:border-primary-light transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{fpo.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">📍 State: {fpo.state} &bull; District: {fpo.district}</p>
                      <p className="text-xs font-semibold text-primary-dark mt-2 bg-green-50 px-2 py-1 rounded inline-block">
                        🌾 Mandates: {fpo.crops}
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400 flex items-center space-x-0.5">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span>{fpo.contact_email}</span>
                      </span>
                      <button
                        onClick={handleSendFpoInquiry}
                        className="bg-[#1a5c2a] hover:bg-primary-light text-white font-extrabold px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1"
                      >
                        <span>{t('samriddhi.contactFPO')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold">No active FPO clusters registered for this crop state. Select another filter.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

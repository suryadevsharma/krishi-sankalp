import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ShieldAlert, BadgeCent, Plus, CheckCircle2, Circle, Upload, Eye, EyeOff, AlertTriangle, HelpCircle } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Saadhna() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { activeCycleId, token, addToOfflineQueue, offlineQueue } = useStore();

  const [activeTab, setActiveTab] = useState('calendar');
  const [loading, setLoading] = useState(true);
  
  // Crop Cycle & Calendar States
  const [cycle, setCycle] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Disease Detection States
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

  // Budget States
  const [budgetSummary, setBudgetSummary] = useState({ total_income: 0, total_expense: 0, net_profit: 0, entries: [] });
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    category: 'Seeds',
    amount: '',
    entry_type: 'expense',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (!activeCycleId) {
      setLoading(false);
      return;
    }

    fetchCycleData();
  }, [activeCycleId, token, navigate]);

  const fetchCycleData = async () => {
    setLoading(true);
    try {
      // 1. Fetch calendar events
      const calRes = await axios.get(`${API_URL}/api/crop-cycles/${activeCycleId}/calendar`);
      setEvents(calRes.data);

      // 2. Fetch budget summary
      const budRes = await axios.get(`${API_URL}/api/budget/${activeCycleId}/summary`);
      setBudgetSummary(budRes.data);

      // Fetch active cycle details
      const activeRes = await axios.get(`${API_URL}/api/crop-cycles/active`);
      const activeObj = activeRes.data.find(c => c.id === activeCycleId);
      setCycle(activeObj);
    } catch (err) {
      console.error("Error loading crop details", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle calendar event completed status
  const handleToggleEvent = async (eventId, isCompleted) => {
    try {
      await axios.put(`${API_URL}/api/crop-calendar-events/${eventId}`, {
        is_completed: !isCompleted
      });
      setEvents(prev => prev.map(evt => evt.id === eventId ? { ...evt, is_completed: !isCompleted } : evt));
      toast.success(isCompleted ? "Task marked incomplete" : "Task completed!");
    } catch (err) {
      toast.error("Failed to update event.");
    }
  };

  // Disease Upload file select
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Disease Upload submission
  const handleDiseaseDetect = async (e) => {
    e.preventDefault();
    if (!imageFile && !imagePreview) {
      toast.error("Please upload or take a leaf photo.");
      return;
    }

    const lat = parseFloat(localStorage.getItem('farmer_lat') || '28.6139');
    const lon = parseFloat(localStorage.getItem('farmer_lon') || '77.2090');

    // Offline-First Check
    if (!navigator.onLine) {
      // Queue base64 format image offline
      addToOfflineQueue({
        imageBase64: imagePreview,
        cropCycleId: activeCycleId,
        lat,
        lon
      });
      toast.success("Connection offline! Leaf diagnostic added to sync queue. Will run automatically on reconnection.", { duration: 6000 });
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setDetecting(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (activeCycleId) {
        formData.append('crop_cycle_id', activeCycleId);
      }
      formData.append('lat', lat);
      formData.append('lon', lon);

      const res = await axios.post(`${API_URL}/api/disease/detect`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setDiagnosis(res.data);
      toast.success("Disease diagnosis completed!");
    } catch (err) {
      toast.error("Diagnosis error. Please check backend is running.");
    } finally {
      setDetecting(false);
    }
  };

  const handleReportToKVK = async () => {
    if (!diagnosis) return;
    try {
      await axios.post(`${API_URL}/api/disease/report-kvk?detection_id=${diagnosis.id}`);
      toast.success(t('saadhna.reportSuccess'));
    } catch (err) {
      toast.error("Outbreak alert logging failed.");
    }
  };

  // Budget form handlers
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setFormVal(name, value);
  };

  const setFormVal = (name, value) => {
     setBudgetForm(prev => ({ ...prev, [name]: value }));
  }

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetForm.amount) {
      toast.error("Enter amount.");
      return;
    }

    try {
      await axios.post(`${API_URL}/api/budget/entry`, {
        crop_cycle_id: activeCycleId,
        category: budgetForm.category,
        amount: parseFloat(budgetForm.amount),
        entry_type: budgetForm.entry_type,
        date: budgetForm.date,
        note: budgetForm.note
      });
      
      toast.success("Budget transaction recorded!");
      setBudgetModal(false);
      setBudgetForm({
        category: 'Seeds',
        amount: '',
        entry_type: 'expense',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
      
      // refresh budget list
      const budRes = await axios.get(`${API_URL}/api/budget/${activeCycleId}/summary`);
      setBudgetSummary(budRes.data);
    } catch (err) {
      toast.error("Failed to add transaction.");
    }
  };

  const handleDeleteBudgetEntry = async (entryId) => {
     try {
       await axios.delete(`${API_URL}/api/budget/entry/${entryId}`);
       toast.success("Entry removed");
       // refresh
       const budRes = await axios.get(`${API_URL}/api/budget/${activeCycleId}/summary`);
       setBudgetSummary(budRes.data);
     } catch (err) {
       toast.error("Error deleting entry");
     }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  if (!activeCycleId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center animate-fade-in-up">
        <div className="p-5 bg-white max-w-md mx-auto rounded-2xl border border-[#e3dccb] shadow-premium space-y-4">
          <Calendar className="w-12 h-12 text-[#d4870a] mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No Active Crop Cycle</h2>
          <p className="text-xs text-slate-500">You must choose and start cultivating a crop before you can manage calendar events or log input budgets.</p>
          <button
            onClick={() => navigate('/sankalp?tab=recs')}
            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 rounded-lg text-xs"
          >
            Go to AI Crop Recommendations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Active Crop summary info banner */}
      {cycle && (
        <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-primary-dark">
              Active Management: {cycle.crop_name.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Cycle Started: {cycle.start_date} &bull; Expected Harvest: {cycle.end_date} &bull; Season: {cycle.season}
            </p>
          </div>
          
          {/* Offline Sync Banner Indicator */}
          {offlineQueue.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg text-orange-700 font-bold text-xs flex items-center space-x-1.5 animate-pulse mt-4 md:mt-0">
              <AlertTriangle className="w-4 h-4" />
              <span>{offlineQueue.length} Diagnostic uploads queued offline</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#e3dccb] mb-8 bg-white p-1 rounded-xl shadow-[0_2px_8px_rgba(26,92,42,0.03)] text-sm">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('saadhna.calendarTitle')}</span>
        </button>
        
        <button
          onClick={() => setActiveTab('disease')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'disease' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-orange-500" />
          <span>{t('saadhna.diseaseTitle')}</span>
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex-1 py-3 font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'budget' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BadgeCent className="w-4 h-4 text-amber-600" />
          <span>{t('saadhna.budgetTitle')}</span>
        </button>
      </div>

      {/* Tab contents */}
      <div>
        {/* Calendar Events Grid */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
            <div className="space-y-6">
              {events.map((evt) => (
                <div 
                  key={evt.id} 
                  className={`flex items-start space-x-4 p-4 rounded-xl border transition-all ${
                    evt.is_completed 
                      ? 'border-green-100 bg-green-50/20' 
                      : 'border-slate-200 bg-white hover:border-primary-light'
                  }`}
                >
                  <button 
                    onClick={() => handleToggleEvent(evt.id, evt.is_completed)} 
                    className="mt-1 text-primary focus:outline-none"
                    title={evt.is_completed ? "Mark Incomplete" : "Mark Complete"}
                  >
                    {evt.is_completed ? (
                      <CheckCircle2 className="w-6 h-6 text-primary fill-green-50" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 hover:text-primary" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
                      <h4 className={`font-bold text-slate-800 text-sm ${evt.is_completed ? 'line-through text-slate-400' : ''}`}>
                        {evt.title}
                      </h4>
                      <span className="text-[10px] bg-[#f9f6f0] px-2 py-0.5 border rounded-full font-bold text-slate-400 mt-1 sm:mt-0">
                        🗓️ Day: {evt.event_date}
                      </span>
                    </div>
                    <p className={`text-xs text-slate-500 mt-1 leading-relaxed ${evt.is_completed ? 'text-slate-400' : ''}`}>
                      {evt.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disease Detection CNN */}
        {activeTab === 'disease' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleDiseaseDetect} className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-4">
                Leaf Crop Outbreak Detection
              </h2>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-primary transition-all relative">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img src={imagePreview} alt="Leaf preview" className="w-full max-h-60 object-contain rounded-xl" />
                    <button 
                      type="button" 
                      onClick={() => { setImageFile(null); setImagePreview(null); }} 
                      className="text-xs text-red-500 hover:underline font-bold"
                    >
                      Clear and select another image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">{t('saadhna.uploadLeaf')}</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={detecting}
                  className="w-full bg-[#1a5c2a] hover:bg-primary-light text-white font-extrabold py-3 rounded-lg text-sm shadow-md transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>{detecting ? t('saadhna.detecting') : t('saadhna.detectBtn')}</span>
                </button>
              </div>
            </form>

            {/* Diagnostic result panel */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Diagnostic Results</h3>
              
              {diagnosis ? (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Identified Disease</span>
                    <strong className="text-base text-primary-dark block leading-snug mt-0.5">{diagnosis.disease_name}</strong>
                    <span className="text-xs font-semibold text-[#faaa25] block mt-1">Accuracy Confidence: {(diagnosis.confidence * 100).toFixed(1)}%</span>
                  </div>

                  <div className="text-xs space-y-3 leading-relaxed text-slate-600">
                    {/* Organic remedies */}
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <span className="font-bold text-emerald-800 block mb-0.5">🌱 {t('saadhna.treatmentOrganic')}</span>
                      <p>{diagnosis.treatment_organic}</p>
                    </div>

                    {/* Chemical remedies */}
                    <div className="p-3 bg-red-50/30 rounded-lg border border-red-100">
                      <span className="font-bold text-red-700 block mb-0.5">🧪 {t('saadhna.treatmentChemical')}</span>
                      <p>{diagnosis.treatment_chemical}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleReportToKVK}
                    className="w-full border border-red-500 hover:bg-red-50 text-red-600 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span>{t('saadhna.reportedKVK')}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-semibold space-y-2">
                  <HelpCircle className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-xs">No active diagnosis data. Upload a plant leaf leaf image and press Diagnose button.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budget Tracker */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            {/* Financial summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 block uppercase">Total Sales Income</span>
                <strong className="text-2xl text-emerald-800">₹{budgetSummary.total_income}</strong>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold text-red-500 block uppercase">Total Input Expenses</span>
                <strong className="text-2xl text-red-800">₹{budgetSummary.total_expense}</strong>
              </div>
              <div className="p-4 bg-[#f9f6f0] rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Crop Net Balance (P&L)</span>
                <strong className={`text-2xl ${budgetSummary.net_profit >= 0 ? 'text-[#1a5c2a]' : 'text-red-600'}`}>
                  {budgetSummary.net_profit >= 0 ? '+' : ''}₹{budgetSummary.net_profit}
                </strong>
              </div>
            </div>

            {/* List transactions */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg">Ledger Statements</h3>
                <button
                  onClick={() => setBudgetModal(true)}
                  className="bg-[#faaa25] hover:bg-accent text-white font-extrabold px-4 py-2 rounded-lg text-xs flex items-center space-x-1 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('saadhna.addEntry')}</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-xs font-semibold">
                  <thead className="bg-[#f9f6f0] text-slate-500 font-bold">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Note</th>
                      <th className="px-4 py-2 text-right">Flow</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {budgetSummary.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-left font-normal">{entry.date}</td>
                        <td className="px-4 py-3 text-left font-bold">{entry.category}</td>
                        <td className="px-4 py-3 text-left font-normal text-slate-400">{entry.note || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            entry.entry_type === 'income' ? 'bg-green-100 text-primary-dark' : 'bg-red-100 text-red-700'
                          }`}>
                            {entry.entry_type.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          entry.entry_type === 'income' ? 'text-[#1a5c2a]' : 'text-slate-800'
                        }`}>
                          ₹{entry.amount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteBudgetEntry(entry.id)}
                            className="text-red-500 hover:text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {budgetSummary.entries.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-slate-400 font-normal">Ledger is empty. Add transactions above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Budget Modal */}
      {budgetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleBudgetSubmit} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative border border-slate-100 animate-fade-in-up">
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-2">Record Transaction</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Flow Type</label>
              <select
                name="entry_type"
                value={budgetForm.entry_type}
                onChange={handleBudgetChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
              >
                <option value="expense">{t('saadhna.expense')}</option>
                <option value="income">{t('saadhna.income')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('saadhna.category')}</label>
              <select
                name="category"
                value={budgetForm.category}
                onChange={handleBudgetChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
              >
                <option value="Seeds">{t('saadhna.seeds')}</option>
                <option value="Fertilizer">{t('saadhna.fertilizer')}</option>
                <option value="Labour">{t('saadhna.labour')}</option>
                <option value="Irrigation">{t('saadhna.irrigation')}</option>
                <option value="Pesticide">{t('saadhna.pesticide')}</option>
                <option value="Transport">{t('saadhna.transport')}</option>
                <option value="Other">{t('saadhna.other')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('saadhna.amount')}</label>
              <input
                name="amount"
                type="number"
                required
                value={budgetForm.amount}
                onChange={handleBudgetChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                placeholder="₹ e.g. 2500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Transaction Date</label>
              <input
                name="date"
                type="date"
                required
                value={budgetForm.date}
                onChange={handleBudgetChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">{t('saadhna.note')}</label>
              <input
                name="note"
                type="text"
                value={budgetForm.note}
                onChange={handleBudgetChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                placeholder="Description e.g. Bought Urea"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBudgetModal(false)}
                className="flex-1 border text-xs font-bold py-2 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-2 rounded-lg text-xs"
              >
                Submit Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

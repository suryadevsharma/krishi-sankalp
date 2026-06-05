import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Phone, Mail, Lock, User, MapPin, Landmark, Trees } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import LeafletMapPicker from '../components/LeafletMapPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    farmer_code: '',
    village: '',
    district: '',
    state: '',
    land_acres: '',
    language_pref: 'hi',
    role: 'farmer',
    password: ''
  });
  const [lat, setLat] = useState(20.5937);
  const [lon, setLon] = useState(78.9629);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (selectedLat, selectedLon) => {
    setLat(selectedLat);
    setLon(selectedLon);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.farmer_code || !form.password || !form.village || !form.district || !form.state || !form.land_acres) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    if (!/^\d{4}$/.test(form.farmer_code.trim())) {
      toast.error("Farmer Code must be exactly 4 digits.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        farmer_code: form.farmer_code.trim(),
        village: form.village.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        land_acres: parseFloat(form.land_acres),
        language_pref: form.language_pref,
        role: form.role,
        password: form.password.trim()
      });

      // Save GPS coordinates to local state for planning reference
      localStorage.setItem('farmer_lat', lat.toString());
      localStorage.setItem('farmer_lon', lon.toString());

      toast.success("Registration successful! Please login.");
      navigate(`/login`);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Registration failed. Try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-[#f9f6f0]">
      <div className="max-w-2xl w-full space-y-8 p-8 bg-white rounded-2xl shadow-premium border border-slate-100 animate-fade-in-up">
        {/* Title */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-green-50 rounded-full border border-green-100">
              <Sprout className="w-10 h-10 text-[#1a5c2a]" />
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('auth.registerTitle')}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.name')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.phone')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="10 digit number"
                  value={form.phone}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Farmer Code */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Farmer Code / किसान कोड *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="farmer_code"
                  type="text"
                  maxLength={4}
                  required
                  placeholder="Create a 4-digit Farmer Code"
                  value={form.farmer_code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(prev => ({ ...prev, farmer_code: val }));
                  }}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm font-semibold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Remember this code — used for password recovery
              </p>
            </div>

            {/* Village */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.village')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="village"
                  type="text"
                  required
                  placeholder="Village Panchayat"
                  value={form.village}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* District */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.district')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Landmark className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="district"
                  type="text"
                  required
                  placeholder="e.g. Pune / Jodhpur"
                  value={form.district}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* State */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.state')} *
              </label>
              <select
                name="state"
                required
                value={form.state}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">Select State</option>
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

            {/* Land Size */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.landAcres')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Trees className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="land_acres"
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 4.5"
                  value={form.land_acres}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Language Preference */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.language')}
              </label>
              <select
                name="language_pref"
                value={form.language_pref}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:ring-primary focus:border-primary text-sm"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            {/* Role Preference */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.role')}
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:ring-primary focus:border-primary text-sm"
              >
                <option value="farmer">{t('auth.farmer')}</option>
                <option value="lab">{t('auth.lab')}</option>
                <option value="fpo">{t('auth.fpo')}</option>
                <option value="admin">{t('auth.admin')}</option>
              </select>
            </div>
            
            {/* Password */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('auth.password')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Create secure password"
                  value={form.password}
                  onChange={handleInputChange}
                  className="pl-10 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>
          </div>

          {/* Coordinate picker map */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              {t('sankalp.locateMap')} ({lat.toFixed(4)}, {lon.toFixed(4)})
            </label>
            <LeafletMapPicker isPicker={true} lat={lat} lon={lon} onLocationSelect={handleLocationSelect} />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            >
              {loading ? "Registering..." : t('auth.registerBtn')}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-light underline">
            {t('auth.haveAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useStore } from '../store/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useStore(state => state.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { 
        phone: phone.trim(), 
        password: password.trim() 
      });
      const { access_token } = res.data;
      
      // Configure axios default auth token
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user profile details
      const userRes = await axios.get(`${API_URL}/api/auth/me`);
      login(access_token, userRes.data);
      
      toast.success(`Welcome back, ${userRes.data.name}!`);
      
      // Route based on role
      if (userRes.data.role === 'lab') {
        navigate('/lab-portal');
      } else if (userRes.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Invalid phone number or password.";
      toast.error(errorMsg);
      if (errorMsg.includes("verify your OTP")) {
        navigate(`/verify-otp?phone=${phone}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-[#f9f6f0]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-premium border border-slate-100 animate-fade-in-up">
        {/* Title logo */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full border border-green-100">
              <Sprout className="w-12 h-12 text-[#1a5c2a]" />
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('auth.loginTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">
                {t('auth.phone')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : t('auth.loginBtn')}
            </button>
          </div>
        </form>

        <div className="text-center mt-4 flex flex-col space-y-2">
          <Link to="/register" className="text-sm font-semibold text-primary hover:text-primary-light underline">
            {t('auth.noAccount')}
          </Link>
          <Link to="/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline">
            Forgot Password?
          </Link>
          <div className="mt-4 p-3 bg-[#f1ebd9] rounded-lg text-xs font-semibold text-slate-700 border border-[#e3dccb]">
            💡 Pro Tip: Use phone <strong className="text-primary-dark">9999999999</strong> and password <strong className="text-primary-dark">demo123</strong> to test instantly!
          </div>
        </div>
      </div>
    </div>
  );
}

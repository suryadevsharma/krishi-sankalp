import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Phone, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function VerifyOtp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPhone = searchParams.get('phone') || '';

  const [phone, setPhone] = useState(urlPhone);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (urlPhone) {
      setPhone(urlPhone);
    }
  }, [urlPhone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !otpCode) {
      toast.error("Please fill in both phone and OTP code fields.");
      return;
    }
    if (otpCode.length !== 6) {
      toast.error("OTP must be a 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        phone: phone.trim(),
        otp_code: otpCode.trim()
      });
      toast.success(res.data.message || "Account successfully verified!");
      navigate('/login');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Invalid OTP code. Please check your developer console logs.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      toast.error("Please specify a phone number first.");
      return;
    }
    setResending(true);
    try {
      // We trigger the forgot-password flow to generate and print a new OTP to the developer console log
      await axios.post(`${API_URL}/api/auth/forgot-password`, { phone: phone.trim() });
      toast.success("Simulated OTP resent! Check your backend server console logs.");
    } catch (err) {
      toast.error("Failed to resend OTP. Phone number not found.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-[#f9f6f0]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-premium border border-slate-100 animate-fade-in-up">
        {/* Title */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full border border-green-100">
              <ShieldCheck className="w-12 h-12 text-[#1a5c2a]" />
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify Your OTP
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Please check your server console log and enter the 6-digit OTP code below.
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
                  className="pl-10 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm font-semibold"
                />
              </div>
            </div>

            {/* OTP Code */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 tracking-[0.4em] text-center focus:outline-none focus:ring-primary focus:border-primary text-lg font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Activate Account"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full flex justify-center items-center space-x-1 py-2 px-4 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? "Resending..." : "Resend OTP (Check Server Log)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

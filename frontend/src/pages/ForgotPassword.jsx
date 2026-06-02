import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Reset Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: email.trim() });
      toast.success("Simulated reset OTP code printed to backend console log or email sent!");
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Email address not found.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !otpCode || !newPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (otpCode.length !== 6) {
      toast.error("OTP must be 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword.trim()
      });
      toast.success(res.data.message || "Password updated successfully!");
      navigate('/login');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to reset password. Check OTP code.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-[#f9f6f0]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-premium border border-slate-100 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full border border-green-100">
              <KeyRound className="w-12 h-12 text-[#1a5c2a]" />
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            {step === 1 
              ? "Enter your email address to receive a simulated reset OTP code." 
              : "Check your email or server log and input the OTP along with your new password."}
          </p>
        </div>

        {step === 1 ? (
          /* Step 1: Request OTP Form */
          <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Request Reset OTP"}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Reset Password Form */
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              {/* Email prefilled */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="pl-10 block w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-400 sm:text-sm font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* OTP */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 tracking-[0.4em] text-center focus:outline-none focus:ring-primary focus:border-primary text-lg font-bold"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="flex flex-col space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Confirm Password Reset"}
              </button>
              
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline"
              >
                Go Back to Step 1
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-4 border-t pt-4">
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-light underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

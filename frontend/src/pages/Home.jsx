import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Award, ClipboardList, TrendingUp, Info, ArrowRight, CheckCircle2, User, Mic } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/store';
import SkeletonLoader from '../components/SkeletonLoader';
import VoiceInput from '../components/VoiceInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token, activeCycleId, setActiveCycleId } = useStore();

  const [activeCycle, setActiveCycle] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voiceSearchText, setVoiceSearchText] = useState('');

  // Local storage backup coordinates
  const lat = parseFloat(localStorage.getItem('farmer_lat') || '20.5937');
  const lon = parseFloat(localStorage.getItem('farmer_lon') || '78.9629');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch active crop cycle
        const cycleRes = await axios.get(`${API_URL}/api/crop-cycles/active`);
        if (cycleRes.data.length > 0) {
          const latestCycle = cycleRes.data[0];
          setActiveCycle(latestCycle);
          setActiveCycleId(latestCycle.id);
        } else {
          setActiveCycle(null);
          setActiveCycleId(null);
        }

        // 2. Fetch government schemes matching farmer criteria
        if (user) {
          const schemeRes = await axios.get(
            `${API_URL}/api/schemes/recommend?state=${user.state}&land_acres=${user.land_acres}`
          );
          setSchemes(schemeRes.data.slice(0, 3)); // show top 3 schemes on dashboard
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, token, navigate, setActiveCycleId]);

  // Gamification leaderboards details (mocked dynamically for user's district)
  const leaderboardData = [
    { rank: 1, name: "Suresh Patil", village: "Ganeshpur", improvement: 14.2 },
    { rank: 2, name: user?.name || "Ramesh Kumar", village: user?.village || "Krishi Gram", improvement: 12.5, isCurrentUser: true },
    { rank: 3, name: "Anita Devi", village: "Rampur", improvement: 10.8 },
    { rank: 4, name: "Harpreet Singh", village: "Nanakpur", improvement: 9.4 },
    { rank: 5, name: "Vijay R.", village: "Cholanpur", improvement: 8.7 }
  ];

  // Determine badge statuses
  // First badge: active cycle exists. Second badge: budget entries exist. Third badge: arbitrary.
  const hasFirstHarvestBadge = activeCycle !== null;
  const hasThreeCropsBadge = false; // Mocked
  const hasMarketWinnerBadge = true; // Mocked

  const handleVoiceTranscript = (text) => {
    setVoiceSearchText(text);
    // Auto navigate to market prices search if they speak a crop
    if (text.toLowerCase().includes('rice') || text.toLowerCase().includes('wheat') || text.toLowerCase().includes('chawal')) {
      navigate(`/samriddhi?search=${text}`);
    } else {
      navigate(`/sankalp?search=${text}`);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up pb-20 md:pb-8">
      {/* Header and Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-2xl p-6 shadow-premium border border-slate-100 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-dark">
            {t('home.welcome')} {user.name}!
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            📍 {user.village}, {user.district}, {user.state} &bull; Land holding: {user.land_acres} Acres
          </p>
        </div>
        
        {/* Voice Search input area on dashboard */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0 bg-[#f9f6f0] p-2 rounded-xl border border-slate-200 w-full md:w-auto">
          <input
            type="text"
            readOnly
            value={voiceSearchText}
            placeholder={t('home.voicePrompt')}
            className="bg-transparent border-none text-xs font-semibold focus:outline-none text-slate-800 w-full md:w-48 placeholder-slate-400"
          />
          <VoiceInput onTranscript={handleVoiceTranscript} fieldName="Crop Search" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Crop Journey Progress Tracker */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center space-x-2">
              <Sprout className="w-6 h-6 text-primary" />
              <span>{t('home.progress')}</span>
            </h2>
            
            {activeCycle ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-green-50 px-4 py-3 rounded-lg border border-green-100">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase">Cultivating</span>
                    <strong className="text-lg text-primary-dark">{activeCycle.crop_name.toUpperCase()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Season</span>
                    <strong className="text-sm text-slate-700">{activeCycle.season}</strong>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="relative pt-4">
                  <div className="flex mb-2 items-center justify-between text-xs font-bold">
                    <div className="text-primary flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('home.planning')}</span>
                    </div>
                    <div className="text-orange-500 flex items-center space-x-1">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping mr-1"></div>
                      <span>{t('home.growing')}</span>
                    </div>
                    <div className="text-slate-400">
                      <span>{t('home.market')}</span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-[#f1ebd9]">
                    <div style={{ width: '65%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-premium"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
                    <span>Sow Sowing</span>
                    <span>Harvest Impending</span>
                    <span>Link Mandis</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link
                    to="/saadhna"
                    className="flex items-center space-x-1.5 text-sm font-bold text-primary hover:text-primary-light"
                  >
                    <span>Manage Crop Calendar</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="p-4 bg-[#f9f6f0] rounded-full inline-block">
                  <ClipboardList className="w-8 h-8 text-[#d4870a]" />
                </div>
                <p className="text-slate-500 font-semibold">{t('home.noActive')}</p>
                <Link
                  to="/sankalp"
                  className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-light text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md transition-colors"
                >
                  <span>Plan My Next Crop</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Government Scheme Recommender */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center space-x-2">
              <Award className="w-6 h-6 text-accent" />
              <span>{t('home.govtSchemes')}</span>
            </h2>

            <div className="space-y-4">
              {schemes.map((scheme) => (
                <div 
                  key={scheme.id} 
                  className="p-4 rounded-xl border border-slate-200 hover:border-primary-light transition-all hover:bg-green-50/20 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{scheme.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scheme.description}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-2">
                      📋 Eligibility: <span className="text-slate-600 font-normal">{scheme.eligibility}</span>
                    </p>
                  </div>
                  <div className="flex justify-end mt-3 pt-2 border-t border-slate-100">
                    <a
                      href={scheme.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <span>Apply Online</span>
                      <Info className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <Link to="/sankalp?tab=kvk" className="text-xs font-bold text-slate-400 hover:text-primary">
                  View More Schemes & Local Offices
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Gamification: Earned Badges */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center space-x-2">
              <Award className="w-6 h-6 text-yellow-500 animate-spin" />
              <span>{t('home.badges')}</span>
            </h2>

            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Badge 1 */}
              <div className={`p-3 rounded-xl border ${
                hasFirstHarvestBadge 
                  ? 'border-yellow-200 bg-yellow-50/55 text-slate-950 font-bold' 
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}>
                <div className="flex justify-center mb-1">
                  <Award className={`w-8 h-8 ${hasFirstHarvestBadge ? 'text-yellow-500' : 'text-slate-300'}`} />
                </div>
                <span className="text-[10px] block leading-tight">{t('home.badge1')}</span>
              </div>

              {/* Badge 2 */}
              <div className={`p-3 rounded-xl border ${
                hasThreeCropsBadge 
                  ? 'border-yellow-200 bg-yellow-50/55 text-slate-950 font-bold' 
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}>
                <div className="flex justify-center mb-1">
                  <Award className={`w-8 h-8 ${hasThreeCropsBadge ? 'text-yellow-500' : 'text-slate-300'}`} />
                </div>
                <span className="text-[10px] block leading-tight">{t('home.badge2')}</span>
              </div>

              {/* Badge 3 */}
              <div className={`p-3 rounded-xl border ${
                hasMarketWinnerBadge 
                  ? 'border-yellow-200 bg-yellow-50/55 text-slate-950 font-bold' 
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}>
                <div className="flex justify-center mb-1">
                  <Award className={`w-8 h-8 ${hasMarketWinnerBadge ? 'text-yellow-500 animate-bounce' : 'text-slate-300'}`} />
                </div>
                <span className="text-[10px] block leading-tight">{t('home.badge3')}</span>
              </div>
            </div>
          </div>

          {/* Gamification: Yield Improvement Leaderboard */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100">
            <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span>{t('home.leaderboard')}</span>
            </h2>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-[#f9f6f0] text-slate-500 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('home.rank')}</th>
                    <th className="px-3 py-2 text-left">{t('home.farmerName')}</th>
                    <th className="px-3 py-2 text-right">{t('home.yieldImprovement')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboardData.map((row) => (
                    <tr 
                      key={row.rank} 
                      className={`${
                        row.isCurrentUser 
                          ? 'bg-green-50/80 font-bold text-primary-dark' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-3.5 text-left">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                      </td>
                      <td className="px-3 py-3.5 text-left">
                        <div>{row.name}</div>
                        <span className="text-[9px] text-slate-400 font-normal">{row.village}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold text-[#1a5c2a]">
                        +{row.improvement}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

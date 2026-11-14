import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, Sparkles, X, CreditCard } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export const SubscriptionModal: React.FC = () => {
  const { showSubModal, setShowSubModal, activateSubscription } = useAuth();
  const { settings } = useSettings();
  const [isProcessing, setIsProcessing] = useState(false);

  const price = settings.pro_pass_monthly_price || 29;

  if (!showSubModal) return null;

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await activateSubscription();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header decoration */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white">
          <button
            onClick={() => setShowSubModal(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Unlock Digital SAT Master Pass</span>
          </div>

          <h3 className="text-2xl font-bold tracking-tight">Access Full Mock Tests & Drills</h3>
          <p className="text-blue-100 text-sm mt-1">
            Empower your SAT prep with real exam simulation, embedded Desmos, and personalized weakness targeting.
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Pricing Card */}
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Pro Student Pass</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-slate-900">${price}</span>
                <span className="text-xs text-slate-500 font-medium">/ month (Auto-renews)</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
                Most Popular
              </span>
            </div>
          </div>

          {/* Features List */}
          <ul className="space-y-3">
            {[
              "Unlimited adaptive Digital SAT Mock Tests with authentic timing",
              "Integrated official Desmos Graphing Calculator",
              "Topic-by-topic drills (Algebra, Trig, Geometry, Advanced Math)",
              "Difficulty-based sorting (Easy, Medium, Hard)",
              "Granular per-question time analysis & teacher explanations",
              "Session-wise student analytics dashboard",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <div className="mt-0.5 p-0.5 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <Button
              onClick={handleCheckout}
              isLoading={isProcessing}
              size="lg"
              className="w-full text-base font-bold shadow-lg shadow-blue-500/25"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${price} & Start Practicing
            </Button>
            <p className="text-center text-xs text-slate-400 mt-2.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Instant activation • Cancel anytime with one click
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


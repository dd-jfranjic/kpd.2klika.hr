'use client';

import { AiSuggestionPanel } from './ai-suggestion-panel';
import { KpdBrowser } from './kpd-browser';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

export function KpdClassifier() {
  const { planName, remainingQueries, monthlyLimit, loading, updateRemainingQueries } = useSubscription();

  return (
    <div className="space-y-6">
      {/* Premium Header - Green theme */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-6 shadow-xl">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left side - Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">AI KPD Klasifikator</h1>
                <p className="text-white/80 mt-1">
                  AI-powered klasifikacija proizvoda i usluga
                </p>
              </div>
            </div>

            {/* Right side - Plan & Queries */}
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white/60 text-xs uppercase tracking-wide">Plan</p>
                <p className="text-white font-semibold flex items-center gap-1.5">
                  {planName !== 'Besplatni' && <Crown className="w-4 h-4" />}
                  {loading ? '...' : planName}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white/60 text-xs uppercase tracking-wide">Upiti ovaj mjesec</p>
                <p className="text-white font-semibold flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  {loading ? '...' : `${remainingQueries}/${monthlyLimit}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Panel - FiskalAI style */}
      <AiSuggestionPanel
        onQueryComplete={updateRemainingQueries}
        initialRemainingQueries={remainingQueries}
        monthlyLimit={monthlyLimit}
        planName={planName}
        isLoading={loading}
      />

      {/* KPD Browser - Manual search */}
      <KpdBrowser />
    </div>
  );
}

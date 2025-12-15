'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  BarChart3,
  Users,
  Search as SearchIcon,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Zap,
  Clock,
} from 'lucide-react';

interface Analytics {
  revenue: {
    total: number;
    change: number;
  };
  classifications: {
    total: number;
    change: number;
  };
  users: {
    new: number;
    change: number;
  };
  performance: {
    avgResponseTime: number;
    change: number;
    cacheHitRate: number;
    uptime: number;
    errorRate: number;
    p95Latency: number;
  };
  usageHistory: Array<{ date: string; queries: number; cached: number }>;
  planDistribution: Array<{ name: string; value: number }>;
  topKpdCodes: Array<{ code: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('7d');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchAnalytics();
  }, [period, token]);

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/analytics?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('enterprise')) return 'bg-purple-500';
    if (name.includes('business')) return 'bg-indigo-500';
    if (name.includes('pro')) return 'bg-blue-500';
    if (name.includes('plus')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analitika</h1>
            <p className="text-gray-500 mt-1">Pregled korištenja i statistike sustava</p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d' | '1y')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7d">Zadnjih 7 dana</option>
              <option value="30d">Zadnjih 30 dana</option>
              <option value="90d">Zadnjih 90 dana</option>
              <option value="1y">Zadnjih godinu dana</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : analytics ? (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Revenue */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Mjesečni prihod</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analytics.revenue.total.toFixed(2)} EUR
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                {analytics.revenue.change !== 0 && (
                  <div className="mt-4 flex items-center gap-1">
                    {analytics.revenue.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${analytics.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analytics.revenue.change >= 0 ? '+' : ''}{analytics.revenue.change}%
                    </span>
                    <span className="text-sm text-gray-500">vs prethodni period</span>
                  </div>
                )}
              </div>

              {/* Classifications */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Ukupno klasifikacija</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.classifications.total}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <SearchIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {analytics.classifications.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${analytics.classifications.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.classifications.change >= 0 ? '+' : ''}{analytics.classifications.change}%
                  </span>
                  <span className="text-sm text-gray-500">vs prethodni period</span>
                </div>
              </div>

              {/* New Users */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Novi korisnici</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.users.new}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {analytics.users.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${analytics.users.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.users.change >= 0 ? '+' : ''}{analytics.users.change}%
                  </span>
                  <span className="text-sm text-gray-500">vs prethodni period</span>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Prosječno vrijeme odgovora</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.performance.avgResponseTime}ms</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <span>Cache: {analytics.performance.cacheHitRate}%</span>
                  <span>•</span>
                  <span>Uptime: {analytics.performance.uptime}%</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usage History Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Klasifikacije po danima</h3>
                <div className="h-64 flex items-end gap-1">
                  {analytics.usageHistory && analytics.usageHistory.length > 0 ? (
                    analytics.usageHistory.map((day, i) => {
                      const maxCount = Math.max(...analytics.usageHistory.map(d => d.queries), 1);
                      const height = (day.queries / maxCount) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-primary-500 rounded-t hover:bg-primary-600 transition-colors relative group"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {day.queries} upita
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      Nema podataka
                    </div>
                  )}
                </div>
                {analytics.usageHistory && analytics.usageHistory.length > 0 && (
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{analytics.usageHistory[0]?.date || ''}</span>
                    <span>{analytics.usageHistory[analytics.usageHistory.length - 1]?.date || ''}</span>
                  </div>
                )}
              </div>

              {/* Plan Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Distribucija po planovima</h3>
                <div className="space-y-4">
                  {analytics.planDistribution && analytics.planDistribution.length > 0 ? (
                    analytics.planDistribution.map((item) => {
                      const total = analytics.planDistribution.reduce((sum, p) => sum + p.value, 0);
                      const percentage = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            <span className="text-sm text-gray-500">{item.value} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getPlanColor(item.name)} rounded-full`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 py-4">Nema podataka o planovima</div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Detalji performansi</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{analytics.performance.avgResponseTime}ms</p>
                  <p className="text-sm text-gray-500">Prosječno vrijeme</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{analytics.performance.p95Latency}ms</p>
                  <p className="text-sm text-gray-500">P95 latencija</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Zap className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{analytics.performance.cacheHitRate}%</p>
                  <p className="text-sm text-gray-500">Cache hit rate</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{analytics.performance.uptime}%</p>
                  <p className="text-sm text-gray-500">Uptime</p>
                </div>
              </div>
            </div>

            {/* Top KPD Codes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Najpopularniji KPD kodovi</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Broj upita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.topKpdCodes && analytics.topKpdCodes.length > 0 ? (
                      analytics.topKpdCodes.map((code, i) => (
                        <tr key={code.code} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{code.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{code.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                          Nema podataka o KPD kodovima
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Greška pri učitavanju analitike
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

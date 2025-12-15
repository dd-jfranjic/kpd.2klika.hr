'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Settings, Save, RotateCcw, Loader2, ToggleRight } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  category: string;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
}

export default function AdminConfigPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const [configRes, flagsRes] = await Promise.all([
        fetch('/api/v1/admin/config', { headers, credentials: 'include' }),
        fetch('/api/v1/admin/feature-flags', { headers, credentials: 'include' }),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.data || []);
        const values: Record<string, string> = {};
        (data.data || []).forEach((c: ConfigItem) => {
          values[c.key] = c.value;
        });
        setEditValues(values);
      }

      if (flagsRes.ok) {
        const data = await flagsRes.json();
        setFeatureFlags(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (key: string) => {
    if (!token) return;
    try {
      setSaving(key);
      const res = await fetch(`/api/v1/admin/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ value: editValues[key] }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleFlag = async (key: string, enabled: boolean) => {
    if (!token) return;
    try {
      setSaving(key);
      const res = await fetch(`/api/v1/admin/feature-flags/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
    } finally {
      setSaving(null);
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = config.category || 'Ostalo';
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {} as Record<string, ConfigItem[]>);

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
            <h1 className="text-2xl font-bold text-gray-900">Konfiguracija sustava</h1>
            <p className="text-gray-500 mt-1">Postavke i feature flagovi</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Osvjezi
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Feature Flags */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ToggleRight className="w-5 h-5 text-primary-600" />
                  Feature Flagovi
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {featureFlags.map((flag) => (
                  <div key={flag.key} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{flag.key}</div>
                      <div className="text-sm text-gray-500">{flag.description || 'Nema opisa'}</div>
                    </div>
                    <button
                      onClick={() => handleToggleFlag(flag.key, !flag.enabled)}
                      disabled={saving === flag.key}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.enabled ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      {saving === flag.key ? (
                        <Loader2 className="w-4 h-4 absolute left-1/2 -translate-x-1/2 animate-spin text-white" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            flag.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                ))}
                {featureFlags.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    Nema definiranih feature flagova
                  </div>
                )}
              </div>
            </div>

            {/* System Configuration */}
            {Object.entries(groupedConfigs).map(([category, items]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary-600" />
                    {category}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {items.map((config) => (
                    <div key={config.key} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="block font-medium text-gray-900 mb-1">{config.key}</label>
                          <p className="text-sm text-gray-500 mb-2">{config.description || 'Nema opisa'}</p>
                          <input
                            type="text"
                            value={editValues[config.key] || ''}
                            onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveConfig(config.key)}
                          disabled={saving === config.key || editValues[config.key] === config.value}
                          className="mt-7 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving === config.key ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Spremi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(groupedConfigs).length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                Nema definiranih konfiguracija
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

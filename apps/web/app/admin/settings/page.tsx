'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  Settings,
  Plug,
  ToggleRight,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Shield,
  Database,
  Mail,
  Zap,
} from 'lucide-react';

// Interfaces
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

interface Integration {
  key: string;
  name: string;
  value: string;
  description?: string;
  masked: string;
  isConfigured: boolean;
  isRequired: boolean;
}

interface GeminiModel {
  value: string;
  label: string;
  description: string;
}

interface IntegrationGroup {
  title: string;
  description: string;
  icon: string;
  configs: Integration[];
  apiKeyConfigured?: boolean;
  compatibleModels?: GeminiModel[];
}

interface IntegrationStats {
  configured: number;
  missing: number;
  optional: number;
}

interface SecuritySettings {
  admin2faRequired: boolean;
  sessionTimeoutMinutes: number;
  ipWhitelistEnabled: boolean;
  ipWhitelistAddresses: string;
  rateLimitPerMinute: number;
}

const TABS = [
  { id: 'general', label: 'Općenito', icon: Settings },
  { id: 'features', label: 'Feature Flagovi', icon: ToggleRight },
  { id: 'integrations', label: 'Integracije', icon: Plug },
  { id: 'security', label: 'Sigurnost', icon: Shield },
];

function AdminSettingsPageContent() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Config state
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationGroups, setIntegrationGroups] = useState<{ ai?: IntegrationGroup; smtp?: IntegrationGroup }>({});
  const [integrationStats, setIntegrationStats] = useState<IntegrationStats | null>(null);
  const [webhookUrls, setWebhookUrls] = useState<{ stripe: string } | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [integrationEditValues, setIntegrationEditValues] = useState<Record<string, string>>({});

  // Security state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    admin2faRequired: false,
    sessionTimeoutMinutes: 60,
    ipWhitelistEnabled: false,
    ipWhitelistAddresses: '',
    rateLimitPerMinute: 100,
  });
  const [securityDirty, setSecurityDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch all data in parallel
      const [configRes, flagsRes, integrationsRes, securityRes] = await Promise.all([
        fetch('/api/v1/admin/config', { headers, credentials: 'include' }),
        fetch('/api/v1/admin/feature-flags', { headers, credentials: 'include' }),
        fetch('/api/v1/admin/integrations', { headers, credentials: 'include' }),
        fetch('/api/v1/admin/security', { headers, credentials: 'include' }),
      ]);

      // Process configs
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.data || []);
        const values: Record<string, string> = {};
        (data.data || []).forEach((c: ConfigItem) => {
          values[c.key] = c.value;
        });
        setEditValues(values);
      }

      // Process feature flags
      if (flagsRes.ok) {
        const data = await flagsRes.json();
        setFeatureFlags(data.data || []);
      }

      // Process integrations
      if (integrationsRes.ok) {
        const json = await integrationsRes.json();
        const data = json.data || { configs: [], groups: {}, stats: { configured: 0, missing: 0, optional: 0 }, webhookUrls: { stripe: '' } };
        setIntegrations(data.configs || []);
        setIntegrationGroups(data.groups || {});
        setIntegrationStats(data.stats);
        setWebhookUrls(data.webhookUrls);

        const intValues: Record<string, string> = {};
        // Get values from all groups
        if (data.groups?.ai?.configs) {
          data.groups.ai.configs.forEach((i: Integration) => {
            intValues[i.key] = i.value || '';
          });
        }
        if (data.groups?.smtp?.configs) {
          data.groups.smtp.configs.forEach((i: Integration) => {
            intValues[i.key] = i.value || '';
          });
        }
        // Fallback to flat configs
        (data.configs || []).forEach((i: Integration) => {
          if (!intValues[i.key]) {
            intValues[i.key] = i.value || '';
          }
        });
        setIntegrationEditValues(intValues);
      }

      // Process security settings
      if (securityRes.ok) {
        const json = await securityRes.json();
        if (json.data) {
          setSecuritySettings(json.data);
          setSecurityDirty(false);
        }
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Config handlers
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
        fetchAllData();
      }
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(null);
    }
  };

  // Feature flag handlers
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
        fetchAllData();
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
    } finally {
      setSaving(null);
    }
  };

  // Integration handlers
  const handleSaveIntegration = async (key: string) => {
    if (!token) return;
    try {
      setSaving(key);
      const res = await fetch(`/api/v1/admin/integrations/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ value: integrationEditValues[key] }),
      });

      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setSaving(null);
    }
  };

  // Security handlers
  const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSecuritySettings((prev) => ({ ...prev, [key]: value }));
    setSecurityDirty(true);
  };

  const handleSaveSecuritySettings = async () => {
    if (!token) return;
    try {
      setSaving('security');
      const res = await fetch('/api/v1/admin/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(securitySettings),
      });

      if (res.ok) {
        setSecurityDirty(false);
        fetchAllData();
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleClearCache = async () => {
    if (!token) return;
    const confirmed = confirm('Jeste li sigurni da želite očistiti cache? Ovo može privremeno usporiti sustav.');
    if (!confirmed) return;

    try {
      setSaving('clearCache');
      const res = await fetch('/api/v1/admin/security/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ type: 'all' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.data?.message || 'Cache uspješno očišćen!');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Greška pri čišćenju cachea');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoutAllUsers = async () => {
    if (!token) return;
    const confirmed = confirm('UPOZORENJE: Ovo će odjaviti SVE korisnike iz sustava!\n\nJeste li sigurni?');
    if (!confirmed) return;

    const doubleConfirm = confirm('POSLJEDNJE UPOZORENJE: Svi korisnici, uključujući vas, će morati ponovno se prijaviti.\n\nNastaviti?');
    if (!doubleConfirm) return;

    try {
      setSaving('logoutAll');
      const res = await fetch('/api/v1/admin/security/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.data?.message || 'Svi korisnici će biti odjavljeni.');
      }
    } catch (error) {
      console.error('Error logging out users:', error);
      alert('Greška pri odjavi korisnika');
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

  const getIntegrationStatusBadge = (integration: Integration) => {
    if (integration.isConfigured) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Konfigurirano
        </span>
      );
    }
    if (integration.isRequired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Obavezno
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Nije konfigurirano
      </span>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Postavke sustava</h1>
            <p className="text-gray-500">Konfiguracija, feature flagovi i integracije</p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Osvježi
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* General Tab - System Configuration */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {Object.entries(groupedConfigs).map(([category, items]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {category === 'AI' && <Zap className="w-5 h-5 text-yellow-500" />}
                        {category === 'Email' && <Mail className="w-5 h-5 text-blue-500" />}
                        {category === 'Database' && <Database className="w-5 h-5 text-green-500" />}
                        {!['AI', 'Email', 'Database'].includes(category) && <Settings className="w-5 h-5 text-gray-500" />}
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
                              {/* Use textarea for PROMPT fields and other long text */}
                              {config.key.includes('PROMPT') || config.key.includes('ADDRESSES') ? (
                                <textarea
                                  rows={6}
                                  value={editValues[config.key] || ''}
                                  onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                  placeholder="Unesite vrijednost..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={editValues[config.key] || ''}
                                  onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                              )}
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
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nema definiranih konfiguracija</p>
                  </div>
                )}
              </div>
            )}

            {/* Feature Flags Tab */}
            {activeTab === 'features' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ToggleRight className="w-5 h-5 text-primary-600" />
                    Feature Flagovi
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Uključite ili isključite značajke za sve korisnike
                  </p>
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
                      <ToggleRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nema definiranih feature flagova</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                {/* Stats Summary */}
                {integrationStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{integrationStats.configured}</p>
                          <p className="text-sm text-gray-500">Konfigurirano</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{integrationStats.missing}</p>
                          <p className="text-sm text-gray-500">Nedostaje</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Plug className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{integrationStats.optional}</p>
                          <p className="text-sm text-gray-500">Opcionalno</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Settings Group */}
                {integrationGroups.ai && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">{integrationGroups.ai.title}</h2>
                          <p className="text-sm text-gray-500">{integrationGroups.ai.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* API Key Status (read-only) */}
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <h3 className="font-medium text-gray-900">GEMINI_API_KEY</h3>
                          <p className="text-sm text-gray-500">API ključ za Google Gemini (konfigurira se u .env)</p>
                        </div>
                        {integrationGroups.ai.apiKeyConfigured ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-4 h-4" />
                            Konfigurirano
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            <XCircle className="w-4 h-4" />
                            Nije konfigurirano
                          </span>
                        )}
                      </div>

                      {/* Model Selection Dropdown */}
                      {integrationGroups.ai.compatibleModels && (
                        <div className="py-3 border-b border-gray-100">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">GEMINI_MODEL</h3>
                              <p className="text-sm text-gray-500 mb-3">Odaberi AI model za klasifikaciju (RAG kompatibilni)</p>
                              <select
                                value={integrationEditValues['GEMINI_MODEL'] || 'gemini-2.5-flash'}
                                onChange={(e) => setIntegrationEditValues({ ...integrationEditValues, 'GEMINI_MODEL': e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                {integrationGroups.ai.compatibleModels.map((model) => (
                                  <option key={model.value} value={model.value}>
                                    {model.label} - {model.description}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => handleSaveIntegration('GEMINI_MODEL')}
                              disabled={saving === 'GEMINI_MODEL'}
                              className="mt-7 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {saving === 'GEMINI_MODEL' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Spremi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* RAG Store ID */}
                      {integrationGroups.ai.configs.find(c => c.key === 'RAG_STORE_ID') && (
                        <div className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">RAG_STORE_ID</h3>
                              <p className="text-sm text-gray-500 mb-3">Google File Search Store ID za RAG dokumente</p>
                              <input
                                type="text"
                                value={integrationEditValues['RAG_STORE_ID'] || ''}
                                onChange={(e) => setIntegrationEditValues({ ...integrationEditValues, 'RAG_STORE_ID': e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                placeholder="fileSearchStores/..."
                              />
                            </div>
                            <button
                              onClick={() => handleSaveIntegration('RAG_STORE_ID')}
                              disabled={saving === 'RAG_STORE_ID'}
                              className="mt-7 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {saving === 'RAG_STORE_ID' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Spremi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SMTP Settings Group */}
                {integrationGroups.smtp && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">{integrationGroups.smtp.title}</h2>
                          <p className="text-sm text-gray-500">{integrationGroups.smtp.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {integrationGroups.smtp.configs.map((config) => (
                        <div key={config.key} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-gray-900">{config.key}</h3>
                                {getIntegrationStatusBadge(config)}
                              </div>
                              <p className="text-sm text-gray-500 mb-3">{config.description}</p>
                              <div className="relative">
                                <input
                                  type={config.key.includes('PASS') ? (showValues[config.key] ? 'text' : 'password') : 'text'}
                                  value={integrationEditValues[config.key] || ''}
                                  onChange={(e) => setIntegrationEditValues({ ...integrationEditValues, [config.key]: e.target.value })}
                                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                  placeholder={config.key.includes('PORT') ? '587' : 'Unesite vrijednost...'}
                                />
                                {config.key.includes('PASS') && (
                                  <button
                                    onClick={() => setShowValues({ ...showValues, [config.key]: !showValues[config.key] })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    {showValues[config.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSaveIntegration(config.key)}
                              disabled={saving === config.key}
                              className="mt-7 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {saving === config.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Spremi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Webhook URLs */}
                {webhookUrls && webhookUrls.stripe && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Plug className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Stripe Webhook</h2>
                          <p className="text-sm text-gray-500">URL za Stripe webhook events</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-500 mb-2">Kopiraj ovaj URL u Stripe Dashboard → Webhooks</p>
                      <code className="block w-full bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 font-mono text-sm text-gray-800 overflow-x-auto">
                        {webhookUrls.stripe}
                      </code>
                    </div>
                  </div>
                )}

                {/* Fallback for empty state */}
                {!integrationGroups.ai && !integrationGroups.smtp && integrations.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    <Plug className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nema definiranih integracija</p>
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-500" />
                      Sigurnosne postavke
                    </h2>
                    {securityDirty && (
                      <button
                        onClick={handleSaveSecuritySettings}
                        disabled={saving === 'security'}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {saving === 'security' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Spremi promjene
                      </button>
                    )}
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Two-Factor Authentication */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-medium text-gray-900">Obavezna 2FA za admine</h3>
                        <p className="text-sm text-gray-500">Zahtijevaj dvofaktorsku autentikaciju za admin pristup</p>
                      </div>
                      <button
                        onClick={() => updateSecuritySetting('admin2faRequired', !securitySettings.admin2faRequired)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          securitySettings.admin2faRequired ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            securitySettings.admin2faRequired ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Session Timeout */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-medium text-gray-900">Session Timeout</h3>
                        <p className="text-sm text-gray-500">Automatska odjava nakon neaktivnosti</p>
                      </div>
                      <select
                        value={securitySettings.sessionTimeoutMinutes}
                        onChange={(e) => updateSecuritySetting('sessionTimeoutMinutes', parseInt(e.target.value, 10))}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value={30}>30 minuta</option>
                        <option value={60}>1 sat</option>
                        <option value={120}>2 sata</option>
                        <option value={240}>4 sata</option>
                        <option value={480}>8 sati</option>
                        <option value={1440}>24 sata</option>
                      </select>
                    </div>

                    {/* IP Whitelist */}
                    <div className="py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">IP Whitelist za Admin</h3>
                          <p className="text-sm text-gray-500">Ograniči admin pristup na određene IP adrese</p>
                        </div>
                        <button
                          onClick={() => updateSecuritySetting('ipWhitelistEnabled', !securitySettings.ipWhitelistEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            securitySettings.ipWhitelistEnabled ? 'bg-primary-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              securitySettings.ipWhitelistEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={securitySettings.ipWhitelistAddresses}
                        onChange={(e) => updateSecuritySetting('ipWhitelistAddresses', e.target.value)}
                        placeholder="Unesite IP adrese (jedna po liniji)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!securitySettings.ipWhitelistEnabled}
                      />
                    </div>

                    {/* Rate Limiting */}
                    <div className="flex items-center justify-between py-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Rate Limiting</h3>
                        <p className="text-sm text-gray-500">Maksimalan broj zahtjeva po minuti</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={securitySettings.rateLimitPerMinute}
                          onChange={(e) => updateSecuritySetting('rateLimitPerMinute', parseInt(e.target.value, 10) || 100)}
                          min={10}
                          max={10000}
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-sm text-gray-500">/min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                    <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Očisti cache</h3>
                        <p className="text-sm text-gray-500">Izbriši sve cache podatke sustava</p>
                      </div>
                      <button
                        onClick={handleClearCache}
                        disabled={saving === 'clearCache'}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving === 'clearCache' && <Loader2 className="w-4 h-4 animate-spin" />}
                        Očisti cache
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Odjavi sve korisnike</h3>
                        <p className="text-sm text-gray-500">Prisilno odjavi sve aktivne sesije</p>
                      </div>
                      <button
                        onClick={handleLogoutAllUsers}
                        disabled={saving === 'logoutAll'}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving === 'logoutAll' && <Loader2 className="w-4 h-4 animate-spin" />}
                        Odjavi sve
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    }>
      <AdminSettingsPageContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Plug, Save, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Integration {
  key: string;
  name: string;
  value: string;
  description?: string;
  masked: string;
  isConfigured: boolean;
  isRequired: boolean;
}

interface IntegrationStats {
  configured: number;
  missing: number;
  optional: number;
}

interface IntegrationsResponse {
  configs: Integration[];
  stats: IntegrationStats;
  webhookUrls: {
    stripe: string;
  };
}

export default function AdminIntegrationsPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [webhookUrls, setWebhookUrls] = useState<{ stripe: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchIntegrations();
  }, [token]);

  const fetchIntegrations = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/integrations', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (res.ok) {
        const json = await res.json();
        const data: IntegrationsResponse = json.data || { configs: [], stats: { configured: 0, missing: 0, optional: 0 }, webhookUrls: { stripe: '' } };

        setIntegrations(data.configs || []);
        setStats(data.stats);
        setWebhookUrls(data.webhookUrls);

        const values: Record<string, string> = {};
        (data.configs || []).forEach((i: Integration) => {
          values[i.key] = i.value || '';
        });
        setEditValues(values);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    if (!token) return;
    try {
      setSaving(key);
      const res = await fetch(`/api/v1/admin/integrations/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ value: editValues[key] }),
      });

      if (res.ok) {
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (integration: Integration) => {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integracije</h1>
          <p className="text-gray-500 mt-1">Upravljanje API ključevima i vanjskim servisima</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.configured}</p>
                      <p className="text-sm text-gray-500">Konfigurirano</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.missing}</p>
                      <p className="text-sm text-gray-500">Nedostaje</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plug className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.optional}</p>
                      <p className="text-sm text-gray-500">Opcionalno</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook URLs */}
            {webhookUrls && webhookUrls.stripe && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Webhook URL-ovi</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-700">Stripe Webhook:</span>
                  <code className="flex-1 bg-white px-3 py-1.5 rounded border border-blue-200 font-mono text-sm text-blue-800">
                    {webhookUrls.stripe}
                  </code>
                </div>
              </div>
            )}

            {/* Integrations List */}
            <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.key}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Plug className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{integration.key}</h3>
                        {getStatusBadge(integration)}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{integration.description || 'Nema opisa'}</p>

                      <div className="relative">
                        <input
                          type={showValues[integration.key] ? 'text' : 'password'}
                          value={editValues[integration.key] || ''}
                          onChange={(e) => setEditValues({ ...editValues, [integration.key]: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                          placeholder="Unesite API ključ..."
                        />
                        <button
                          onClick={() => setShowValues({ ...showValues, [integration.key]: !showValues[integration.key] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showValues[integration.key] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSave(integration.key)}
                    disabled={saving === integration.key}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving === integration.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Spremi
                  </button>
                </div>
              </div>
            ))}

            {integrations.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                Nema definiranih integracija
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

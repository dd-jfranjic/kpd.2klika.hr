'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  scopes: string[];
  isActive: boolean;
}

export default function ApiKeysSettingsPage() {
  const { token } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchApiKeys();
    }
  }, [token]);

  const fetchApiKeys = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api-keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      } else {
        // API endpoint might not exist yet, show empty state
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newKeyName.trim()) return;

    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: ['kpd:read', 'kpd:classify'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.data?.key || data.key);
        setShowNewKey(true);
        setNewKeyName('');
        setShowCreateForm(false);
        fetchApiKeys();
        setMessage({ type: 'success', text: 'API ključ uspješno kreiran!' });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greška pri kreiranju API ključa');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Greška pri kreiranju API ključa',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!token) return;
    if (!confirm('Jeste li sigurni da želite obrisati ovaj API ključ?')) return;

    try {
      const response = await fetch(`${API_BASE}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== keyId));
        setMessage({ type: 'success', text: 'API ključ uspješno obrisan!' });
      } else {
        throw new Error('Greška pri brisanju API ključa');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Greška pri brisanju API ključa',
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Key className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="kpd-heading-3">API ključevi</h2>
            <p className="kpd-text-small">Upravljajte API ključevima za programatski pristup</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="kpd-btn kpd-btn--primary"
          >
            <Plus className="w-4 h-4" />
            Novi ključ
          </button>
        </div>

        <div className="kpd-settings-card__body">
          {/* Message */}
          {message && (
            <div className={`kpd-alert kpd-alert--${message.type} mb-4`}>
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message.text}
            </div>
          )}

          {/* New API Key Display */}
          {newApiKey && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 mb-1">
                    Vaš novi API ključ je kreiran!
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    Kopirajte ovaj ključ i spremite ga na sigurno mjesto. Nećete ga moći vidjeti ponovno!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 font-mono text-sm">
                      {showNewKey ? newApiKey : '•'.repeat(40)}
                    </code>
                    <button
                      onClick={() => setShowNewKey(!showNewKey)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded"
                    >
                      {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(newApiKey, 'new-key')}
                      className="p-2 text-green-600 hover:bg-green-100 rounded"
                    >
                      {copiedId === 'new-key' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setNewApiKey(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateKey} className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Kreiraj novi API ključ</h4>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="kpd-auth-form__label">Naziv ključa</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="npr. Production API"
                    className="kpd-auth-form__input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating || !newKeyName.trim()}
                  className="kpd-btn kpd-btn--primary"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Kreiram...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Kreiraj
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName('');
                  }}
                  className="kpd-btn kpd-btn--secondary"
                >
                  Odustani
                </button>
              </div>
            </form>
          )}

          {/* API Keys List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-gray-900 font-medium mb-1">Nemate API ključeva</h3>
              <p className="text-gray-500 text-sm mb-4">
                Kreirajte API ključ za programatski pristup KPD klasifikatoru
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="kpd-btn kpd-btn--primary"
              >
                <Plus className="w-4 h-4" />
                Kreiraj prvi ključ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      {!apiKey.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          Neaktivan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <code className="font-mono">{apiKey.keyPrefix}...</code>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Kreirano: {formatDate(apiKey.createdAt)}
                      </span>
                      {apiKey.lastUsedAt && (
                        <span>Zadnje korišteno: {formatDate(apiKey.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(apiKey.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Obriši ključ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Documentation */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Kako koristiti API</h2>
            <p className="kpd-text-small">Primjeri korištenja API ključa</p>
          </div>
        </div>

        <div className="kpd-settings-card__body">
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono">
{`# Klasifikacija KPD koda
curl -X POST https://kpd.2klika.hr/api/v1/kpd/classify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "razvoj web aplikacija"}'

# Odgovor
{
  "success": true,
  "data": {
    "code": "62.01",
    "name": "Računalno programiranje",
    "confidence": 0.95
  }
}`}
            </pre>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Sigurnosne napomene:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nikad ne dijelite svoj API ključ javno</li>
                  <li>Koristite environment varijable za pohranu ključeva</li>
                  <li>Rotirajte ključeve periodički</li>
                  <li>Obrišite ključeve koje više ne koristite</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

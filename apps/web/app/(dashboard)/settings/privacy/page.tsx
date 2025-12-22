'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Shield,
  FileDown,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Bell,
  BellOff,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Consent {
  id: string;
  consentType: string;
  granted: boolean;
  version: string;
  grantedAt: string;
  revokedAt: string | null;
}

interface GdprRequest {
  id: string;
  requestType: 'DATA_EXPORT' | 'DATA_DELETION';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  notes?: string;
  exportUrl?: string;
  exportExpiresAt?: string;
  createdAt: string;
  processedAt?: string;
}

export default function PrivacySettingsPage() {
  const { token } = useAuth();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exportNotes, setExportNotes] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Fetch consents and requests
  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [consentsRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE}/gdpr/consents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/gdpr/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (consentsRes.ok) {
        const consentsData = await consentsRes.json();
        setConsents(consentsData);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Failed to fetch GDPR data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle marketing consent
  const toggleMarketingConsent = async () => {
    if (!token) return;

    const currentMarketing = consents.find(
      (c) => c.consentType === 'MARKETING_EMAILS' && !c.revokedAt
    );
    const newGranted = !currentMarketing?.granted;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/gdpr/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consentType: 'MARKETING_EMAILS',
          granted: newGranted,
        }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: newGranted
            ? 'Pretplatili ste se na marketinske obavijesti'
            : 'Odjavili ste se s marketinskih obavijesti',
        });
        await fetchData();
      } else {
        throw new Error('Greska pri promjeni postavki');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greska',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request data export
  const requestDataExport = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/gdpr/requests/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: exportNotes }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Zahtjev za izvoz podataka je poslan. Obavijestit cemo vas emailom kada bude spreman.',
        });
        setShowExportModal(false);
        setExportNotes('');
        await fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greska pri slanju zahtjeva');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greska',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request data deletion
  const requestDataDeletion = async () => {
    if (!token || !deleteReason.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/gdpr/requests/deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: deleteReason }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Zahtjev za brisanje racuna je poslan. Kontaktirat cemo vas radi potvrde.',
        });
        setShowDeleteModal(false);
        setDeleteReason('');
        await fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greska pri slanju zahtjeva');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greska',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel a pending request
  const cancelRequest = async (requestId: string) => {
    if (!token) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/gdpr/requests/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Zahtjev je otkazan' });
        await fetchData();
      } else {
        throw new Error('Greska pri otkazivanju zahtjeva');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greska',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current marketing consent status
  const marketingConsent = consents.find(
    (c) => c.consentType === 'MARKETING_EMAILS' && !c.revokedAt
  );
  const isMarketingEnabled = marketingConsent?.granted ?? false;

  // Check for pending requests
  const hasPendingExport = requests.some(
    (r) => r.requestType === 'DATA_EXPORT' && ['PENDING', 'PROCESSING'].includes(r.status)
  );
  const hasPendingDeletion = requests.some(
    (r) => r.requestType === 'DATA_DELETION' && ['PENDING', 'PROCESSING'].includes(r.status)
  );

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge class
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Na cekanju';
      case 'PROCESSING':
        return 'U obradi';
      case 'COMPLETED':
        return 'Zavrseno';
      case 'CANCELLED':
        return 'Otkazano';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`kpd-alert kpd-alert--${message.type}`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Privacy Overview */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Privatnost i GDPR</h2>
            <p className="kpd-text-small">
              Upravljajte svojim privolama i pravima prema GDPR regulativi
            </p>
          </div>
        </div>

        <div className="kpd-settings-card__body space-y-6">
          {/* Marketing Consent Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isMarketingEnabled ? (
                <Bell className="w-5 h-5 text-primary-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h4 className="font-medium text-gray-900">Marketinske obavijesti</h4>
                <p className="text-sm text-gray-500">
                  Primajte novosti o novim znacajkama i ponudama
                </p>
              </div>
            </div>
            <button
              onClick={toggleMarketingConsent}
              disabled={isSubmitting}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${isMarketingEnabled ? 'bg-primary-600' : 'bg-gray-300'}
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                  transition-transform duration-200
                  ${isMarketingEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Current Consents */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Vase privole</h4>
            <div className="space-y-2">
              {consents
                .filter((c) => !c.revokedAt)
                .map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {consent.consentType === 'TERMS_OF_SERVICE' && 'Uvjeti koristenja'}
                        {consent.consentType === 'PRIVACY_POLICY' && 'Politika privatnosti'}
                        {consent.consentType === 'MARKETING_EMAILS' && 'Marketinske obavijesti'}
                      </span>
                      {consent.granted === false && (
                        <span className="text-xs text-gray-400">(odbijeno)</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(consent.grantedAt)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Rights */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Vasa prava nad podacima</h2>
            <p className="kpd-text-small">
              Preuzmite ili zatrazite brisanje svojih podataka
            </p>
          </div>
        </div>

        <div className="kpd-settings-card__body space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Izvoz podataka</h4>
              <p className="text-sm text-gray-500">
                Preuzmite kopiju svih svojih podataka (Clanak 15 GDPR)
              </p>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={hasPendingExport || isSubmitting}
              className="kpd-btn kpd-btn--secondary"
            >
              {hasPendingExport ? (
                <>
                  <Clock className="w-4 h-4" />
                  U tijeku...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Zatrazi izvoz
                </>
              )}
            </button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Brisanje racuna</h4>
              <p className="text-sm text-gray-500">
                Trajno obrisite svoj racun i sve podatke (Clanak 17 GDPR)
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={hasPendingDeletion || isSubmitting}
              className="kpd-btn kpd-btn--danger"
            >
              {hasPendingDeletion ? (
                <>
                  <Clock className="w-4 h-4" />
                  U tijeku...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Zatrazi brisanje
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__header">
            <div className="kpd-settings-card__icon">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="kpd-heading-3">Povijest zahtjeva</h2>
              <p className="kpd-text-small">
                Pregled vasih GDPR zahtjeva
              </p>
            </div>
          </div>

          <div className="kpd-settings-card__body">
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {request.requestType === 'DATA_EXPORT' ? (
                      <FileDown className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.requestType === 'DATA_EXPORT'
                          ? 'Izvoz podataka'
                          : 'Brisanje racuna'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        request.status
                      )}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                    {request.status === 'PENDING' && (
                      <button
                        onClick={() => cancelRequest(request.id)}
                        disabled={isSubmitting}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Otkazi zahtjev"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {request.status === 'COMPLETED' && request.exportUrl && (
                      <a
                        href={request.exportUrl}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preuzmi
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Zatrazi izvoz podataka
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Pripremit cemo ZIP datoteku sa svim vasim podacima. Obavijestit cemo vas emailom
              kada bude spremna za preuzimanje (obicno unutar 24 sata).
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Napomena (opcionalno)
              </label>
              <textarea
                value={exportNotes}
                onChange={(e) => setExportNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Dodajte napomenu ako imate posebne zahtjeve..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="kpd-btn kpd-btn--secondary"
                disabled={isSubmitting}
              >
                Odustani
              </button>
              <button
                onClick={requestDataExport}
                className="kpd-btn kpd-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Posalji zahtjev
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Brisanje racuna
              </h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>Upozorenje:</strong> Ova radnja je nepovratna. Svi vasi podaci,
                upiti, postavke i organizacije bit ce trajno obrisani.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razlog brisanja <span className="text-red-500">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="Molimo navedite razlog zasto zelite obrisati svoj racun..."
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="kpd-btn kpd-btn--secondary"
                disabled={isSubmitting}
              >
                Odustani
              </button>
              <button
                onClick={requestDataDeletion}
                className="kpd-btn kpd-btn--danger"
                disabled={isSubmitting || !deleteReason.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Zatrazi brisanje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  Shield,
  Search,
  Filter,
  User,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface GdprRequest {
  id: string;
  userId: string;
  requestType: 'DATA_EXPORT' | 'DATA_DELETION';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  processedAt: string | null;
  processedById: string | null;
  notes: string | null;
  reason: string | null;
  exportUrl: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  processedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface ConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  version: string;
  granted: boolean;
  grantedAt: string;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

type Tab = 'requests' | 'consents';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function AdminGdprPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('requests');

  // Requests state
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [requestTotalPages, setRequestTotalPages] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);

  // Consents state
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [consentTypeFilter, setConsentTypeFilter] = useState('');
  const [consentSearch, setConsentSearch] = useState('');
  const [consentPage, setConsentPage] = useState(1);
  const [consentTotalPages, setConsentTotalPages] = useState(1);
  const [consentTotal, setConsentTotal] = useState(0);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<GdprRequest | null>(null);
  const [processNotes, setProcessNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      setRequestsLoading(true);
      const params = new URLSearchParams({
        page: requestPage.toString(),
        limit: '20',
        ...(requestTypeFilter && { requestType: requestTypeFilter }),
        ...(requestStatusFilter && { status: requestStatusFilter }),
      });

      const res = await fetch(`${API_BASE}/gdpr/admin/requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const response = await res.json();
        setRequests(response.data || []);
        setRequestTotal(response.meta?.total || 0);
        setRequestTotalPages(response.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching GDPR requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  }, [token, requestPage, requestTypeFilter, requestStatusFilter]);

  // Fetch consents
  const fetchConsents = useCallback(async () => {
    if (!token) return;
    try {
      setConsentsLoading(true);
      const params = new URLSearchParams({
        page: consentPage.toString(),
        limit: '50',
        ...(consentTypeFilter && { consentType: consentTypeFilter }),
        ...(consentSearch && { userId: consentSearch }),
      });

      const res = await fetch(`${API_BASE}/gdpr/admin/consents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const response = await res.json();
        setConsents(response.data || []);
        setConsentTotal(response.meta?.total || 0);
        setConsentTotalPages(response.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching consent records:', error);
    } finally {
      setConsentsLoading(false);
    }
  }, [token, consentPage, consentTypeFilter, consentSearch]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (activeTab === 'consents') {
      fetchConsents();
    }
  }, [activeTab, fetchConsents]);

  // Process request (approve/reject)
  const processRequest = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !token) return;

    try {
      setProcessing(true);
      const res = await fetch(`${API_BASE}/gdpr/admin/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          notes: processNotes || undefined,
        }),
      });

      if (res.ok) {
        setSelectedRequest(null);
        setProcessNotes('');
        fetchRequests();
      } else {
        const error = await res.json();
        alert(`Greška: ${error.message || 'Nepoznata greška'}`);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Greška pri obradi zahtjeva');
    } finally {
      setProcessing(false);
    }
  };

  // Export consents to CSV
  const exportConsentsCSV = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/gdpr/admin/consents/export`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdpr-consents-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting consents:', error);
      alert('Greška pri izvozu podataka');
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <CheckCircle className="w-3 h-3" /> },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
    };
    return badges[status] || badges.PENDING;
  };

  // Type badge helper
  const getTypeBadge = (requestType: string) => {
    if (requestType === 'DATA_EXPORT') {
      return { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Download className="w-3 h-3" />, label: 'Izvoz podataka' };
    }
    return { bg: 'bg-red-100', text: 'text-red-800', icon: <Trash2 className="w-3 h-3" />, label: 'Brisanje računa' };
  };

  // Format status
  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Na čekanju',
      PROCESSING: 'U obradi',
      COMPLETED: 'Završeno',
      REJECTED: 'Odbijeno',
      CANCELLED: 'Otkazano',
    };
    return labels[status] || status;
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary-600" />
              GDPR Upravljanje
            </h1>
            <p className="text-gray-500 mt-1">Upravljanje korisničkim zahtjevima i evidencija privola</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'requests'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Zahtjevi ({requestTotal})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('consents')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'consents'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Privole ({consentTotal})
              </span>
            </button>
          </nav>
        </div>

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={requestTypeFilter}
                    onChange={(e) => {
                      setRequestTypeFilter(e.target.value);
                      setRequestPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                  >
                    <option value="">Svi tipovi</option>
                    <option value="DATA_EXPORT">Izvoz podataka</option>
                    <option value="DATA_DELETION">Brisanje računa</option>
                  </select>
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => {
                      setRequestStatusFilter(e.target.value);
                      setRequestPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                  >
                    <option value="">Svi statusi</option>
                    <option value="PENDING">Na čekanju</option>
                    <option value="APPROVED">Odobreno</option>
                    <option value="COMPLETED">Završeno</option>
                    <option value="REJECTED">Odbijeno</option>
                  </select>
                </div>

                <button
                  onClick={fetchRequests}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Osvježi
                </button>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {requestsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Korisnik</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip zahtjeva</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zatraženo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obrađeno</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requests.map((req) => {
                        const statusBadge = getStatusBadge(req.status);
                        const typeBadge = getTypeBadge(req.requestType);
                        return (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {req.user?.firstName} {req.user?.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">{req.user?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadge.bg} ${typeBadge.text}`}>
                                {typeBadge.icon}
                                {typeBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.icon}
                                {formatStatus(req.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(req.createdAt).toLocaleString('hr-HR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.processedAt ? new Date(req.processedAt).toLocaleString('hr-HR') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {req.status === 'PENDING' ? (
                                <button
                                  onClick={() => setSelectedRequest(req)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Obradi
                                </button>
                              ) : (
                                <span className="text-sm text-gray-400">Obrađeno</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {requests.length === 0 && !requestsLoading && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Nema GDPR zahtjeva za prikazati
                </div>
              )}

              {/* Pagination */}
              {requestTotalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Stranica {requestPage} od {requestTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                      disabled={requestPage === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Prethodna
                    </button>
                    <button
                      onClick={() => setRequestPage((p) => Math.min(requestTotalPages, p + 1))}
                      disabled={requestPage === requestTotalPages}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Sljedeća
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Consents Tab */}
        {activeTab === 'consents' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pretraži po emailu..."
                    value={consentSearch}
                    onChange={(e) => {
                      setConsentSearch(e.target.value);
                      setConsentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={consentTypeFilter}
                    onChange={(e) => {
                      setConsentTypeFilter(e.target.value);
                      setConsentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                  >
                    <option value="">Svi tipovi</option>
                    <option value="TERMS_OF_SERVICE">Uvjeti korištenja</option>
                    <option value="PRIVACY_POLICY">Politika privatnosti</option>
                    <option value="MARKETING_EMAILS">Marketing emailovi</option>
                    <option value="ANALYTICS_COOKIES">Analitički kolačići</option>
                    <option value="MARKETING_COOKIES">Marketing kolačići</option>
                  </select>
                </div>

                <button
                  onClick={exportConsentsCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Izvezi CSV
                </button>

                <button
                  onClick={fetchConsents}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Osvježi
                </button>
              </div>
            </div>

            {/* Consents Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {consentsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Korisnik</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip privole</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verzija</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP adresa</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {consents.map((consent) => (
                        <tr key={consent.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {consent.user?.firstName} {consent.user?.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{consent.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {consent.consentType.replace(/_/g, ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {consent.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {consent.granted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Prihvaćeno
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" />
                                Odbijeno
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {consent.ipAddress || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(consent.grantedAt).toLocaleString('hr-HR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {consents.length === 0 && !consentsLoading && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Nema evidencija privola za prikazati
                </div>
              )}

              {/* Pagination */}
              {consentTotalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Stranica {consentPage} od {consentTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConsentPage((p) => Math.max(1, p - 1))}
                      disabled={consentPage === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Prethodna
                    </button>
                    <button
                      onClick={() => setConsentPage((p) => Math.min(consentTotalPages, p + 1))}
                      disabled={consentPage === consentTotalPages}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >
                      Sljedeća
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Process Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Obrada GDPR zahtjeva</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Korisnik</label>
                <p className="text-gray-900">
                  {selectedRequest.user?.firstName} {selectedRequest.user?.lastName} ({selectedRequest.user?.email})
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Tip zahtjeva</label>
                <p className="text-gray-900">
                  {selectedRequest.requestType === 'DATA_EXPORT' ? 'Izvoz podataka (GDPR čl. 15)' : 'Brisanje računa (GDPR čl. 17)'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Zatraženo</label>
                <p className="text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString('hr-HR')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">Napomena (opcionalno)</label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Unesite napomenu..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setProcessNotes('');
                }}
                disabled={processing}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Odustani
              </button>
              <button
                onClick={() => processRequest('reject')}
                disabled={processing}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Odbij
              </button>
              <button
                onClick={() => processRequest('approve')}
                disabled={processing}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Odobri
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

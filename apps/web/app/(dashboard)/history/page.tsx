'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  History,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface QueryHistoryItem {
  id: string;
  inputText: string;
  selectedCode: string | null;
  selectedCodeName: string | null;
  confidence: number | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [queries, setQueries] = useState<QueryHistoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory(1);
  }, [token]);

  const fetchHistory = async (page: number) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE}/queries?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQueries(data.data.items || []);
          setPagination(data.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchHistory(newPage);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfidenceClass = (confidence: number) => {
    const pct = confidence * 100;
    if (pct >= 80) return 'kpd-badge--success';
    if (pct >= 60) return 'kpd-badge--warning';
    return 'kpd-badge--error';
  };

  const handleExportCsv = async () => {
    if (!token || pagination.total === 0) return;

    setIsExporting(true);
    try {
      // Fetch all items for export (up to 1000)
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE}/queries?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.items?.length > 0) {
          const items: QueryHistoryItem[] = data.data.items;

          // Build CSV content
          const headers = ['Datum', 'Upit', 'KPD Šifra', 'Naziv šifre', 'Pouzdanost (%)'];
          const csvRows = [
            headers.join(';'),
            ...items.map((item) => {
              const date = new Date(item.createdAt).toLocaleDateString('hr-HR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              // Escape quotes and wrap in quotes for CSV safety
              const escapeCsv = (val: string | null) => {
                if (!val) return '';
                return `"${val.replace(/"/g, '""')}"`;
              };
              return [
                escapeCsv(date),
                escapeCsv(item.inputText),
                item.selectedCode || '',
                escapeCsv(item.selectedCodeName),
                item.confidence ? Math.round(item.confidence * 100).toString() : '0',
              ].join(';');
            }),
          ];

          const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);

          // Create download link
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `kpd-povijest-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Placeholder data for when API is not ready
  const displayQueries = queries.length > 0 ? queries : [];

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__body">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pretraži povijest..."
                  className="kpd-auth-form__input pl-10"
                />
              </div>
            </div>
            <button type="submit" className="kpd-btn kpd-btn--primary">
              <Search className="w-4 h-4" />
              Pretraži
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || pagination.total === 0}
              className="kpd-btn kpd-btn--secondary"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? 'Eksportiranje...' : 'Export CSV'}
            </button>
          </form>
        </div>
      </div>

      {/* History Table */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Povijest klasifikacija</h2>
            <p className="kpd-text-small">
              {pagination.total > 0
                ? `Ukupno ${pagination.total} upita`
                : 'Nema prethodnih upita'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="kpd-settings-card__body">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            </div>
          ) : displayQueries.length === 0 ? (
            <div className="kpd-settings-card__body">
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="kpd-text-body">Nemate prethodnih klasifikacija.</p>
                <p className="kpd-text-small">
                  Krenite s prvom klasifikacijom na{' '}
                  <a href="/classify" className="kpd-auth-card__footer-link">
                    AI Klasifikatoru
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Upit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    KPD Šifra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pouzdanost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayQueries.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="kpd-text-small">{formatDate(item.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="kpd-text-body line-clamp-2 max-w-xs">
                        {item.inputText}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono font-semibold text-gray-900">
                          {item.selectedCode || '-'}
                        </span>
                        <p className="kpd-text-small line-clamp-1 max-w-[200px]">
                          {item.selectedCodeName || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`kpd-badge ${getConfidenceClass(item.confidence || 0)}`}>
                        {item.confidence ? Math.round(item.confidence * 100) : 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => item.selectedCode && copyToClipboard(item.selectedCode)}
                        className="kpd-btn kpd-btn--ghost kpd-btn--sm"
                        title="Kopiraj šifru"
                        disabled={!item.selectedCode}
                      >
                        {copiedCode === item.selectedCode ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="kpd-settings-card__footer">
            <div className="flex items-center justify-between w-full">
              <span className="kpd-text-small">
                Stranica {pagination.page} od {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="kpd-btn kpd-btn--ghost kpd-btn--sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prethodna
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="kpd-btn kpd-btn--ghost kpd-btn--sm"
                >
                  Sljedeća
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

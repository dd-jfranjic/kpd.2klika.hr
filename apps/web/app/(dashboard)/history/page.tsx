'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  History,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Eye,
  X,
  CheckCircle2,
  Sparkles,
  Crown,
  AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface SuggestedCode {
  code: string;
  name: string | null;
}

interface SuggestionData {
  code: string;
  name: string;
  confidence: number;
  reason: string | null;
  sector: string | null;
  level?: number;
  isFinal?: boolean;
}

interface QueryHistoryItem {
  id: string;
  inputText: string;
  suggestedCodes: string[];
  suggestedCodesWithNames: SuggestedCode[];
  selectedCode: string | null;
  selectedCodeName: string | null;
  confidence: number | null;
  aiModel: string | null;
  latencyMs: number | null;
  cached: boolean;
  createdAt: string;
  explanation: string | null;
  sector: string | null;
  suggestionsData: SuggestionData[] | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Portal Tooltip Component - renders outside overflow:hidden containers
function PortalTooltip({
  children,
  content,
  visible
}: {
  children: React.ReactNode;
  content: string;
  visible: boolean;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + (rect.width / 2),
      });
    }
  }, [visible]);

  return (
    <div ref={triggerRef}>
      {children}
      {mounted && visible && createPortal(
        <div
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
            zIndex: 99999,
          }}
          className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
        >
          {content}
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid rgb(17, 24, 39)',
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
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
  const [selectedQuery, setSelectedQuery] = useState<QueryHistoryItem | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportTooltip, setShowExportTooltip] = useState(false);

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
    setExportError(null);

    try {
      // Use backend export endpoint (handles PRO+ restriction)
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE}/queries/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        const data = await response.json();
        setExportError(data.message || 'CSV izvoz je dostupan samo za KPD Pro i više planove.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.content) {
          const csvContent = '\uFEFF' + data.data.content; // BOM for Excel UTF-8
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);

          // Create download link
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', data.data.filename || `kpd-povijest-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      setExportError('Greška pri izvozu CSV datoteke.');
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
            <PortalTooltip
              content="Dostupno za PRO, Business i Enterprise planove"
              visible={showExportTooltip}
            >
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting || pagination.total === 0}
                className="kpd-btn kpd-btn--secondary"
                onMouseEnter={() => setShowExportTooltip(true)}
                onMouseLeave={() => setShowExportTooltip(false)}
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <Crown className="w-3 h-3 text-yellow-500" />
                  </>
                )}
                {isExporting ? 'Eksportiranje...' : 'Export CSV'}
              </button>
            </PortalTooltip>
          </form>
          {/* Export error message */}
          {exportError && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">{exportError}</p>
                <a href="/settings/billing" className="text-sm text-amber-700 hover:text-amber-900 underline mt-1 inline-block">
                  Nadogradite plan →
                </a>
              </div>
              <button
                onClick={() => setExportError(null)}
                className="p-1 hover:bg-amber-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}
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
                    Ponuđene
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
                      <span className="kpd-badge kpd-badge--muted">
                        {item.suggestedCodesWithNames?.length || item.suggestedCodes?.length || 0} šifri
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`kpd-badge ${getConfidenceClass(item.confidence || 0)}`}>
                        {item.confidence ? Math.round(item.confidence * 100) : 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedQuery(item)}
                          className="kpd-btn kpd-btn--ghost kpd-btn--sm"
                          title="Pogledaj detalje"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                      </div>
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

      {/* Query Details Modal */}
      {selectedQuery && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedQuery(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Detalji klasifikacije</h3>
                  <p className="text-sm text-gray-500">{formatDate(selectedQuery.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
              {/* Original Query */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upit</label>
                <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedQuery.inputText}</p>
              </div>

              {/* Selected Code */}
              {selectedQuery.selectedCode && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Odabrana šifra</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-lg font-bold text-green-800">{selectedQuery.selectedCode}</span>
                      <p className="text-sm text-green-700 mt-1">{selectedQuery.selectedCodeName}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedQuery.selectedCode!)}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      title="Kopiraj"
                    >
                      {copiedCode === selectedQuery.selectedCode ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-green-600" />
                      )}
                    </button>
                  </div>
                  {selectedQuery.confidence && (
                    <div className="mt-2">
                      <span className={`kpd-badge ${getConfidenceClass(selectedQuery.confidence)}`}>
                        Pouzdanost: {Math.round(selectedQuery.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Explanation */}
              {selectedQuery.explanation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">AI objašnjenje</span>
                  </div>
                  <p className="text-sm text-blue-800 leading-relaxed">{selectedQuery.explanation}</p>
                  {selectedQuery.sector && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <span className="text-xs font-semibold text-blue-600">Sektor: </span>
                      <span className="text-sm text-blue-800">{selectedQuery.sector}</span>
                    </div>
                  )}
                </div>
              )}

              {/* All Suggested Codes with Full AI Response */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Sve ponuđene šifre ({selectedQuery.suggestionsData?.length || selectedQuery.suggestedCodesWithNames?.length || selectedQuery.suggestedCodes?.length || 0})
                </label>
                <div className="mt-3 space-y-3">
                  {/* Use suggestionsData if available (new format with full AI response) */}
                  {selectedQuery.suggestionsData && selectedQuery.suggestionsData.length > 0 ? (
                    selectedQuery.suggestionsData.map((suggestion, index) => {
                      const isSelected = suggestion.code === selectedQuery.selectedCode;
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <span className={`font-mono font-semibold text-sm px-2 py-1 rounded ${
                                  isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {suggestion.code}
                                </span>
                                {/* Show confidence for each code */}
                                {suggestion.confidence > 0 && (
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    isSelected
                                      ? 'text-green-600 bg-green-100'
                                      : 'text-gray-500 bg-gray-200'
                                  }`}>
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                {/* Code name */}
                                <p className={`text-sm font-medium leading-relaxed ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                                  {suggestion.name || 'Naziv nije dostupan'}
                                </p>
                                {/* AI Reason - the key part! */}
                                {suggestion.reason && (
                                  <div className={`text-sm leading-relaxed p-2 rounded ${
                                    isSelected ? 'bg-green-100/50 text-green-700' : 'bg-white text-gray-600'
                                  }`}>
                                    {suggestion.reason}
                                  </div>
                                )}
                                {/* Sector */}
                                {suggestion.sector && (
                                  <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                                    <span className="font-semibold">Sektor:</span> {suggestion.sector}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <button
                              onClick={() => copyToClipboard(suggestion.code)}
                              className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                                isSelected ? 'hover:bg-green-100' : 'hover:bg-gray-200'
                              }`}
                              title="Kopiraj šifru"
                            >
                              {copiedCode === suggestion.code ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback to old format for backward compatibility */
                    (selectedQuery.suggestedCodesWithNames?.length > 0 ? selectedQuery.suggestedCodesWithNames : selectedQuery.suggestedCodes?.map(c => ({ code: c, name: null })) || []).map((suggestion, index) => {
                      const isSelected = suggestion.code === selectedQuery.selectedCode;
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <span className={`font-mono font-semibold text-sm px-2 py-1 rounded ${
                                  isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {suggestion.code}
                                </span>
                                {isSelected && selectedQuery.confidence ? (
                                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                    {Math.round(selectedQuery.confidence * 100)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    #{index + 1}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm leading-relaxed ${isSelected ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                                  {suggestion.name || 'Naziv nije dostupan'}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <button
                              onClick={() => copyToClipboard(suggestion.code)}
                              className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                                isSelected ? 'hover:bg-green-100' : 'hover:bg-gray-200'
                              }`}
                              title="Kopiraj šifru"
                            >
                              {copiedCode === suggestion.code ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Meta Info */}
              {(selectedQuery.aiModel || selectedQuery.latencyMs) && (
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-4 border-t">
                  {selectedQuery.aiModel && (
                    <span>Model: <span className="font-medium">{selectedQuery.aiModel}</span></span>
                  )}
                  {selectedQuery.latencyMs && (
                    <span>Vrijeme: <span className="font-medium">{selectedQuery.latencyMs}ms</span></span>
                  )}
                  {selectedQuery.cached && (
                    <span className="text-blue-600">● Keširan rezultat</span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedQuery(null)}
                className="kpd-btn kpd-btn--secondary"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

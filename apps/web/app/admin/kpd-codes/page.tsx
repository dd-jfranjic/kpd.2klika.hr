'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Search, BookOpen, Edit2, X, Check } from 'lucide-react';

interface KpdCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  parentCode: string | null;
}

export default function AdminKpdCodesPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<KpdCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchCodes();
  }, [page, search, token]);

  const fetchCodes = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
      });

      const res = await fetch(`/api/v1/admin/kpd-codes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setCodes(data.data.codes || []);
        setTotal(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code: KpdCode) => {
    setEditingId(code.id);
    setEditValue(code.description || '');
  };

  const handleSave = async (codeId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/admin/kpd-codes/${codeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ description: editValue }),
      });

      if (res.ok) {
        fetchCodes();
      }
    } catch (error) {
      console.error('Error updating code:', error);
    }
    setEditingId(null);
    setEditValue('');
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-blue-100 text-blue-800';
      case 2:
        return 'bg-green-100 text-green-800';
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case 4:
        return 'bg-orange-100 text-orange-800';
      case 5:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            <h1 className="text-2xl font-bold text-gray-900">KPD Šifrarnik</h1>
            <p className="text-gray-500 mt-1">Pregled i uređivanje KPD kodova ({total} ukupno)</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po kodu ili nazivu..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Codes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naziv</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razina</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary-600" />
                          <span className="font-mono font-medium text-gray-900">{code.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">{code.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(code.level)}`}>
                          Razina {code.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === code.id ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Unesite opis..."
                          />
                        ) : (
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {code.description || '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {editingId === code.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(code.id)}
                              className="p-1 rounded hover:bg-green-100 text-green-600"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditValue('');
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-600"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(code)}
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <Edit2 className="w-5 h-5 text-gray-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Stranica {page} od {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Prethodna
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  Sljedeća
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

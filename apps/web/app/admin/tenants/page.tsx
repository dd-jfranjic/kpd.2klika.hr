'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Search, Building2, Users, CreditCard, MoreVertical } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: string;
  memberCount: number;
  monthlyUsage: number;
  monthlyLimit: number;
  status: string;
}

export default function AdminTenantsPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionTenantId, setActionTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchTenants();
  }, [page, search, token]);

  const fetchTenants = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const res = await fetch(`/api/v1/admin/tenants?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setTenants(data.data.tenants || []);
        const totalCount = data.data.totalTenants || 0;
        setTotal(totalCount);
        setTotalPages(Math.ceil(totalCount / 20) || 1);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (tenantId: string, plan: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        fetchTenants();
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
    }
    setActionTenantId(null);
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'BASIC':
        return 'bg-green-100 text-green-800';
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
            <h1 className="text-2xl font-bold text-gray-900">Tvrtke / Tenanti</h1>
            <p className="text-gray-500 mt-1">Upravljanje organizacijama ({total} ukupno)</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po nazivu..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Tenants Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Članovi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upiti</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kreirana</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">{tenant.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeClass(tenant.plan || 'FREE')}`}>
                          <CreditCard className="w-3 h-3" />
                          {tenant.plan || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          {tenant.memberCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tenant.monthlyUsage || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString('hr-HR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionTenantId(actionTenantId === tenant.id ? null : tenant.id)}
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>

                          {actionTenantId === tenant.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Promijeni plan</p>
                                {['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map((planOption) => (
                                  <button
                                    key={planOption}
                                    onClick={() => handlePlanChange(tenant.id, planOption)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                      tenant.plan === planOption ? 'text-primary-600 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {planOption}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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

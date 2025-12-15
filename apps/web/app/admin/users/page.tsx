'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  Eye,
  UserCog,
  CreditCard,
  Download,
  Mail,
  Filter,
  Trash2,
} from 'lucide-react';
import { PlanBadge, StatusIndicator, UsageProgressBar } from '@/components/admin';

interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  organizationRole?: string | null; // OWNER, ADMIN, or MEMBER
  suspended?: boolean;
  createdAt: string;
  lastLogin: string | null;
  organization?: string | null;
  organizationId?: string | null;
  plan?: string;
  currentUsage?: number;
  monthlyLimit?: number;
  _count?: {
    queries: number;
  };
}

type TabType = 'all' | 'active' | 'suspended' | 'near_limit';

function AdminUsersPageContent() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [, setShowBulkActions] = useState(false);

  // Filters
  const [planFilter, setPlanFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'near_limit') {
      setActiveTab('near_limit');
    }
  }, [searchParams]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [page, search, token, activeTab, planFilter]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(activeTab === 'suspended' && { suspended: 'true' }),
        ...(activeTab === 'active' && { suspended: 'false' }),
        ...(activeTab === 'near_limit' && { nearLimit: 'true' }),
        ...(planFilter && { plan: planFilter }),
      });

      const res = await fetch(`/api/v1/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.data.users || []);
        setTotal(data.data.pagination?.total || 0);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ suspended: suspend }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
    setActionUserId(null);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
    setActionUserId(null);
  };

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  }, [users, selectedUsers]);

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkSuspend = async (suspend: boolean) => {
    if (!token || selectedUsers.size === 0) return;

    const confirmed = confirm(`${suspend ? 'Suspendirati' : 'Aktivirati'} ${selectedUsers.size} korisnika?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedUsers).map(userId =>
          fetch(`/api/v1/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            credentials: 'include',
            body: JSON.stringify({ suspended: suspend }),
          })
        )
      );
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error) {
      console.error('Error in bulk action:', error);
    }
    setShowBulkActions(false);
  };

  const handleImpersonate = async (userId: string) => {
    if (!token) return;
    try {
      const confirmed = confirm('Jeste li sigurni da želite impersonirati ovog korisnika? Bit ćete prijavljeni kao taj korisnik.');
      if (!confirmed) {
        setActionUserId(null);
        return;
      }

      // Call API directly and store token properly
      const res = await fetch(`/api/v1/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          // Store impersonation state properly
          const impersonationState = {
            isImpersonating: true,
            originalUser: user,
            originalToken: token,
            impersonatedAt: new Date().toISOString(),
          };
          localStorage.setItem('kpd_impersonation', JSON.stringify(impersonationState));

          // Store the new token
          localStorage.setItem('kpd_auth_token', data.accessToken);
          document.cookie = `kpd_auth_token=${data.accessToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;

          // Force full page reload to dashboard
          window.location.href = '/dashboard';
        }
      } else {
        const error = await res.json();
        alert(`Greška pri impersonaciji: ${error.message || 'Nepoznata greška'}`);
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
      alert('Greška pri impersonaciji korisnika');
    }
    setActionUserId(null);
  };

  const handleChangePlan = (_userId: string, organizationId: string | null | undefined) => {
    if (!organizationId) {
      alert('Korisnik nije član nijedne organizacije');
      return;
    }
    // Redirect to organization detail page where plan can be changed
    router.push(`/admin/organizations/${organizationId}?action=change-plan`);
    setActionUserId(null);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!token) return;

    const confirmed = confirm(
      `⚠️ TRAJNO BRISANJE KORISNIKA ⚠️\n\n` +
      `Jeste li sigurni da želite trajno obrisati korisnika "${userEmail}"?\n\n` +
      `Ova akcija će:\n` +
      `• Obrisati korisnika i sve njegove podatke\n` +
      `• Obrisati organizacije gdje je jedini vlasnik\n` +
      `• Prenijeti vlasništvo organizacija ako ima drugih članova\n\n` +
      `OVA AKCIJA SE NE MOŽE PONIŠTITI!`
    );

    if (!confirmed) {
      setActionUserId(null);
      return;
    }

    // Double confirmation for safety
    const doubleConfirm = confirm(
      `Posljednja provjera!\n\nUpisite "OBRIŠI" za potvrdu brisanja korisnika:\n${userEmail}`
    );

    if (!doubleConfirm) {
      setActionUserId(null);
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `✅ Korisnik uspješno obrisan!\n\n` +
          `${data.data.message}\n` +
          `Obrisano organizacija: ${data.data.deletedOrganizations}`
        );
        fetchUsers();
      } else {
        const error = await res.json();
        alert(`❌ Greška pri brisanju: ${error.message || 'Nepoznata greška'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Greška pri brisanju korisnika');
    }
    setActionUserId(null);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'Svi' },
    { id: 'active', label: 'Aktivni' },
    { id: 'suspended', label: 'Suspendirani' },
    { id: 'near_limit', label: 'Blizu limita' },
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">Korisnici</h1>
            <p className="text-gray-500 mt-1">Upravljanje korisnicima sustava ({total} ukupno)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Export coming soon')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži po emailu ili imenu..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
                showFilters || planFilter ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filteri
              {planFilter && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Svi planovi</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PLUS">Plus</option>
                  <option value="PRO">Pro</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              {planFilter && (
                <button
                  onClick={() => setPlanFilter('')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Očisti filtere
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-700">
                {selectedUsers.size} odabrano
              </span>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Poništi odabir
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkSuspend(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
              >
                <UserX className="w-4 h-4" />
                Suspendiraj
              </button>
              <button
                onClick={() => handleBulkSuspend(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
              >
                <UserCheck className="w-4 h-4" />
                Aktiviraj
              </button>
              <button
                onClick={() => alert('Bulk email coming soon')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
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
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Korisnik</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${selectedUsers.has(u.id) ? 'bg-primary-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/users/${u.id}`} className="block hover:text-primary-600">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {u.name || u.email.split('@')[0]}
                                {u.role === 'SUPER_ADMIN' && (
                                  <span title="Super Admin"><Shield className="w-4 h-4 text-purple-500" /></span>
                                )}
                                {u.organizationRole === 'OWNER' && (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded" title="Vlasnik organizacije">Vlasnik</span>
                                )}
                                {u.organizationRole === 'ADMIN' && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded" title="Admin organizacije">Admin</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.organization ? (
                          <Link
                            href={`/admin/organizations/${u.organizationId}`}
                            className="text-sm text-primary-600 hover:text-primary-800"
                          >
                            {u.organization}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PlanBadge plan={u.plan || 'FREE'} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-40">
                        <UsageProgressBar
                          current={u.currentUsage || u._count?.queries || 0}
                          limit={u.monthlyLimit || 3}
                          size="sm"
                          showPercentage
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusIndicator status={u.suspended ? 'suspended' : 'active'} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionUserId(actionUserId === u.id ? null : u.id)}
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>

                          {actionUserId === u.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <Link
                                  href={`/admin/users/${u.id}`}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  Pogledaj detalje
                                </Link>
                                <button
                                  onClick={() => handleImpersonate(u.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-purple-700 hover:bg-purple-50"
                                >
                                  <UserCog className="w-4 h-4" />
                                  Impersonate
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleChangePlan(u.id, u.organizationId)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Promijeni plan
                                </button>
                                <hr className="my-1" />
                                {u.suspended ? (
                                  <button
                                    onClick={() => handleSuspend(u.id, false)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                    Aktiviraj
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSuspend(u.id, true)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <UserX className="w-4 h-4" />
                                    Suspendiraj
                                  </button>
                                )}
                                <hr className="my-1" />
                                {u.role !== 'SUPER_ADMIN' && (
                                  <button
                                    onClick={() => handleRoleChange(u.id, 'SUPER_ADMIN')}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                                  >
                                    <Shield className="w-4 h-4" />
                                    Postavi kao SUPER_ADMIN
                                  </button>
                                )}
                                {u.role === 'SUPER_ADMIN' && (
                                  <button
                                    onClick={() => handleRoleChange(u.id, 'MEMBER')}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Shield className="w-4 h-4" />
                                    Ukloni SUPER_ADMIN
                                  </button>
                                )}
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Obriši trajno
                                </button>
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

          {/* Empty state */}
          {!loading && users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nema korisnika za prikaz</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Stranica {page} od {totalPages} ({total} ukupno)
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    }>
      <AdminUsersPageContent />
    </Suspense>
  );
}

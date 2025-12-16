'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  Search,
  Building2,
  Users,
  MoreVertical,
  Eye,
  Download,
  Mail,
  Filter,
  UserX,
  Trash2,
} from 'lucide-react';
import { PlanBadge, StatusIndicator, UsageProgressBar } from '@/components/admin';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: string;
  status: string;
  memberCount: number;
  monthlyUsage: number;
  monthlyLimit: number;
  mrr?: number;
  owner?: {
    id: string;
    email: string;
    name: string;
  };
}

type TabType = 'all' | 'active' | 'suspended' | 'by_size';

export default function AdminOrganizationsPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionOrgId, setActionOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Bulk selection
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  // Filters
  const [planFilter, setPlanFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) fetchOrgs();
  }, [page, search, token, activeTab, planFilter]);

  const fetchOrgs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(activeTab !== 'all' && activeTab !== 'by_size' && { status: activeTab }),
      });

      // Use existing tenants endpoint
      const res = await fetch(`/api/v1/admin/tenants?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        let orgsData = data.data.tenants || [];

        // Sort by member count for "by_size" tab
        if (activeTab === 'by_size') {
          orgsData = [...orgsData].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
        }

        setOrgs(orgsData);
        const totalCount = data.data.pagination?.total || data.data.totalTenants || 0;
        setTotal(totalCount);
        setTotalPages(data.data.pagination?.totalPages || Math.ceil(totalCount / 20) || 1);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (orgId: string, plan: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/admin/tenants/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        fetchOrgs();
      }
    } catch (error) {
      console.error('Error updating organization:', error);
    }
    setActionOrgId(null);
  };

  const handleDeleteOrg = async (orgId: string, orgName: string) => {
    if (!token) return;
    const confirmed = confirm(`Jeste li sigurni da želite obrisati organizaciju "${orgName}"?\n\nOva akcija će obrisati sve podatke vezane za organizaciju uključujući:\n- Sve članove\n- Sve upite\n- Pretplatu\n\nOva akcija je NEPOVRATNA!`);
    if (!confirmed) return;

    // Double confirm for safety
    const doubleConfirm = confirm('POSLJEDNJE UPOZORENJE: Ova akcija se NE MOŽE poništiti. Želite li nastaviti?');
    if (!doubleConfirm) return;

    try {
      const res = await fetch(`/api/v1/admin/tenants/${orgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        fetchOrgs();
        setActionOrgId(null);
      } else {
        const data = await res.json();
        alert(`Greška: ${data.message || 'Nije moguće obrisati organizaciju'}`);
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Greška pri brisanju organizacije');
    }
  };

  const handleBulkSuspend = async () => {
    if (!token || selectedOrgs.size === 0) return;
    const confirmed = confirm(`Jeste li sigurni da želite suspendirati ${selectedOrgs.size} organizacija?`);
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedOrgs).map(orgId =>
        fetch(`/api/v1/admin/tenants/${orgId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          credentials: 'include',
          body: JSON.stringify({ subscriptionStatus: 'CANCELLED' }),
        })
      );

      await Promise.all(promises);
      setSelectedOrgs(new Set());
      fetchOrgs();
    } catch (error) {
      console.error('Error suspending organizations:', error);
      alert('Greška pri suspendiranju organizacija');
    }
  };

  const handleBulkEmail = () => {
    if (selectedOrgs.size === 0) return;
    // Get owner emails for selected orgs
    const ownerEmails = orgs
      .filter(org => selectedOrgs.has(org.id) && org.owner?.email)
      .map(org => org.owner!.email);

    if (ownerEmails.length === 0) {
      alert('Nijedna odabrana organizacija nema vlasnika s email adresom');
      return;
    }

    // Open email client with all owner emails
    const mailtoLink = `mailto:${ownerEmails.join(',')}?subject=KPD%20-%20Obavijest`;
    window.open(mailtoLink, '_blank');
  };

  const handleSelectAll = useCallback(() => {
    if (selectedOrgs.size === orgs.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(orgs.map(o => o.id)));
    }
  }, [orgs, selectedOrgs]);

  const handleSelectOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgs);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'Sve' },
    { id: 'active', label: 'Aktivne' },
    { id: 'suspended', label: 'Suspendirane' },
    { id: 'by_size', label: 'Po veličini' },
  ];

  // Calculate total MRR
  const totalMRR = orgs.reduce((sum, org) => sum + (org.mrr || 0), 0);

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
            <h1 className="text-2xl font-bold text-gray-900">Organizacije</h1>
            <p className="text-gray-500 mt-1">
              Upravljanje organizacijama ({total} ukupno)
              {totalMRR > 0 && (
                <span className="ml-2 text-green-600 font-medium">• MRR: €{totalMRR.toLocaleString()}</span>
              )}
            </p>
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
                placeholder="Pretraži po nazivu..."
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
        {selectedOrgs.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-700">
                {selectedOrgs.size} odabrano
              </span>
              <button
                onClick={() => setSelectedOrgs(new Set())}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Poništi odabir
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkSuspend}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
              >
                <UserX className="w-4 h-4" />
                Suspendiraj
              </button>
              <button
                onClick={handleBulkEmail}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                <Mail className="w-4 h-4" />
                Email svima
              </button>
            </div>
          </div>
        )}

        {/* Organizations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible pb-2">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedOrgs.size === orgs.length && orgs.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Članovi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orgs.map((org) => (
                    <tr key={org.id} className={`hover:bg-gray-50 ${selectedOrgs.has(org.id) ? 'bg-primary-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrgs.has(org.id)}
                          onChange={() => handleSelectOrg(org.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/organizations/${org.id}`} className="block hover:text-primary-600">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{org.name}</div>
                              <div className="text-sm text-gray-500">{org.slug}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {org.owner ? (
                          <Link
                            href={`/admin/users/${org.owner.id}`}
                            className="text-sm text-primary-600 hover:text-primary-800"
                          >
                            {org.owner.name || org.owner.email}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PlanBadge plan={org.plan || 'FREE'} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gray-400" />
                          {org.memberCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-40">
                        <UsageProgressBar
                          current={org.monthlyUsage || 0}
                          limit={org.monthlyLimit || 25}
                          size="sm"
                          showPercentage
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusIndicator status={org.status || 'active'} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActionOrgId(actionOrgId === org.id ? null : org.id)}
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>

                          {actionOrgId === org.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                              <div className="py-1">
                                <Link
                                  href={`/admin/organizations/${org.id}`}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  Pogledaj detalje
                                </Link>
                                <hr className="my-1" />
                                <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Promijeni plan</p>
                                {['FREE', 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((planOption) => (
                                  <button
                                    key={planOption}
                                    onClick={() => handlePlanChange(org.id, planOption)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                      org.plan === planOption ? 'text-primary-600 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {planOption}
                                  </button>
                                ))}
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDeleteOrg(org.id, org.name)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Obriši organizaciju
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
          {!loading && orgs.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nema organizacija za prikaz</p>
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

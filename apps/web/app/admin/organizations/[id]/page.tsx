'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  UserCog,
  UserCheck,
  UserX,
  Trash2,
  ExternalLink,
  RefreshCw,
  Edit,
  Gift,
  Crown,
  UserPlus,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { PlanBadge, StatusIndicator, UsageProgressBar } from '@/components/admin';

interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  usage?: number;
}

interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Owner
  owner?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  // Members
  members: Member[];
  memberCount: number;

  // Subscription
  subscription?: {
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    monthlyQueryLimit: number;
    totalUsage: number;
    mrr: number;
  };

  // Stats
  stats?: {
    totalQueries: number;
    queriesThisMonth: number;
    avgQueriesPerDay: number;
    activeMembers30d: number;
  };
}

export default function OrganizationDetailPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [orgData, setOrgData] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Gift modal state
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftAmount, setGiftAmount] = useState(10);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftNotificationType, setGiftNotificationType] = useState<'CLASSIC' | 'LOGIN_POPUP'>('CLASSIC');
  const [giftLoading, setGiftLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token && orgId) {
      fetchOrgDetail();
    }
  }, [token, orgId]);

  const fetchOrgDetail = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/tenants/${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setOrgData(data.data);
      } else {
        router.push('/admin/organizations');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      router.push('/admin/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (suspend: boolean) => {
    if (!token) return;
    setActionLoading('suspend');
    try {
      const res = await fetch(`/api/v1/admin/tenants/${orgId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ suspended: suspend }),
      });

      if (res.ok) {
        fetchOrgDetail();
      }
    } catch (error) {
      console.error('Error updating organization:', error);
    }
    setActionLoading(null);
  };

  const handleCopySlug = () => {
    if (orgData?.slug) {
      navigator.clipboard.writeText(orgData.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGiftQueries = async () => {
    if (!token || giftAmount <= 0) return;
    setGiftLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${orgId}/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: giftAmount,
          message: giftMessage || undefined,
          notificationType: giftNotificationType,
        }),
      });

      if (res.ok) {
        setShowGiftModal(false);
        setGiftAmount(10);
        setGiftMessage('');
        setGiftNotificationType('CLASSIC');
        fetchOrgDetail();
      } else {
        const data = await res.json();
        alert(data.message || 'Greška pri poklanjanju upita');
      }
    } catch (error) {
      console.error('Error gifting queries:', error);
      alert('Greška pri poklanjanju upita');
    }
    setGiftLoading(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-6">
                <div className="h-32 bg-gray-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!orgData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Organizacija nije pronađena</p>
          <Link href="/admin/organizations" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
            Natrag na listu
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isSuspended = !orgData.isActive;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/organizations"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary-100)' }}
              >
                <Building2 className="w-8 h-8" style={{ color: 'var(--primary-600)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{orgData.name}</h1>
                  <StatusIndicator status={isSuspended ? 'suspended' : 'active'} />
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-sm font-mono">{orgData.slug}</span>
                  <button
                    onClick={handleCopySlug}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Kopiraj slug"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Edit coming soon')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Uredi
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organization Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Detalji organizacije
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Naziv</dt>
                <dd className="text-sm font-medium text-gray-900">{orgData.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Slug</dt>
                <dd className="text-sm font-mono text-gray-600 text-xs">{orgData.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><StatusIndicator status={isSuspended ? 'suspended' : 'active'} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Broj članova</dt>
                <dd className="text-sm font-medium text-gray-900">{orgData.memberCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Kreirana</dt>
                <dd className="text-sm text-gray-900">{formatDate(orgData.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ažurirana</dt>
                <dd className="text-sm text-gray-900">{formatDate(orgData.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Owner */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Vlasnik
            </h3>
            {orgData.owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {(orgData.owner.firstName?.[0] || orgData.owner.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {orgData.owner.firstName && orgData.owner.lastName
                        ? `${orgData.owner.firstName} ${orgData.owner.lastName}`
                        : orgData.owner.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-500">{orgData.owner.email}</p>
                  </div>
                </div>
                <Link
                  href={`/admin/users/${orgData.owner.id}`}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 pt-2"
                >
                  Pogledaj profil vlasnika
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <hr className="my-3" />
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100">
                  <RefreshCw className="w-4 h-4" />
                  Prenesi vlasništvo
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Vlasnik nije definiran
              </p>
            )}
          </div>

          {/* Plan & Billing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Plan & Billing
            </h3>
            {orgData.subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <PlanBadge plan={orgData.subscription.plan} size="lg" />
                  <StatusIndicator status={orgData.subscription.status} />
                </div>
                <dl className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">MRR</dt>
                    <dd className="text-sm font-bold text-green-600">
                      €{orgData.subscription.mrr?.toLocaleString() || '0'}
                    </dd>
                  </div>
                  {orgData.subscription.stripeCustomerId && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Stripe</dt>
                      <dd className="text-xs font-mono text-gray-600">
                        {orgData.subscription.stripeCustomerId.substring(0, 18)}...
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Period</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(orgData.subscription.currentPeriodStart)} - {formatDate(orgData.subscription.currentPeriodEnd)}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                    <RefreshCw className="w-3 h-3" />
                    Promijeni plan
                  </button>
                  <button
                    onClick={() => setShowGiftModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    <Gift className="w-3 h-3" />
                    Pokloni upite
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <PlanBadge plan="FREE" size="lg" />
                <p className="text-sm text-gray-500 mt-2">Nema aktivne pretplate</p>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Korištenje (ovaj mjesec)
            </h3>
            <div className="space-y-4">
              <UsageProgressBar
                current={orgData.subscription?.totalUsage || 0}
                limit={orgData.subscription?.monthlyQueryLimit || 25}
                showPercentage
                size="lg"
              />
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {orgData.stats?.queriesThisMonth || 0}
                  </p>
                  <p className="text-xs text-gray-500">Upiti ovaj mjesec</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {orgData.stats?.avgQueriesPerDay?.toFixed(1) || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Prosječno/dan</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {orgData.stats?.totalQueries || 0}
                  </p>
                  <p className="text-xs text-gray-500">Ukupno upita</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {orgData.stats?.activeMembers30d || 0}
                  </p>
                  <p className="text-xs text-gray-500">Aktivni članovi (30d)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Admin akcije</h3>
            <div className="space-y-2">
              <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                <UserPlus className="w-4 h-4" />
                Dodaj člana
              </button>
              <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
                <Mail className="w-4 h-4" />
                Email svim članovima
              </button>
              <hr className="my-2" />
              {isSuspended ? (
                <button
                  onClick={() => handleSuspend(false)}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {actionLoading === 'suspend' ? 'Aktiviranje...' : 'Aktiviraj organizaciju'}
                </button>
              ) : (
                <button
                  onClick={() => handleSuspend(true)}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  {actionLoading === 'suspend' ? 'Suspendiranje...' : 'Suspendiraj organizaciju'}
                </button>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-6 pt-4 border-t border-red-200">
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Danger Zone</h4>
              <div className="space-y-2">
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200">
                  <Trash2 className="w-4 h-4" />
                  Obriši organizaciju
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Članovi ({orgData.memberCount})
            </h3>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100">
              <UserPlus className="w-3 h-3" />
              Dodaj člana
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Korisnik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uloga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pridružen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zadnji login</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgData.members && orgData.members.length > 0 ? (
                  orgData.members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                            {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.firstName && member.lastName
                                ? `${member.firstName} ${member.lastName}`
                                : member.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.role === 'SUPER_ADMIN' ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-purple-700">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-600">Član</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusIndicator status={member.isActive ? 'active' : 'suspended'} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(member.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/users/${member.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Pogledaj korisnika"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                            title="Impersonate"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Ukloni iz organizacije"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Organizacija nema članova
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pokloni upite</h3>
                <p className="text-sm text-gray-500">{orgData.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Broj upita
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upiti se dodaju na postojeći bonus ({orgData.subscription?.monthlyQueryLimit || 0} limit)
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poruka (opcionalno)
                </label>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Hvala na korištenju naše usluge!"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip obavijesti
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="notificationType"
                      value="CLASSIC"
                      checked={giftNotificationType === 'CLASSIC'}
                      onChange={() => setGiftNotificationType('CLASSIC')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Klasična obavijest</p>
                      <p className="text-xs text-gray-500">Prikazuje se u notification centru (zvonce)</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="notificationType"
                      value="LOGIN_POPUP"
                      checked={giftNotificationType === 'LOGIN_POPUP'}
                      onChange={() => setGiftNotificationType('LOGIN_POPUP')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Popup pri loginu</p>
                      <p className="text-xs text-gray-500">Modal koji se prikazuje jednom pri loginu</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGiftModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleGiftQueries}
                disabled={giftLoading || giftAmount <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {giftLoading ? 'Poklanjanje...' : `Pokloni ${giftAmount} upita`}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

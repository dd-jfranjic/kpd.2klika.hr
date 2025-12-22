'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Building2,
  CreditCard,
  BarChart3,
  Shield,
  UserCog,
  UserCheck,
  UserX,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  Edit,
  Gift,
  XCircle,
  X,
  Check,
} from 'lucide-react';
import { PlanBadge, StatusIndicator, UsageProgressBar } from '@/components/admin';

interface UserDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount30d?: number;

  // Organization
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: string;
    memberCount: number;
    createdAt: string;
  };

  // Subscription
  subscription?: {
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    monthlyQueryLimit: number;
    currentUsage: number;
  };

  // Stats
  stats?: {
    totalQueries: number;
    queriesThisMonth: number;
    avgQueriesPerDay: number;
    peakDay?: { date: string; count: number };
  };

  // Activity
  recentActivity?: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
  }>;
}

export default function UserDetailPage() {
  const { user, loading: authLoading, isAdmin, token, startImpersonation } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  // Modal states
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState<number>(10);
  const [creditsReason, setCreditsReason] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planReason, setPlanReason] = useState('');
  const [resetUsageOnPlanChange, setResetUsageOnPlanChange] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token && userId) {
      fetchUserDetail();
    }
  }, [token, userId]);

  const fetchUserDetail = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data.data);
      } else {
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (suspend: boolean) => {
    if (!token) return;
    setActionLoading('suspend');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ suspended: suspend }),
      });

      if (res.ok) {
        fetchUserDetail();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
    setActionLoading(null);
  };

  const handleRoleChange = async (role: string) => {
    if (!token) return;
    setActionLoading('role');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        fetchUserDetail();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
    setActionLoading(null);
  };

  const handleImpersonate = async () => {
    if (!userId) return;
    setActionLoading('impersonate');
    setImpersonateError(null);
    try {
      await startImpersonation(userId);
    } catch (error) {
      console.error('Impersonation failed:', error);
      setImpersonateError(error instanceof Error ? error.message : 'Impersonacija nije uspjela');
    }
    setActionLoading(null);
  };

  const handleAddCredits = async () => {
    if (!token || !creditsAmount || creditsAmount <= 0) {
      setModalError('Unesite valjan broj kredita');
      return;
    }
    setActionLoading('addCredits');
    setModalError(null);
    setModalSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/add-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ amount: creditsAmount, reason: creditsReason }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalSuccess(`Dodano ${creditsAmount} kredita. Novi limit: ${data.data?.newLimit || 'N/A'}`);
        setCreditsAmount(10);
        setCreditsReason('');
        fetchUserDetail();
        setTimeout(() => {
          setShowAddCreditsModal(false);
          setModalSuccess(null);
        }, 2000);
      } else {
        setModalError(data.message || 'Greška pri dodavanju kredita');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      setModalError('Greška pri dodavanju kredita');
    }
    setActionLoading(null);
  };

  const handleChangePlan = async () => {
    if (!token || !selectedPlan) {
      setModalError('Odaberite plan');
      return;
    }
    setActionLoading('changePlan');
    setModalError(null);
    setModalSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan, reason: planReason, resetUsage: resetUsageOnPlanChange }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalSuccess(`Plan promijenjen na ${selectedPlan}. Novi limit: ${data.data?.newLimit || 'N/A'}`);
        setSelectedPlan('');
        setPlanReason('');
        fetchUserDetail();
        setTimeout(() => {
          setShowChangePlanModal(false);
          setModalSuccess(null);
        }, 2000);
      } else {
        setModalError(data.message || 'Greška pri promjeni plana');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      setModalError('Greška pri promjeni plana');
    }
    setActionLoading(null);
  };

  const availablePlans = ['FREE', 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];

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

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Korisnik nije pronađen</p>
          <Link href="/admin/users" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
            Natrag na listu
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isSuspended = !userData.isActive;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/users"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                {userData.imageUrl ? (
                  <img src={userData.imageUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (userData.firstName?.[0] || userData.email[0]).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {userData.firstName && userData.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : userData.email.split('@')[0]}
                  </h1>
                  {userData.role === 'SUPER_ADMIN' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      SUPER_ADMIN
                    </span>
                  )}
                </div>
                <p className="text-gray-500 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {userData.email}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImpersonate}
              disabled={actionLoading === 'impersonate'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              <UserCog className="w-4 h-4" />
              {actionLoading === 'impersonate' ? 'Impersoniranje...' : 'Impersonate'}
            </button>
            <button
              onClick={() => alert('Edit coming soon')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Uredi
            </button>
          </div>
        </div>

        {/* Impersonation Error Alert */}
        {impersonateError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Impersonacija nije uspjela</p>
              <p className="text-sm text-red-600 mt-1">{impersonateError}</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Profil
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{userData.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><StatusIndicator status={isSuspended ? 'suspended' : 'active'} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email verificiran</dt>
                <dd className="text-sm font-medium">
                  {userData.emailVerified ? (
                    <span className="text-green-600">Da</span>
                  ) : (
                    <span className="text-red-600">Ne</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Kreiran</dt>
                <dd className="text-sm text-gray-900">{formatDate(userData.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Zadnji login</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(userData.lastLoginAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizacija
            </h3>
            {userData.organization ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{userData.organization.name}</p>
                    <p className="text-sm text-gray-500">{userData.organization.slug}</p>
                  </div>
                </div>
                <dl className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Uloga</dt>
                    <dd className="text-sm font-medium text-gray-900">{userData.organization.role}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Članovi</dt>
                    <dd className="text-sm font-medium text-gray-900">{userData.organization.memberCount}</dd>
                  </div>
                </dl>
                <Link
                  href={`/admin/organizations/${userData.organization.id}`}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 pt-2"
                >
                  Pogledaj organizaciju
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Korisnik nije član nijedne organizacije
              </p>
            )}
          </div>

          {/* Plan & Billing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Plan & Billing
            </h3>
            {userData.subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <PlanBadge plan={userData.subscription.plan} size="lg" />
                  <StatusIndicator status={userData.subscription.status} />
                </div>
                <dl className="space-y-2 pt-2 border-t">
                  {userData.subscription.stripeCustomerId && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Stripe Customer</dt>
                      <dd className="text-xs font-mono text-gray-600">
                        {userData.subscription.stripeCustomerId.substring(0, 18)}...
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Period</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(userData.subscription.currentPeriodStart)} - {formatDate(userData.subscription.currentPeriodEnd)}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      setModalError(null);
                      setModalSuccess(null);
                      setSelectedPlan(userData.subscription?.plan || 'FREE');
                      setPlanReason('');
                      setShowChangePlanModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Promijeni plan
                  </button>
                  <button
                    onClick={() => {
                      setModalError(null);
                      setModalSuccess(null);
                      setCreditsAmount(10);
                      setCreditsReason('');
                      setShowAddCreditsModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    <Gift className="w-3 h-3" />
                    Dodaj kredite
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
                current={userData.subscription?.currentUsage || 0}
                limit={userData.subscription?.monthlyQueryLimit || 25}
                showPercentage
                size="lg"
              />
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {userData.stats?.queriesThisMonth || 0}
                  </p>
                  <p className="text-xs text-gray-500">Upiti ovaj mjesec</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {userData.stats?.avgQueriesPerDay?.toFixed(1) || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Prosječno/dan</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {userData.stats?.totalQueries || 0}
                  </p>
                  <p className="text-xs text-gray-500">Ukupno upita</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Admin akcije</h3>
            <div className="space-y-2">
              <button
                onClick={handleImpersonate}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <UserCog className="w-4 h-4" />
                Impersonate korisnika
              </button>
              <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
                <Mail className="w-4 h-4" />
                Pošalji email
              </button>
              <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
                <RefreshCw className="w-4 h-4" />
                Reset lozinke
              </button>
              <hr className="my-2" />
              {isSuspended ? (
                <button
                  onClick={() => handleSuspend(false)}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {actionLoading === 'suspend' ? 'Aktiviranje...' : 'Aktiviraj korisnika'}
                </button>
              ) : (
                <button
                  onClick={() => handleSuspend(true)}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  {actionLoading === 'suspend' ? 'Suspendiranje...' : 'Suspendiraj korisnika'}
                </button>
              )}
              {userData.role !== 'SUPER_ADMIN' ? (
                <button
                  onClick={() => handleRoleChange('SUPER_ADMIN')}
                  disabled={actionLoading === 'role'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  Postavi kao SUPER_ADMIN
                </button>
              ) : (
                <button
                  onClick={() => handleRoleChange('MEMBER')}
                  disabled={actionLoading === 'role'}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  Ukloni SUPER_ADMIN
                </button>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-6 pt-4 border-t border-red-200">
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Danger Zone</h4>
              <div className="space-y-2">
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 border border-orange-200">
                  <LogOut className="w-4 h-4" />
                  Odjavi sve sesije
                </button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200">
                  <Trash2 className="w-4 h-4" />
                  Obriši korisnika
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Nedavna aktivnost</h3>
            <Link href={`/admin/audit?userId=${userId}`} className="text-xs text-primary-600 hover:text-primary-800">
              Vidi sve
            </Link>
          </div>
          {userData.recentActivity && userData.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {userData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.details}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nema nedavne aktivnosti</p>
          )}
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                Dodaj kredite
              </h3>
              <button
                onClick={() => setShowAddCreditsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Korisnik: <span className="font-medium">{userData.email}</span>
              </p>
              <p className="text-sm text-gray-600">
                Trenutni limit: <span className="font-medium">{userData.subscription?.monthlyQueryLimit || 3} upita/mjesec</span>
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="w-4 h-4" />
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <Check className="w-4 h-4" />
                {modalSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Broj kredita za dodati
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Novi limit će biti: {(userData.subscription?.monthlyQueryLimit || 3) + creditsAmount} upita/mjesec
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razlog (opcionalno)
                </label>
                <textarea
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  placeholder="npr. Kompenzacija za tehnički problem..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddCreditsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleAddCredits}
                disabled={actionLoading === 'addCredits' || creditsAmount <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'addCredits' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Dodavanje...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Dodaj {creditsAmount} kredita
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Promijeni plan
              </h3>
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Korisnik: <span className="font-medium">{userData.email}</span>
              </p>
              <p className="text-sm text-gray-600">
                Trenutni plan: <span className="font-medium">{userData.subscription?.plan || 'FREE'}</span>
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="w-4 h-4" />
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <Check className="w-4 h-4" />
                {modalSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Odaberi novi plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                        selectedPlan === plan
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      } ${userData.subscription?.plan === plan ? 'opacity-50' : ''}`}
                    >
                      {plan}
                      {userData.subscription?.plan === plan && (
                        <span className="block text-xs text-gray-500">(trenutni)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razlog (opcionalno)
                </label>
                <textarea
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="npr. Upgrade na zahtjev korisnika..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="resetUsage"
                  checked={resetUsageOnPlanChange}
                  onChange={(e) => setResetUsageOnPlanChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="resetUsage" className="text-sm text-blue-800">
                  <span className="font-medium">Resetiraj potrošnju</span>
                  <span className="block text-xs text-blue-600">Preporučeno kod nadogradnje plana - resetira brojač (povijest se čuva)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleChangePlan}
                disabled={actionLoading === 'changePlan' || !selectedPlan || selectedPlan === userData.subscription?.plan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === 'changePlan' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mijenjanje...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Promijeni plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

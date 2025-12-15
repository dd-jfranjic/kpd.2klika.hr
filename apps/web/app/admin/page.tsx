'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  Users,
  Building2,
  CreditCard,
  BarChart3,
  UserPlus,
  FileText,
  Download,
  UserCog,
  Layers,
} from 'lucide-react';
import {
  MetricsCard,
  AlertsPanel,
  RecentActivity,
  QuickActions,
  PlanBadge,
} from '@/components/admin';

interface DashboardStats {
  totalUsers: number;
  usersGrowth: number;
  totalOrgs: number;
  orgsGrowth: number;
  mrr: number;
  mrrGrowth: number;
  classificationsTotday: number;
  classificationsGrowth: number;
  planDistribution: {
    plan: string;
    count: number;
    percentage: number;
  }[];
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  link?: string;
}

interface Activity {
  id: string;
  type: 'user_created' | 'plan_upgraded' | 'payment_received' | 'org_created' | 'config_changed';
  description: string;
  timestamp: string;
  actor?: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      // Fetch stats and activity in parallel
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/v1/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch('/api/v1/admin/activity', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalUsers: statsData.data?.totalUsers || 0,
          usersGrowth: statsData.data?.newUsers7d || 0,
          totalOrgs: statsData.data?.totalOrganizations || 0,
          orgsGrowth: statsData.data?.newOrganizations7d || 0,
          mrr: statsData.data?.mrr || 0,
          mrrGrowth: statsData.data?.mrrGrowth || 0,
          classificationsTotday: statsData.data?.classificationsToday || 0,
          classificationsGrowth: statsData.data?.classificationsGrowth || 0,
          planDistribution: statsData.data?.planDistribution || [],
        });

        // Generate alerts based on stats
        const newAlerts: Alert[] = [];
        if (statsData.data?.usersNearLimit > 0) {
          newAlerts.push({
            id: 'users-near-limit',
            type: 'warning',
            title: `${statsData.data.usersNearLimit} korisnika blizu limita`,
            message: 'Korisnici koji su iskoristili 80%+ upita ovaj mjesec',
            link: '/admin/users?filter=near_limit',
          });
        }
        if (statsData.data?.unpaidInvoices > 0) {
          newAlerts.push({
            id: 'unpaid-invoices',
            type: 'error',
            title: `${statsData.data.unpaidInvoices} neplaćenih faktura`,
            message: 'Fakture koje čekaju plaćanje',
            link: '/admin/billing?tab=invoices&status=unpaid',
          });
        }
        if (statsData.data?.inactiveOrgs > 0) {
          newAlerts.push({
            id: 'inactive-orgs',
            type: 'info',
            title: `${statsData.data.inactiveOrgs} neaktivnih organizacija`,
            message: 'Organizacije bez aktivnosti zadnjih 30 dana',
            link: '/admin/organizations?filter=inactive',
          });
        }
        setAlerts(newAlerts);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        // Transform to our activity format
        const recentUsers = activityData.data?.recentUsers || [];
        const recentSubscriptions = activityData.data?.recentSubscriptions || [];

        const transformedActivities: Activity[] = [
          ...recentUsers.map((u: { id: string; email: string; createdAt: string }) => ({
            id: `user-${u.id}`,
            type: 'user_created' as const,
            description: `Novi korisnik: ${u.email}`,
            timestamp: u.createdAt,
          })),
          ...recentSubscriptions.map((s: { id: string; organizationName: string; plan: string; updatedAt: string }) => ({
            id: `sub-${s.id}`,
            type: 'plan_upgraded' as const,
            description: `${s.organizationName} → ${s.plan}`,
            timestamp: s.updatedAt,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setActivities(transformedActivities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { id: 'new-user', label: 'Novi korisnik', icon: UserPlus, href: '/admin/users?action=create', variant: 'primary' as const },
    { id: 'new-org', label: 'Nova org', icon: Building2, href: '/admin/organizations?action=create' },
    { id: 'impersonate', label: 'Impersonate', icon: UserCog, href: '/admin/users?action=impersonate' },
    { id: 'bulk-actions', label: 'Bulk akcije', icon: Layers, href: '/admin/users?bulk=true' },
    { id: 'export', label: 'Export', icon: Download, onClick: () => alert('Export coming soon') },
    { id: 'audit', label: 'Audit Log', icon: FileText, href: '/admin/audit' },
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
            <h1 className="text-2xl font-bold text-gray-900">Master Admin Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500">Pregled sustava</p>
              <PlanBadge plan="UNLIMITED" size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Osvježi
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Ukupno korisnika"
            value={stats?.totalUsers || 0}
            change={{ value: stats?.usersGrowth || 0, period: '7d' }}
            icon={Users}
            href="/admin/users"
            loading={loading}
          />
          <MetricsCard
            title="Organizacije"
            value={stats?.totalOrgs || 0}
            change={{ value: stats?.orgsGrowth || 0, period: '7d' }}
            icon={Building2}
            href="/admin/organizations"
            loading={loading}
          />
          <MetricsCard
            title="MRR"
            value={stats ? `€${stats.mrr.toLocaleString()}` : '€0'}
            change={{ value: stats?.mrrGrowth || 0, period: '7d' }}
            icon={CreditCard}
            href="/admin/billing"
            loading={loading}
          />
          <MetricsCard
            title="Klasifikacije danas"
            value={stats?.classificationsTotday || 0}
            change={{ value: stats?.classificationsGrowth || 0, period: 'vs jučer' }}
            icon={BarChart3}
            href="/admin/analytics"
            loading={loading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts & Quick Actions */}
          <div className="space-y-6">
            <AlertsPanel alerts={alerts} loading={loading} />
            <QuickActions actions={quickActions} columns={2} />
          </div>

          {/* Center Column - Activity */}
          <div className="lg:col-span-1">
            <RecentActivity
              activities={activities}
              loading={loading}
              maxVisible={8}
            />
          </div>

          {/* Right Column - Plan Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribucija planova</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.planDistribution || []).map((plan) => (
                  <div key={plan.plan} className="flex items-center gap-3">
                    <PlanBadge plan={plan.plan} size="sm" showIcon={false} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{plan.count} korisnika</span>
                        <span>{plan.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${plan.percentage}%`,
                            backgroundColor: plan.plan === 'FREE' ? '#9ca3af' :
                                           plan.plan === 'BASIC' ? '#22c55e' :
                                           plan.plan === 'PLUS' ? '#3b82f6' :
                                           plan.plan === 'PRO' ? '#6366f1' :
                                           plan.plan === 'BUSINESS' ? '#a855f7' :
                                           plan.plan === 'ENTERPRISE' ? '#f59e0b' : '#9ca3af'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!stats?.planDistribution || stats.planDistribution.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">Nema podataka o planovima</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

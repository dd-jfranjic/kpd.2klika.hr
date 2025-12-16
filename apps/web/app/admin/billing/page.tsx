'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  RefreshCw,
  ExternalLink,
  Search,
  Download,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { PlanBadge, StatusIndicator, MetricsCard } from '@/components/admin';

interface BillingStats {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  totalSubscribers: number;
  subscribersGrowth: number;
  averageRevenuePerUser: number;
  churnRate: number;
  conversionRate: number;
  unpaidInvoices: number;
  unpaidAmount: number;
}

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  status: string;
  mrr: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  organizationName: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'void';
  dueDate: string;
  paidAt: string | null;
  stripeInvoiceId: string | null;
}

interface Transaction {
  id: string;
  organizationName: string;
  amount: number;
  type: 'charge' | 'refund' | 'credit';
  status: 'succeeded' | 'pending' | 'failed';
  description: string;
  createdAt: string;
  stripePaymentId: string | null;
}

const TABS = [
  { id: 'overview', label: 'Pregled', icon: TrendingUp },
  { id: 'subscriptions', label: 'Pretplate', icon: CreditCard },
  { id: 'invoices', label: 'Fakture', icon: FileText },
  { id: 'transactions', label: 'Transakcije', icon: DollarSign },
];

function AdminBillingPageContent() {
  const { user, loading: authLoading, isAdmin, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (token) {
      fetchBillingData();
    }
  }, [token]);

  const fetchBillingData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      // Fetch billing stats
      const statsRes = await fetch('/api/v1/admin/billing/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      // Fetch subscriptions
      const subsRes = await fetch('/api/v1/admin/subscriptions', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(data.data?.subscriptions || []);
      }

      // Fetch invoices (mock for now)
      setInvoices([]);

      // Fetch transactions (mock for now)
      setTransactions([]);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unpaid':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'void':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Pretplate</h1>
            <p className="text-gray-500">Upravljanje pretplatama, fakturama i transakcijama</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBillingData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Osvježi
            </button>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5147e5]"
            >
              <ExternalLink className="w-4 h-4" />
              Stripe Dashboard
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                title="MRR"
                subtitle="Mjesečni ponavljajući prihod"
                value={formatCurrency(stats?.mrr || 0)}
                change={{ value: stats?.mrrGrowth || 0, period: '7d' }}
                icon={TrendingUp}
                loading={loading}
              />
              <MetricsCard
                title="ARR"
                subtitle="Godišnji prihod (MRR × 12)"
                value={formatCurrency(stats?.arr || 0)}
                icon={DollarSign}
                loading={loading}
              />
              <MetricsCard
                title="Pretplatnici"
                subtitle="Aktivne plaćene pretplate"
                value={stats?.totalSubscribers || 0}
                change={{ value: stats?.subscribersGrowth || 0, period: '7d' }}
                icon={Users}
                loading={loading}
              />
              <MetricsCard
                title="ARPU"
                subtitle="Prosječan prihod po korisniku"
                value={formatCurrency(stats?.averageRevenuePerUser || 0)}
                icon={CreditCard}
                loading={loading}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Churn Rate</h3>
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-xs text-gray-400 mb-2">Postotak otkazanih pretplata</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '-' : `${(stats?.churnRate || 0).toFixed(1)}%`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Otkazane pretplate u zadnjih 30 dana</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Conversion Rate</h3>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-xs text-gray-400 mb-2">Postotak koji prelaze na plaćeni plan</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '-' : `${(stats?.conversionRate || 0).toFixed(1)}%`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Free → Paid konverzija</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Neplaćene fakture</h3>
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-400 mb-2">Fakture koje čekaju uplatu</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '-' : stats?.unpaidInvoices || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ukupno: {formatCurrency(stats?.unpaidAmount || 0)}
                </p>
              </div>
            </div>

            {/* Recent Subscriptions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Nedavne pretplate</h3>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Vidi sve
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : subscriptions.slice(0, 5).length > 0 ? (
                  subscriptions.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{sub.organizationName}</p>
                          <p className="text-xs text-gray-500">Od: {formatDate(sub.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <PlanBadge plan={sub.plan} size="sm" />
                        <StatusIndicator status={sub.status} />
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(sub.mrr)}/mj
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    Nema aktivnih pretplata
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži po organizaciji..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Svi statusi</option>
                <option value="active">Aktivne</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Zakasnela uplata</option>
                <option value="cancelled">Otkazane</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : subscriptions.length > 0 ? (
                    subscriptions
                      .filter((sub) => statusFilter === 'all' || sub.status === statusFilter)
                      .filter((sub) => !searchQuery || sub.organizationName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/organizations/${sub.organizationId}`}
                              className="text-sm font-medium text-primary-600 hover:text-primary-800"
                            >
                              {sub.organizationName}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <PlanBadge plan={sub.plan} size="sm" />
                          </td>
                          <td className="px-6 py-4">
                            <StatusIndicator status={sub.status} />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {formatCurrency(sub.mrr)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/admin/organizations/${sub.organizationId}`}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="Pogledaj organizaciju"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/admin/organizations/${sub.organizationId}?action=change-plan`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Promijeni plan"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Link>
                              {sub.stripeSubscriptionId && (
                                <a
                                  href={`https://dashboard.stripe.com/subscriptions/${sub.stripeSubscriptionId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-[#635bff] hover:bg-purple-50 rounded"
                                  title="Otvori u Stripe"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nema pretplata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži po organizaciji..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Svi statusi</option>
                <option value="paid">Plaćene</option>
                <option value="unpaid">Neplaćene</option>
                <option value="overdue">Zakašnjele</option>
                <option value="void">Stornirane</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faktura</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Iznos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dospijeće</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                          {invoice.id.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {invoice.organizationName}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${
                            invoice.status === 'paid' ? 'text-green-700' :
                            invoice.status === 'unpaid' ? 'text-yellow-700' :
                            invoice.status === 'overdue' ? 'text-red-700' : 'text-gray-500'
                          }`}>
                            {getInvoiceStatusIcon(invoice.status)}
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Pregledaj">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Preuzmi PDF">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Nema faktura</p>
                        <p className="text-xs mt-1">Fakture će se pojaviti nakon prve uspješne naplate</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži transakcije..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Sve transakcije</option>
                <option value="charge">Naplate</option>
                <option value="refund">Povrati</option>
                <option value="credit">Krediti</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transakcija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizacija</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Iznos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono text-gray-600">{tx.id.substring(0, 12)}...</p>
                          <p className="text-xs text-gray-500">{tx.description}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {tx.organizationName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            tx.type === 'charge' ? 'bg-green-100 text-green-800' :
                            tx.type === 'refund' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {tx.type === 'charge' ? 'Naplata' :
                             tx.type === 'refund' ? 'Povrat' : 'Kredit'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold ${
                          tx.type === 'refund' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.type === 'refund' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusIndicator status={tx.status === 'succeeded' ? 'active' : tx.status === 'pending' ? 'pending' : 'suspended'} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Nema transakcija</p>
                        <p className="text-xs mt-1">Transakcije će se pojaviti nakon prve naplate</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminBillingPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    }>
      <AdminBillingPageContent />
    </Suspense>
  );
}

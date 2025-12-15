const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.message || 'Došlo je do greške',
      error.errors
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Classification API
export const classifyApi = {
  classify: (data: { description: string; context?: string }, token?: string) =>
    request<ClassificationResult>('/classify', {
      method: 'POST',
      body: data,
      token,
    }),

  batchClassify: (
    data: { items: Array<{ description: string; context?: string }> },
    token?: string
  ) =>
    request<{ results: ClassificationResult[] }>('/classify/batch', {
      method: 'POST',
      body: data,
      token,
    }),

  getHistory: (params?: { page?: number; limit?: number }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<PaginatedResponse<ClassificationQuery>>(
      `/classify/history?${query}`,
      { token }
    );
  },

  getQuery: (queryId: string, token?: string) =>
    request<ClassificationQuery>(`/classify/${queryId}`, { token }),
};

// KPD codes API
export const kpdApi = {
  search: (query: string, limit = 10) =>
    request<KpdCode[]>(`/kpd/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getByCode: (code: string) => request<KpdCode>(`/kpd/${code}`),

  getCategories: () => request<KpdCategory[]>('/kpd/categories'),

  getByCategory: (category: string) =>
    request<KpdCode[]>(`/kpd/category/${category}`),
};

// Raw API response types (from backend)
interface RawUsageStats {
  queriesUsed: number;
  queriesLimit: number;
  tokensUsed: number;
  apiCallsUsed: number;
  periodStart: string;
  periodEnd: string;
  percentageUsed: number;
  isOverLimit: boolean;
}

interface RawDailyUsage {
  date: string;
  queries: number;
  tokens: number;
  apiCalls: number;
}

// Usage API
export const usageApi = {
  getStats: async (token?: string): Promise<UsageStats> => {
    const raw = await request<RawUsageStats>('/usage/stats', { token });
    return {
      ...raw,
      // Computed fields for frontend compatibility
      used: raw.queriesUsed,
      limit: raw.queriesLimit,
      remaining: raw.queriesLimit - raw.queriesUsed,
      resetDate: raw.periodEnd,
      percentUsed: raw.percentageUsed,
    };
  },

  getDailyUsage: async (days = 30, token?: string): Promise<DailyUsage[]> => {
    const raw = await request<RawDailyUsage[]>(`/usage/history?days=${days}`, { token });
    return raw.map(item => ({
      ...item,
      // Alias for frontend compatibility
      count: item.queries,
    }));
  },
};

// Billing API
export const billingApi = {
  createCheckout: (priceId: string, token?: string) =>
    request<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: { priceId },
      token,
    }),

  getPortalUrl: (token?: string) =>
    request<{ url: string }>('/billing/portal', { token }),

  getSubscription: (token?: string) =>
    request<Subscription>('/billing/subscription', { token }),

  getInvoices: (token?: string) =>
    request<Invoice[]>('/billing/invoices', { token }),
};

// API Keys API
export const apiKeysApi = {
  list: (token?: string) =>
    request<ApiKey[]>('/api-keys', { token }),

  create: (data: { name: string; scopes?: string[] }, token?: string) =>
    request<{ key: string; apiKey: ApiKey }>('/api-keys', {
      method: 'POST',
      body: data,
      token,
    }),

  revoke: (keyId: string, token?: string) =>
    request<void>(`/api-keys/${keyId}`, {
      method: 'DELETE',
      token,
    }),

  rotate: (keyId: string, token?: string) =>
    request<{ key: string }>(`/api-keys/${keyId}/rotate`, {
      method: 'POST',
      token,
    }),
};

// Raw API response types for reports
interface RawDashboardStats {
  totalQueries: number;
  queriesThisMonth: number;
  queriesToday: number;
  avgConfidence: number;
  topKpdCodes: Array<{ code: string; name: string; count: number }>;
  queryTrend: Array<{ date: string; count: number }>;
}

// Reports API
export const reportsApi = {
  getDashboard: async (token?: string): Promise<DashboardStats> => {
    const raw = await request<RawDashboardStats>('/reports/dashboard', { token });
    return {
      ...raw,
      // Alias for frontend compatibility
      todayQueries: raw.queriesToday,
    };
  },

  getUsageReport: (params?: { startDate?: string; endDate?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return request<UsageReport>(`/reports/usage?${query}`, { token });
  },
};

// Export API
export const exportApi = {
  exportClassifications: (
    data: { format: 'csv' | 'json' | 'xlsx'; startDate?: string; endDate?: string },
    token?: string
  ) =>
    request<Blob>('/export/classifications', {
      method: 'POST',
      body: data,
      token,
    }),
};

// Types
export interface ClassificationResult {
  queryId: string;
  kpdCode: string;
  kpdName: string;
  confidence: number;
  alternatives: Array<{
    code: string;
    name: string;
    confidence: number;
  }>;
  cached: boolean;
  processingTime: number;
}

export interface ClassificationQuery {
  id: string;
  description: string;
  context?: string;
  result: ClassificationResult;
  createdAt: string;
}

export interface KpdCode {
  code: string;
  name: string;
  description?: string;
  category: string;
  level: number;
}

export interface KpdCategory {
  code: string;
  name: string;
  subcategories?: KpdCategory[];
}

export interface UsageStats {
  queriesUsed: number;
  queriesLimit: number;
  tokensUsed: number;
  apiCallsUsed: number;
  periodStart: string;
  periodEnd: string;
  percentageUsed: number;
  isOverLimit: boolean;
  // Computed fields for frontend compatibility
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
  percentUsed: number;
}

export interface DailyUsage {
  date: string;
  queries: number;
  tokens: number;
  apiCalls: number;
  // Alias for frontend compatibility
  count: number;
}

export interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  pdfUrl?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalQueries: number;
  queriesThisMonth: number;
  queriesToday: number;
  avgConfidence: number;
  topKpdCodes: Array<{ code: string; name: string; count: number }>;
  queryTrend: Array<{ date: string; count: number }>;
  // Alias for frontend compatibility
  todayQueries: number;
}

export interface UsageReport {
  totalQueries: number;
  uniqueKpdCodes: number;
  avgConfidence: number;
  dailyBreakdown: DailyUsage[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Admin API
export const adminApi = {
  // Stats
  getStats: (token?: string) =>
    request<AdminStats>('/admin/stats', { token }),

  getActivity: (token?: string) =>
    request<AdminActivity[]>('/admin/activity', { token }),

  getHealth: (token?: string) =>
    request<AdminHealth>('/admin/health', { token }),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<AdminUsersResponse>(`/admin/users?${query}`, { token });
  },

  updateUser: (userId: string, data: { role?: string }, token?: string) =>
    request<AdminUser>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: data,
      token,
    }),

  suspendUser: (userId: string, suspended: boolean, token?: string) =>
    request<AdminUser>(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: { suspended },
      token,
    }),

  // Tenants
  getTenants: (params?: { page?: number; limit?: number; search?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<AdminTenantsResponse>(`/admin/tenants?${query}`, { token });
  },

  updateTenant: (tenantId: string, data: { status?: string; plan?: string }, token?: string) =>
    request<AdminTenant>(`/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      body: data,
      token,
    }),

  // KPD Codes
  getKpdCodes: (params?: { page?: number; limit?: number; search?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<AdminKpdCodesResponse>(`/admin/kpd-codes?${query}`, { token });
  },

  updateKpdCode: (codeId: string, description: string, token?: string) =>
    request<AdminKpdCode>(`/admin/kpd-codes/${codeId}`, {
      method: 'PATCH',
      body: { description },
      token,
    }),

  exportKpdCodes: (token?: string) =>
    request<AdminKpdCode[]>('/admin/kpd-codes/export', { token }),

  // Config
  getConfig: (keys?: string, token?: string) => {
    const query = keys ? `?keys=${keys}` : '';
    return request<AdminConfig[]>(`/admin/config${query}`, { token });
  },

  updateConfigs: (configs: Record<string, string>, token?: string) =>
    request<AdminConfig[]>('/admin/config', {
      method: 'PUT',
      body: configs,
      token,
    }),

  updateConfig: (key: string, value: string, token?: string) =>
    request<AdminConfig>(`/admin/config/${key}`, {
      method: 'PATCH',
      body: { value },
      token,
    }),

  // Feature Flags
  getFeatureFlags: (token?: string) =>
    request<AdminFeatureFlag[]>('/admin/feature-flags', { token }),

  toggleFeatureFlag: (key: string, enabled: boolean, token?: string) =>
    request<AdminFeatureFlag>(`/admin/feature-flags/${key}`, {
      method: 'PATCH',
      body: { enabled },
      token,
    }),

  // Audit Logs
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.action) query.set('action', params.action);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return request<AdminAuditLogsResponse>(`/admin/audit-logs?${query}`, { token });
  },

  exportAuditLogs: (params?: {
    search?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.action) query.set('action', params.action);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return request<AdminAuditLog[]>(`/admin/audit-logs/export?${query}`, { token });
  },

  // Analytics
  getAnalytics: (period: '7d' | '30d' | '90d' | '1y' = '30d', token?: string) =>
    request<AdminAnalytics>(`/admin/analytics?period=${period}`, { token }),

  exportAnalytics: (period: '7d' | '30d' | '90d' | '1y' = '30d', token?: string) =>
    request<AdminAnalytics>(`/admin/analytics/export?period=${period}`, { token }),

  // Integrations
  getIntegrations: (token?: string) =>
    request<AdminIntegrationsResponse>('/admin/integrations', { token }),

  updateIntegration: (key: string, value: string, token?: string) =>
    request<AdminIntegration>(`/admin/integrations/${key}`, {
      method: 'PATCH',
      body: { value },
      token,
    }),

  // Cache & Queues
  refreshCaches: (token?: string) =>
    request<{ message: string }>('/admin/caches/refresh', {
      method: 'POST',
      token,
    }),

  setQueuePaused: (name: string, paused: boolean, token?: string) =>
    request<{ name: string; paused: boolean }>(`/admin/queues/${name}/paused`, {
      method: 'PUT',
      body: { paused },
      token,
    }),
};

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalTenants: number;
  totalQueries: number;
  totalKpdCodes: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
}

export interface AdminActivity {
  id: string;
  action: string;
  description: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
}

export interface AdminHealth {
  status: string;
  database: { status: string; latency: number };
  redis: { status: string; latency: number };
  uptime: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  emailVerified: boolean;
  suspended: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  memberCount: number;
  totalQueries: number;
  createdAt: string;
}

export interface AdminTenantsResponse {
  tenants: AdminTenant[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminKpdCode {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  level: number;
  parentCode?: string;
  isActive: boolean;
}

export interface AdminKpdCodesResponse {
  codes: AdminKpdCode[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminConfig {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export interface AdminFeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  user?: string;
  organization?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminAnalytics {
  period: string;
  startDate: string;
  metrics: {
    totalQueries: number;
    newUsers: number;
    subscriptionsByPlan: Array<{ plan: string; count: number }>;
  };
  topKpdCodes?: Array<{ code: string; name: string; count: number }>;
  dailyBreakdown?: Array<{ date: string; queries: number; users: number }>;
}

export interface AdminIntegration {
  key: string;
  name: string;
  description?: string;
  value?: string;
  masked?: string;
  isConfigured: boolean;
  isRequired: boolean;
}

export interface AdminIntegrationsResponse {
  configs: AdminIntegration[];
  stats: {
    configured: number;
    missing: number;
    optional: number;
  };
  webhookUrls: {
    stripe?: string;
  };
}

export { ApiError };

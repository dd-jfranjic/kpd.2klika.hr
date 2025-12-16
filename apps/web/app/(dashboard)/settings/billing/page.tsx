'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
  Crown,
  Building2,
  Briefcase,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface SubscriptionData {
  plan: 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  status: string;
  monthlyQueryLimit: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planConfig?: {
    displayName: string;
    monthlyPriceEur: number;
    features: string[];
  };
}

interface PlanConfig {
  id: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  displayName: string;
  monthlyPriceEur: number;
  monthlyQueryLimit: number | null;
  membersLimit: number | null;
  priceId: string | null;
  isPopular?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const planDisplayNames: Record<string, string> = {
  FREE: 'KPD Starter',
  BASIC: 'KPD Basic',
  PRO: 'KPD Pro',
  BUSINESS: 'KPD Business',
  ENTERPRISE: 'KPD Enterprise',
};

const statusDisplayNames: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktivna', color: 'kpd-badge--success' },
  TRIALING: { label: 'Probni period', color: 'kpd-badge--info' },
  PAST_DUE: { label: 'Dospjelo', color: 'kpd-badge--warning' },
  CANCELLED: { label: 'Otkazana', color: 'kpd-badge--error' },
  PAUSED: { label: 'Pauzirana', color: 'kpd-badge--muted' },
};

function BillingSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success/cancel query params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setSuccessMessage('Pretplata je uspješno aktivirana!');
      // Čekaj da webhook obradi pretplatu, pa refetch
      const refetchTimer = setTimeout(() => {
        // Force re-fetch subscription data after webhook processes
        window.location.href = '/settings/billing';
      }, 2500);
      return () => clearTimeout(refetchTimer);
    }

    if (canceled === 'true') {
      setError('Proces plaćanja je otkazan.');
      router.replace('/settings/billing');
    }

    return undefined;
  }, [searchParams, router]);

  // Fetch subscription and plans
  useEffect(() => {
    async function fetchData() {
      if (!user?.organizationId || !token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch subscription
        const subResponse = await fetch(
          `${API_BASE}/stripe/subscription/${user.organizationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (subResponse.ok) {
          const data = await subResponse.json();
          setSubscription(data.subscription);
        }

        // Fetch available plans
        const plansResponse = await fetch(`${API_BASE}/stripe/plans`);
        if (plansResponse.ok) {
          const data = await plansResponse.json();
          setPlans(data.plans || []);
        }
      } catch (err) {
        console.error('Error fetching billing data:', err);
        setError('Greška pri učitavanju podataka o pretplati');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchData();
    }
  }, [user, token, authLoading]);

  const handleManageSubscription = async () => {
    if (!user?.organizationId || !token) return;

    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/stripe/portal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Greška pri otvaranju portala');
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      setError('Greška pri otvaranju portala za upravljanje pretplatom');
    } finally {
      setActionLoading(false);
    }
  };

  // Za FREE korisnike - checkout
  const handleUpgrade = async (priceId: string) => {
    if (!user?.organizationId || !token || !priceId) return;

    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/stripe/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          priceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Greška pri kreiranju checkout sesije');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError('Greška pri pokretanju procesa nadogradnje');
    } finally {
      setActionLoading(false);
    }
  };

  // Za postojeće pretplatnike - direktni upgrade s proration
  const handlePlanUpgrade = async (priceId: string, planName: string) => {
    if (!user?.organizationId || !token || !priceId) return;

    setUpgradingPlan(planName);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/stripe/upgrade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          priceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'Uspješno ste nadogradili plan!');
        // Refresh stranice nakon kratke pauze
        setTimeout(() => {
          window.location.href = '/settings/billing';
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Greška pri nadogradnji plana');
      }
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setError('Greška pri nadogradnji plana');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="kpd-settings-loading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Učitavanje...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="kpd-settings-error">
        <AlertCircle className="kpd-settings-error__icon" />
        <h2>Niste prijavljeni</h2>
        <p>Molimo prijavite se za pristup postavkama naplate.</p>
        <Link href="/login" className="kpd-btn kpd-btn--primary">
          Prijava
        </Link>
      </div>
    );
  }

  if (!user.organizationId) {
    return (
      <div className="kpd-settings-error">
        <AlertCircle className="kpd-settings-error__icon" />
        <h2>Nema organizacije</h2>
        <p>Nemate povezanu organizaciju. Kontaktirajte podršku.</p>
        <Link href="/dashboard" className="kpd-btn kpd-btn--primary">
          Natrag na dashboard
        </Link>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'FREE';
  const statusInfo = statusDisplayNames[subscription?.status || 'ACTIVE'];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {successMessage && (
        <div className="kpd-alert kpd-alert--success">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="kpd-alert kpd-alert--error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Cancellation Notice - prominentan prikaz kada se pretplata otkazuje */}
      {subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && currentPlan !== 'FREE' && (
        <div className="kpd-cancellation-notice">
          <div className="kpd-cancellation-notice__icon">
            <Clock size={24} />
          </div>
          <div className="kpd-cancellation-notice__content">
            <h3 className="kpd-cancellation-notice__title">
              Vaša pretplata se otkazuje
            </h3>
            <p className="kpd-cancellation-notice__text">
              Imate pristup planu <strong>{planDisplayNames[currentPlan]}</strong> do{' '}
              <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
              Nakon tog datuma, vaš račun prelazi na besplatni plan (KPD Starter) s ograničenjem od 5 upita mjesečno.
            </p>
            <p className="kpd-cancellation-notice__action">
              Želite nastaviti koristiti trenutni plan? Otvorite portal za upravljanje pretplatom i reaktivirajte pretplatu.
            </p>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={actionLoading}
            className="kpd-btn kpd-btn--warning"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Reaktiviraj pretplatu'
            )}
          </button>
        </div>
      )}

      {/* Current Subscription Card */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            {currentPlan === 'FREE' && <Sparkles size={24} />}
            {currentPlan === 'BASIC' && <Briefcase size={24} />}
            {currentPlan === 'PRO' && <Crown size={24} />}
            {currentPlan === 'BUSINESS' && <Building2 size={24} />}
            {currentPlan === 'ENTERPRISE' && <Building2 size={24} />}
          </div>
          <div className="kpd-settings-card__title-group">
            <h2 className="kpd-heading-3">Trenutna pretplata</h2>
            <span className={`kpd-badge ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        <div className="kpd-settings-card__body">
          <div className="kpd-settings-info-grid">
            <div className="kpd-settings-info-item">
              <span className="kpd-settings-info-item__label">Plan</span>
              <span className="kpd-settings-info-item__value">
                {planDisplayNames[currentPlan] || currentPlan}
              </span>
            </div>

            <div className="kpd-settings-info-item">
              <span className="kpd-settings-info-item__label">
                Mjesečni limit upita
              </span>
              <span className="kpd-settings-info-item__value">
                {subscription?.monthlyQueryLimit ?? 5} upita
              </span>
            </div>

            {subscription?.currentPeriodEnd && currentPlan !== 'FREE' && (
              <div className="kpd-settings-info-item">
                <span className="kpd-settings-info-item__label">
                  <Calendar size={16} className="inline mr-1" />
                  Sljedeća naplata
                </span>
                <span className="kpd-settings-info-item__value">
                  {formatDate(subscription.currentPeriodEnd)}
                  {subscription.cancelAtPeriodEnd && (
                    <span className="kpd-text-warning kpd-ml-sm">
                      (Otkazuje se)
                    </span>
                  )}
                </span>
              </div>
            )}

            {subscription?.planConfig?.monthlyPriceEur !== undefined &&
              currentPlan !== 'FREE' && (
                <div className="kpd-settings-info-item">
                  <span className="kpd-settings-info-item__label">
                    <CreditCard size={16} className="inline mr-1" />
                    Mjesečna cijena
                  </span>
                  <span className="kpd-settings-info-item__value">
                    {subscription.planConfig.monthlyPriceEur.toFixed(2)} EUR
                  </span>
                </div>
              )}
          </div>
        </div>

        {currentPlan !== 'FREE' && (
          <div className="kpd-settings-card__footer">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="kpd-btn kpd-btn--secondary"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Upravljaj pretplatom
                  </>
                )}
              </button>

              {/* Cancel link - only for active paid subscriptions */}
              {!subscription?.cancelAtPeriodEnd && (
                <button
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  className="kpd-text-small text-gray-500 hover:text-red-600 transition-colors underline"
                >
                  Otkaži pretplatu
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Available Plans - pokazuje upgrade opcije za sve korisnike */}
      {plans.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="kpd-heading-3">
              {currentPlan === 'FREE' ? 'Nadogradite plan' : 'Promjena plana'}
            </h2>
            <p className="kpd-text-body">
              {currentPlan === 'FREE'
                ? 'Odaberite plan koji najbolje odgovara vašim potrebama.'
                : 'Nadogradite na veći plan za više upita i mogućnosti.'}
            </p>
          </div>

          <div className="kpd-settings-plans-grid">
            {plans
              .filter((plan) => plan.plan !== 'FREE')
              .map((plan) => {
                const isCurrentPlan = plan.plan === currentPlan;
                const planOrder = ['FREE', 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];
                const currentIndex = planOrder.indexOf(currentPlan);
                const planIndex = planOrder.indexOf(plan.plan);
                const isDowngrade = planIndex < currentIndex;

                return (
                  <div
                    key={plan.id}
                    className={`kpd-settings-plan-card ${isCurrentPlan ? 'kpd-settings-plan-card--current' : ''}`}
                  >
                    {isCurrentPlan && (
                      <div className="kpd-settings-plan-card__badge">
                        Trenutni plan
                      </div>
                    )}
                    <div className="kpd-settings-plan-card__header">
                      <h3 className="kpd-settings-plan-card__name">
                        {plan.displayName}
                      </h3>
                      <div className="kpd-settings-plan-card__price">
                        <span className="kpd-settings-plan-card__amount">
                          {plan.monthlyPriceEur.toFixed(2)}
                        </span>
                        <span className="kpd-settings-plan-card__period">
                          EUR/mj
                        </span>
                      </div>
                    </div>

                    <div className="kpd-settings-plan-card__body">
                      <p className="kpd-settings-plan-card__feature">
                        {plan.monthlyQueryLimit} upita mjesečno
                      </p>
                      {plan.membersLimit && (
                        <p className="kpd-settings-plan-card__feature">
                          Do {plan.membersLimit} članova tima
                        </p>
                      )}
                      {!plan.membersLimit && plan.plan === 'ENTERPRISE' && (
                        <p className="kpd-settings-plan-card__feature">
                          Neograničen broj članova
                        </p>
                      )}
                    </div>

                    <div className="kpd-settings-plan-card__footer">
                      {isCurrentPlan ? (
                        <button
                          disabled
                          className="kpd-btn kpd-btn--secondary kpd-btn--full"
                        >
                          <CheckCircle2 size={16} />
                          Aktivno
                        </button>
                      ) : isDowngrade ? (
                        <button
                          onClick={handleManageSubscription}
                          disabled={actionLoading}
                          className="kpd-btn kpd-btn--secondary kpd-btn--full"
                        >
                          Koristi portal
                        </button>
                      ) : currentPlan === 'FREE' ? (
                        <button
                          onClick={() => plan.priceId && handleUpgrade(plan.priceId)}
                          disabled={actionLoading || !plan.priceId}
                          className="kpd-btn kpd-btn--primary kpd-btn--full"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : !plan.priceId ? (
                            'Uskoro dostupno'
                          ) : (
                            'Nadogradi'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            plan.priceId && handlePlanUpgrade(plan.priceId, plan.plan)
                          }
                          disabled={upgradingPlan !== null || !plan.priceId}
                          className="kpd-btn kpd-btn--primary kpd-btn--full"
                        >
                          {upgradingPlan === plan.plan ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : !plan.priceId ? (
                            'Uskoro dostupno'
                          ) : (
                            'Nadogradi'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Link to full pricing page */}
      <div className="text-center">
        <Link href="/pricing" className="kpd-auth-card__footer-link">
          Pogledajte sve planove i značajke
        </Link>
      </div>
    </div>
  );
}

function BillingLoadingFallback() {
  return (
    <div className="kpd-settings-loading">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p>Učitavanje...</p>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<BillingLoadingFallback />}>
      <BillingSettingsContent />
    </Suspense>
  );
}

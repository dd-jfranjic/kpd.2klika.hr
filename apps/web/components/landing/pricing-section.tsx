'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2, Sparkles, Crown, Building2, Briefcase } from 'lucide-react';
import { BillingToggle, useBillingToggle } from '@/components/billing';

interface PlanConfig {
  id: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  displayName: string;
  description: string | null;
  monthlyPriceEur: number;
  oneTimePriceEur?: number;
  monthlyQueryLimit: number;
  membersLimit: number | null;
  features: string[];
  isPopular: boolean;
  priceId: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Fallback plans if API fails - features match billing page exactly
const fallbackPlans: PlanConfig[] = [
  {
    id: 'free',
    plan: 'FREE',
    displayName: 'KPD Starter',
    description: 'Za isprobavanje',
    monthlyPriceEur: 0,
    oneTimePriceEur: 0,
    monthlyQueryLimit: 3,
    membersLimit: 1,
    features: [
      '3 upita mjesečno',
      '1 korisnik',
      'Povijest upita',
    ],
    isPopular: false,
    priceId: null,
  },
  {
    id: 'basic',
    plan: 'BASIC',
    displayName: 'KPD Basic',
    description: 'Za male poduzetnike',
    monthlyPriceEur: 6.99,
    oneTimePriceEur: 6.99,
    monthlyQueryLimit: 10,
    membersLimit: 2,
    features: [
      '10 upita mjesečno',
      'Do 2 članova tima',
      'Povijest upita',
    ],
    isPopular: false,
    priceId: null,
  },
  {
    id: 'pro',
    plan: 'PRO',
    displayName: 'KPD Pro',
    description: 'Za rastuće timove',
    monthlyPriceEur: 11.99,
    oneTimePriceEur: 11.99,
    monthlyQueryLimit: 20,
    membersLimit: 5,
    features: [
      '20 upita mjesečno',
      'Do 5 članova tima',
      'Povijest upita',
      'CSV izvoz povijesti',
    ],
    isPopular: true,
    priceId: null,
  },
  {
    id: 'business',
    plan: 'BUSINESS',
    displayName: 'KPD Business',
    description: 'Za srednje tvrtke',
    monthlyPriceEur: 30.99,
    oneTimePriceEur: 30.99,
    monthlyQueryLimit: 50,
    membersLimit: 10,
    features: [
      '50 upita mjesečno',
      'Do 10 članova tima',
      'Povijest upita',
      'CSV izvoz povijesti',
    ],
    isPopular: false,
    priceId: null,
  },
  {
    id: 'enterprise',
    plan: 'ENTERPRISE',
    displayName: 'KPD Enterprise',
    description: 'Za velike organizacije',
    monthlyPriceEur: 199,
    oneTimePriceEur: 199,
    monthlyQueryLimit: 2500,
    membersLimit: null,
    features: [
      '2500 upita mjesečno',
      'Neograničen broj članova',
      'Povijest upita',
      'CSV izvoz povijesti',
    ],
    isPopular: false,
    priceId: null,
  },
];

const planIcons: Record<string, React.ReactNode> = {
  FREE: <Sparkles className="w-5 h-5" />,
  BASIC: <Briefcase className="w-5 h-5" />,
  PRO: <Crown className="w-5 h-5" />,
  BUSINESS: <Building2 className="w-5 h-5" />,
  ENTERPRISE: <Building2 className="w-5 h-5" />,
};

// Croatian plural for "član" (member)
function formatMembers(count: number): string {
  if (count === 1) return '1 član';
  if (count >= 2 && count <= 4) return `${count} člana`;
  return `${count} članova`;
}

export function PricingSection() {
  const [plans, setPlans] = useState<PlanConfig[]>(fallbackPlans);
  const [loading, setLoading] = useState(true);

  // Per-card billing type selection (only for paid plans)
  const paidPlanIds = ['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];
  const { billingTypes, setBillingType } = useBillingToggle(paidPlanIds);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch(`${API_BASE}/stripe/plans`);
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            // Merge API data with fallback features
            const mergedPlans = data.plans.map((apiPlan: PlanConfig) => {
              const fallback = fallbackPlans.find(f => f.plan === apiPlan.plan);
              return {
                ...apiPlan,
                features: Array.isArray(apiPlan.features) && apiPlan.features.length > 0
                  ? apiPlan.features
                  : fallback?.features || [],
              };
            });
            setPlans(mergedPlans);
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        // Keep fallback plans
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    return price.toFixed(2).replace('.', ',');
  };

  return (
    <section id="pricing" className="kpd-section kpd-section--alt">
      <div className="kpd-container">
        <div className="kpd-section__header">
          <h2 className="kpd-heading-2">Jednostavne <span className="kpd-marker">cijene</span></h2>
          <p className="kpd-section__subtitle">
            Odaberite plan koji odgovara vašim potrebama. Bez skrivenih
            troškova.
          </p>
        </div>

        {loading ? (
          <div className="kpd-pricing__loading">
            <Loader2 className="kpd-auth-card__spinner" />
            <p>Učitavanje planova...</p>
          </div>
        ) : (
          <div className="kpd-pricing-grid">
            {plans.map((plan) => {
              const isPaid = plan.plan !== 'FREE';
              const billingType = isPaid ? billingTypes[plan.plan] : 'monthly';
              const isOnetime = billingType === 'onetime';
              const displayPrice = isOnetime
                ? (plan.oneTimePriceEur ?? plan.monthlyPriceEur)
                : plan.monthlyPriceEur;

              return (
                <div
                  key={plan.id}
                  className={`kpd-pricing-card ${plan.isPopular ? 'kpd-pricing-card--popular' : ''}`}
                >
                  {plan.isPopular && (
                    <span className="kpd-pricing-card__badge">
                      Najpopularnije
                    </span>
                  )}
                  <div className="kpd-pricing-card__header">
                    <div className="kpd-pricing-card__icon-wrapper">
                      {planIcons[plan.plan]}
                    </div>
                    <h3 className="kpd-pricing-card__name">{plan.displayName}</h3>
                  </div>

                  {/* Billing Toggle for paid plans */}
                  {isPaid && (
                    <div className="kpd-pricing-card__billing-toggle">
                      <BillingToggle
                        value={billingType}
                        onChange={(type) => setBillingType(plan.plan, type)}
                        size="sm"
                      />
                    </div>
                  )}

                  <div className="kpd-pricing-card__price">
                    <span className="kpd-pricing-card__amount">
                      €{formatPrice(displayPrice)}
                    </span>
                    <span className="kpd-pricing-card__period">
                      {isOnetime ? ' jednokratno' : '/mjesec'}
                    </span>
                  </div>
                  <p className="kpd-pricing-card__queries">
                    {plan.monthlyQueryLimit} upita{isOnetime ? '' : ' mjesečno'}
                    {plan.membersLimit
                      ? ` · ${formatMembers(plan.membersLimit)}`
                      : ' · Neograničeno članova'
                    }
                  </p>
                  <ul className="kpd-pricing-card__features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="kpd-pricing-card__feature">
                        <CheckCircle className="kpd-pricing-card__check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {isOnetime && (
                      <li className="kpd-pricing-card__feature kpd-pricing-card__feature--highlight">
                        <CheckCircle className="kpd-pricing-card__check" />
                        <span>Upiti nikad ne istječu</span>
                      </li>
                    )}
                  </ul>
                  <Link
                    href="/register"
                    className={`kpd-btn kpd-btn--full ${plan.isPopular ? 'kpd-btn--primary' : 'kpd-btn--secondary'}`}
                  >
                    {plan.plan === 'FREE'
                      ? 'Započni besplatno'
                      : isOnetime
                        ? 'Kupi jednokratno'
                        : 'Pretplati se'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

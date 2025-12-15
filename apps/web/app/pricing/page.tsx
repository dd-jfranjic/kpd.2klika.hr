'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Building2, Briefcase, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface PlanConfig {
  id: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  displayName: string;
  description: string | null;
  monthlyPriceEur: number;
  monthlyQueryLimit: number;
  membersLimit: number | null;
  features: string[];
  isPopular: boolean;
  priceId: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Fallback plans if API fails
const fallbackPlans: PlanConfig[] = [
  {
    id: 'free',
    plan: 'FREE',
    displayName: 'KPD Starter',
    description: 'Za isprobavanje',
    monthlyPriceEur: 0,
    monthlyQueryLimit: 3,
    membersLimit: 1,
    features: [
      '3 AI upita mjesečno',
      '1 korisnik',
      'Osnovna pretraga',
      'Email podrška',
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
    monthlyQueryLimit: 10,
    membersLimit: 2,
    features: [
      '10 AI upita mjesečno',
      'Do 2 člana tima',
      'AI preporuke',
      'Povijest pretraga',
      'Email podrška',
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
    monthlyQueryLimit: 20,
    membersLimit: 5,
    features: [
      '20 AI upita mjesečno',
      'Do 5 članova tima',
      'Napredne AI preporuke',
      'Povijest pretraga',
      'Prioritetna podrška',
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
    monthlyQueryLimit: 50,
    membersLimit: 10,
    features: [
      '50 AI upita mjesečno',
      'Do 10 članova tima',
      'API pristup',
      'Analitika korištenja',
      'Prioritetna podrška 24/7',
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
    monthlyQueryLimit: 2500,
    membersLimit: null,
    features: [
      '2500 AI upita mjesečno',
      'Neograničen broj članova',
      'Dedicirani AI model',
      'Custom integracije',
      'SLA garancija',
      'Osobni account manager',
    ],
    isPopular: false,
    priceId: null,
  },
];

const planIcons: Record<string, React.ReactNode> = {
  FREE: <Sparkles className="kpd-pricing-card__plan-icon" />,
  BASIC: <Briefcase className="kpd-pricing-card__plan-icon" />,
  PRO: <Crown className="kpd-pricing-card__plan-icon" />,
  BUSINESS: <Building2 className="kpd-pricing-card__plan-icon" />,
  ENTERPRISE: <Building2 className="kpd-pricing-card__plan-icon" />,
};

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>(fallbackPlans);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [checkoutLoading, _setCheckoutLoading] = useState<string | null>(null);

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
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (plan.plan === 'FREE') {
      // Redirect to register for free plan
      router.push('/register');
      return;
    }

    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/pricing`);
      return;
    }

    if (!plan.priceId) {
      alert('Ovaj plan trenutno nije dostupan za kupnju. Kontaktirajte podršku.');
      return;
    }

    // TODO: Need organizationId from user context
    // For now, show message
    alert('Za aktivaciju pretplate posjetite postavke naplate u svom profilu.');
    router.push('/dashboard');
  };

  return (
    <div className="kpd-page">
      {/* Header */}
      <header className="kpd-header">
        <div className="kpd-header__container">
          <Link href="/" className="kpd-logo">
            <div className="kpd-logo__icon">KPD</div>
            <div className="kpd-logo__text-group">
              <span className="kpd-logo__text">KPD 2klika</span>
              <span className="kpd-logo__subtext">AI Klasifikator</span>
            </div>
          </Link>

          <nav className="kpd-nav">
            <Link href="/#features" className="kpd-nav__link">Značajke</Link>
            <Link href="/#how-it-works" className="kpd-nav__link">Kako radi</Link>
            <Link href="/pricing" className="kpd-nav__link">Cijene</Link>
          </nav>

          <div className="kpd-header__actions">
            {user ? (
              <Link href="/dashboard" className="kpd-btn kpd-btn--primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="kpd-btn kpd-btn--ghost">
                  Prijava
                </Link>
                <Link href="/register" className="kpd-btn kpd-btn--primary">
                  Započni besplatno
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="kpd-section kpd-section--hero">
        <div className="kpd-section__bg kpd-hero__bg"></div>
        <div className="kpd-container">
          <div className="kpd-pricing__header">
            <span className="kpd-label">Cijene</span>
            <h1 className="kpd-heading-2 kpd-mt-lg">
              Odaberite plan koji vam odgovara
            </h1>
            <p className="kpd-section__subtitle">
              Započnite besplatno i nadogradite kada vam zatreba više.
              Bez skrivenih naknada.
            </p>
          </div>

          {loading ? (
            <div className="kpd-pricing__loading">
              <Loader2 className="kpd-auth-card__spinner" />
              <p>Učitavanje planova...</p>
            </div>
          ) : (
            <div className="kpd-pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`kpd-pricing-card ${plan.isPopular ? 'kpd-pricing-card--popular' : ''}`}
                >
                  {plan.isPopular && (
                    <div className="kpd-pricing-card__badge">Najpopularniji</div>
                  )}

                  <div className="kpd-pricing-card__header">
                    {planIcons[plan.plan]}
                    <div className="kpd-pricing-card__name">{plan.displayName}</div>
                  </div>

                  <div className="kpd-pricing-card__price">
                    <span className="kpd-pricing-card__amount">
                      {plan.monthlyPriceEur === 0 ? '0' : plan.monthlyPriceEur.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="kpd-pricing-card__currency">EUR</span>
                    <span className="kpd-pricing-card__period">/mjesečno</span>
                  </div>

                  <div className="kpd-pricing-card__queries">
                    {plan.monthlyQueryLimit} upita mjesečno
                    {plan.membersLimit ? ` · ${plan.membersLimit} član${plan.membersLimit > 1 ? 'a' : ''}` : ' · Neograničeno članova'}
                  </div>

                  <div className="kpd-pricing-card__features">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="kpd-pricing-card__feature">
                        <Check className="kpd-pricing-card__check" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="kpd-pricing-card__cta">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={checkoutLoading === plan.id}
                      className={`kpd-btn kpd-btn--full ${
                        plan.isPopular ? 'kpd-btn--primary' : 'kpd-btn--secondary'
                      }`}
                    >
                      {checkoutLoading === plan.id ? (
                        <>
                          <Loader2 className="kpd-btn__spinner" />
                          Učitavanje...
                        </>
                      ) : plan.plan === 'FREE' ? (
                        'Započni besplatno'
                      ) : (
                        'Odaberi plan'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FAQ or additional info */}
          <div className="kpd-pricing__footer">
            <p className="kpd-text-body kpd-text-center kpd-mt-xl">
              Trebate prilagođeni plan? {' '}
              <Link href="mailto:info@2klika.hr" className="kpd-auth-form__link">
                Kontaktirajte nas
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="kpd-footer">
        <div className="kpd-container">
          <div className="kpd-footer__bottom">
            <p className="kpd-footer__copyright">
              © {new Date().getFullYear()} KPD 2klika. Sva prava pridržana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

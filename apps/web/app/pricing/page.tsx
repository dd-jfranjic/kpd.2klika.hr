'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Building2, Briefcase, Crown, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { BackToTop } from '@/components/back-to-top';
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
            <div className="kpd-logo__icon">
              <span>KPD</span>
            </div>
            <div className="kpd-logo__text-group">
              <span className="kpd-logo__text">AI KPD Klasifikator</span>
              <span className="kpd-logo__subtext">created by 2klika</span>
            </div>
          </Link>

          <nav className="kpd-nav">
            <Link href="/#features" className="kpd-nav__link">
              Značajke
            </Link>
            <Link href="/#how-it-works" className="kpd-nav__link">
              Kako radi
            </Link>
            <Link href="/pricing" className="kpd-nav__link kpd-nav__link--active">
              Cijene
            </Link>
            <Link href="/faq" className="kpd-nav__link">
              FAQ
            </Link>
          </nav>

          <div className="kpd-header__actions">
            {user ? (
              <Link href="/dashboard" className="kpd-btn kpd-btn--primary kpd-btn--sm">
                Dashboard
                <ArrowRight className="kpd-btn__icon" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="kpd-nav__link">
                  Prijava
                </Link>
                <Link href="/register" className="kpd-btn kpd-btn--primary kpd-btn--sm">
                  Registracija
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
                      <div className="kpd-pricing-card__badge">Najpopularniji</div>
                    )}

                    <div className="kpd-pricing-card__header">
                      {planIcons[plan.plan]}
                      <div className="kpd-pricing-card__name">{plan.displayName}</div>
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
                        {displayPrice === 0 ? '0' : displayPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="kpd-pricing-card__currency">EUR</span>
                      <span className="kpd-pricing-card__period">
                        {isOnetime ? ' jednokratno' : '/mjesečno'}
                      </span>
                    </div>

                    <div className="kpd-pricing-card__queries">
                      {plan.monthlyQueryLimit} upita{isOnetime ? '' : ' mjesečno'}
                      {plan.membersLimit ? ` · ${plan.membersLimit} član${plan.membersLimit > 1 ? 'a' : ''}` : ' · Neograničeno članova'}
                    </div>

                    <div className="kpd-pricing-card__features">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="kpd-pricing-card__feature">
                          <Check className="kpd-pricing-card__check" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {isOnetime && (
                        <div className="kpd-pricing-card__feature kpd-pricing-card__feature--highlight">
                          <Check className="kpd-pricing-card__check" />
                          <span>Upiti nikad ne istječu</span>
                        </div>
                      )}
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
                        ) : isOnetime ? (
                          'Kupi jednokratno'
                        ) : (
                          'Pretplati se'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <div className="kpd-footer__content">
            <div className="kpd-footer__brand">
              <Link href="/" className="kpd-logo">
                <div className="kpd-logo__icon">
                  <span>KPD</span>
                </div>
                <div className="kpd-logo__text-group">
                  <span className="kpd-logo__text kpd-logo__text--light">
                    AI KPD Klasifikator
                  </span>
                  <span className="kpd-logo__subtext kpd-logo__subtext--light">
                    created by 2klika
                  </span>
                </div>
              </Link>
              <p className="kpd-footer__tagline">
                AI klasifikacija proizvoda i usluga prema KPD standardu za
                hrvatske poduzetnike i računovođe.
              </p>
            </div>

            <div className="kpd-footer__links">
              <div className="kpd-footer__column">
                <h4 className="kpd-footer__heading">Proizvod</h4>
                <Link href="/#features" className="kpd-footer__link">
                  Značajke
                </Link>
                <Link href="/pricing" className="kpd-footer__link">
                  Cijene
                </Link>
                <Link href="/#how-it-works" className="kpd-footer__link">
                  Kako radi
                </Link>
                <Link href="/faq" className="kpd-footer__link">
                  FAQ
                </Link>
              </div>

              <div className="kpd-footer__column">
                <h4 className="kpd-footer__heading">Kontakt</h4>
                <a href="mailto:info@2klika.hr" className="kpd-footer__link">
                  info@2klika.hr
                </a>
                <a
                  href="https://2klika.hr"
                  className="kpd-footer__link"
                  target="_blank"
                  rel="noopener"
                >
                  www.2klika.hr
                </a>
              </div>

              <div className="kpd-footer__column">
                <h4 className="kpd-footer__heading">Pravno</h4>
                <Link href="/privacy" className="kpd-footer__link">
                  Privatnost
                </Link>
                <Link href="/terms" className="kpd-footer__link">
                  Uvjeti korištenja
                </Link>
              </div>
            </div>
          </div>

          {/* Business Info Section */}
          <div className="kpd-footer__business">
            <div className="kpd-footer__business-main">
              <h4 className="kpd-footer__heading">2 KLIKA</h4>
              <p className="kpd-footer__business-text">
                Obrt za promidžbu i računalne djelatnosti
                <br />
                vl. Josip Franjić
                <br />
                Kašinski odvojak 20a, 10360 Sesvete
                <br />
                OIB: 99991580018 | MBS: 97131652
              </p>
            </div>
            <div className="kpd-footer__business-partner">
              <h4 className="kpd-footer__heading">Partner za naplatu</h4>
              <p className="kpd-footer__business-text">
                ANGARA d.o.o.
                <br />
                OIB: 95745406877
              </p>
            </div>
          </div>

          <div className="kpd-footer__bottom">
            <p className="kpd-footer__disclaimer">
              AI klasifikacija je pomoćni alat — provjerite KPD šifre prije službene upotrebe.
            </p>
            <p className="kpd-footer__copyright">
              © {new Date().getFullYear()} 2 KLIKA obrt. Sva prava pridržana.
            </p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}

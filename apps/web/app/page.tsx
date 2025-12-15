import Link from 'next/link';
import {
  ConditionalSignedIn,
  ConditionalSignedOut,
} from '@/components/auth/auth-wrapper';
import {
  Zap,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calculator,
  Store,
  Building2,
  Landmark,
  Clock,
  FileText,
  Target,
} from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';

// Force dynamic rendering for auth components
export const dynamic = 'force-dynamic';

const features = [
  {
    icon: Zap,
    title: 'AI Klasifikacija',
    description:
      'Google napredni jezični model analizira vaš opis na hrvatskom jeziku i pronalazi najprikladnije KPD šifre iz službene klasifikacije.',
  },
  {
    icon: Target,
    title: 'Razina pouzdanosti',
    description:
      'Svaki predloženi rezultat dolazi s prikazom razine pouzdanosti, tako da znate koliko je AI siguran u svoj prijedlog.',
  },
  {
    icon: BarChart3,
    title: 'Povijest klasifikacija',
    description:
      'Pratite sve svoje prijašnje klasifikacije, pregledajte korištene opise i brzo pronađite već klasificirane proizvode.',
  },
  {
    icon: Sparkles,
    title: 'Jednostavno korištenje',
    description:
      'Bez kompliciranih postavki. Opišite proizvod ili uslugu svojim riječima, a AI će pronaći odgovarajuću KPD šifru.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Opišite proizvod ili uslugu',
    description:
      'Unesite opis onoga što prodajete svojim riječima - na hrvatskom jeziku. Ne trebate poznavati stručnu terminologiju.',
  },
  {
    number: '02',
    title: 'AI analizira opis',
    description:
      'Naš AI model pretražuje 3.300+ KPD šifri i pronalazi najprikladnije klasifikacije za vaš opis. Prikazuje se razina pouzdanosti za svaki prijedlog.',
  },
  {
    number: '03',
    title: 'Odaberite i spremite',
    description:
      'Pregledajte predložene šifre, odaberite najprikladniju i spremite za buduću upotrebu. Šifra je spremna za unos u eRačun.',
  },
];

const audiences = [
  {
    icon: Calculator,
    title: 'Računovođe i knjigovodstveni servisi',
    description:
      'Automatizirajte klasifikaciju za sve svoje klijente. Brzo pronađite KPD šifre za raznolike djelatnosti bez dugotrajnog pretraživanja službenih tablica.',
  },
  {
    icon: Store,
    title: 'Mali poduzetnici i obrti',
    description:
      'Ne morate biti stručnjak za šifre. Jednostavno opišite što radite, a AI će pronaći ispravnu klasifikaciju za vaše račune.',
  },
  {
    icon: Building2,
    title: 'Srednja i velika poduzeća',
    description:
      'Upravljajte klasifikacijama za širok asortiman proizvoda i usluga. Pratite povijest i osigurajte dosljednost u izdavanju računa.',
  },
  {
    icon: Landmark,
    title: 'Javna uprava i institucije',
    description:
      'Pripremite se za Fiskalizaciju 2.0 na vrijeme. Osigurajte usklađenost sa zakonskim zahtjevima za eRačune.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    queries: '50',
    features: [
      '50 klasifikacija/mjesec',
      'Web sučelje',
      'Osnovna podrška',
      'Povijest klasifikacija',
    ],
  },
  {
    name: 'Starter',
    price: '9',
    queries: '500',
    features: [
      '500 klasifikacija/mjesec',
      'Neograničena povijest',
      'Email podrška',
      'Izvoz u CSV',
    ],
    popular: true,
  },
  {
    name: 'Pro',
    price: '19',
    queries: '2.000',
    features: [
      '2.000 klasifikacija/mjesec',
      'Batch klasifikacija',
      'Prioritetna podrška',
      'Napredna analitika',
    ],
  },
  {
    name: 'Business',
    price: '49',
    queries: '10.000',
    features: [
      '10.000 klasifikacija/mjesec',
      'Webhooks',
      'SLA 99.9%',
      'Dedicirana podrška',
    ],
  },
];

const stats = [
  { value: '3.300+', label: 'KPD šifri', icon: FileText },
  { value: 'Prikazana', label: 'pouzdanost', icon: Shield },
  { value: '10-60s', label: 'po upitu', icon: Clock },
  { value: '24/7', label: 'dostupnost', icon: Zap },
];

export default function HomePage() {
  return (
    <>
      <JsonLd />
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
                <span className="kpd-logo__subtext">asistent by 2klika</span>
              </div>
            </Link>

            <nav className="kpd-nav">
              <a href="#features" className="kpd-nav__link">
                Značajke
              </a>
              <a href="#how-it-works" className="kpd-nav__link">
                Kako radi
              </a>
              <Link href="/pricing" className="kpd-nav__link">
                Cijene
              </Link>
              <Link href="/faq" className="kpd-nav__link">
                FAQ
              </Link>
            </nav>

            <div className="kpd-header__actions">
              <ConditionalSignedOut>
                <Link href="/login" className="kpd-nav__link">
                  Prijava
                </Link>
                <Link
                  href="/register"
                  className="kpd-btn kpd-btn--primary kpd-btn--sm"
                >
                  Registracija
                </Link>
              </ConditionalSignedOut>
              <ConditionalSignedIn>
                <Link
                  href="/dashboard"
                  className="kpd-btn kpd-btn--primary kpd-btn--sm"
                >
                  Dashboard
                  <ArrowRight className="kpd-btn__icon" />
                </Link>
              </ConditionalSignedIn>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="kpd-hero">
          <div className="kpd-hero__bg"></div>
          <div className="kpd-hero__content">
            <div className="kpd-hero__badge">
              <Sparkles className="kpd-hero__badge-icon" />
              <span>Powered by Google</span>
            </div>

            <h1 className="kpd-heading-1">
              Fiskalizacija 2.0 zahtijeva
              <span className="kpd-text-gradient"> KPD šifre</span>
            </h1>

            <p className="kpd-hero__subtitle">
              Od <strong>1.1.2026.</strong> svaki eRačun mora sadržavati
              6-znamenkastu KPD šifru proizvoda ili usluge. Pronađite točnu
              klasifikaciju brže nego ikad - bez ručnog pretraživanja tablica.
            </p>

            <div className="kpd-hero__cta">
              <ConditionalSignedOut>
                <Link
                  href="/register"
                  className="kpd-btn kpd-btn--primary kpd-btn--lg"
                >
                  Započnite besplatno
                  <ArrowRight className="kpd-btn__icon" />
                </Link>
              </ConditionalSignedOut>
              <ConditionalSignedIn>
                <Link
                  href="/classify"
                  className="kpd-btn kpd-btn--primary kpd-btn--lg"
                >
                  Klasificiraj odmah
                  <ArrowRight className="kpd-btn__icon" />
                </Link>
              </ConditionalSignedIn>
              <a
                href="#how-it-works"
                className="kpd-btn kpd-btn--secondary kpd-btn--lg"
              >
                Kako funkcionira?
              </a>
            </div>

            {/* Trust Stats */}
            <div className="kpd-hero__stats">
              {stats.map((stat) => (
                <div key={stat.label} className="kpd-hero__stat">
                  <stat.icon className="kpd-hero__stat-icon" />
                  <span className="kpd-hero__stat-value">{stat.value}</span>
                  <span className="kpd-hero__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="kpd-section">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Zašto AI KPD Klasifikator?</h2>
              <p className="kpd-section__subtitle">
                Klasifikacija proizvoda po djelatnostima (KPD) je obvezna za sve
                koji izdaju eRačune. Naš AI alat analizira vaš opis i predlaže
                najprikladnije šifre - brzo, pouzdano i jednostavno.
              </p>
            </div>

            <div className="kpd-features-grid">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="kpd-feature-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="kpd-feature-card__icon">
                    <feature.icon />
                  </div>
                  <h3 className="kpd-feature-card__title">{feature.title}</h3>
                  <p className="kpd-feature-card__description">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="kpd-section kpd-section--alt">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Kako funkcionira?</h2>
              <p className="kpd-section__subtitle">
                Tri jednostavna koraka do točne KPD klasifikacije vaše
                djelatnosti.
              </p>
            </div>

            <div className="kpd-steps">
              {steps.map((step, index) => (
                <div key={step.number} className="kpd-step">
                  <div className="kpd-step__number">{step.number}</div>
                  <h3 className="kpd-step__title">{step.title}</h3>
                  <p className="kpd-step__description">{step.description}</p>
                  {index < steps.length - 1 && (
                    <div className="kpd-step__connector"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audience Section */}
        <section id="audience" className="kpd-section">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Za koga je AI KPD Klasifikator?</h2>
              <p className="kpd-section__subtitle">
                Bez obzira jeste li samostalni poduzetnik ili vodite veliki
                knjigovodstveni servis, AI KPD Klasifikator pojednostavljuje
                klasifikaciju za sve.
              </p>
            </div>

            <div className="kpd-audience-grid">
              {audiences.map((audience, index) => (
                <div
                  key={audience.title}
                  className="kpd-audience-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="kpd-audience-card__icon">
                    <audience.icon />
                  </div>
                  <h3 className="kpd-audience-card__title">{audience.title}</h3>
                  <p className="kpd-audience-card__description">
                    {audience.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="kpd-section kpd-section--alt">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Jednostavne cijene</h2>
              <p className="kpd-section__subtitle">
                Odaberite plan koji odgovara vašim potrebama. Bez skrivenih
                troškova.
              </p>
            </div>

            <div className="kpd-pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`kpd-pricing-card ${plan.popular ? 'kpd-pricing-card--popular' : ''}`}
                >
                  {plan.popular && (
                    <span className="kpd-pricing-card__badge">
                      Najpopularnije
                    </span>
                  )}
                  <h3 className="kpd-pricing-card__name">{plan.name}</h3>
                  <div className="kpd-pricing-card__price">
                    <span className="kpd-pricing-card__amount">
                      €{plan.price}
                    </span>
                    <span className="kpd-pricing-card__period">/mjesec</span>
                  </div>
                  <p className="kpd-pricing-card__queries">
                    {plan.queries} klasifikacija
                  </p>
                  <ul className="kpd-pricing-card__features">
                    {plan.features.map((feature) => (
                      <li key={feature} className="kpd-pricing-card__feature">
                        <CheckCircle className="kpd-pricing-card__check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`kpd-btn kpd-btn--full ${plan.popular ? 'kpd-btn--primary' : 'kpd-btn--secondary'}`}
                  >
                    Započni
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="kpd-cta">
          <div className="kpd-cta__bg"></div>
          <div className="kpd-container">
            <div className="kpd-cta__content">
              <h2 className="kpd-cta__title">
                Pripremite se za Fiskalizaciju 2.0
              </h2>
              <p className="kpd-cta__subtitle">
                Od 1. siječnja 2026. KPD šifre postaju obvezne na svim
                eRačunima. Započnite klasificirati svoje proizvode i usluge već
                danas.
              </p>
              <Link
                href="/register"
                className="kpd-btn kpd-btn--white kpd-btn--lg"
              >
                Kreirajte besplatni račun
                <ArrowRight className="kpd-btn__icon" />
              </Link>
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
                    <span className="kpd-logo__text kpd-logo__text--light">AI KPD Klasifikator</span>
                    <span className="kpd-logo__subtext kpd-logo__subtext--light">asistent by 2klika</span>
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
                  <a href="#features" className="kpd-footer__link">
                    Značajke
                  </a>
                  <Link href="/pricing" className="kpd-footer__link">
                    Cijene
                  </Link>
                  <a href="#how-it-works" className="kpd-footer__link">
                    Kako radi
                  </a>
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
              <p className="kpd-footer__copyright">
                © {new Date().getFullYear()} 2 KLIKA obrt. Sva prava pridržana.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

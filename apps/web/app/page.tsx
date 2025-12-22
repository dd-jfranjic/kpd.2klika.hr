import Link from 'next/link';
import {
  ConditionalSignedIn,
  ConditionalSignedOut,
} from '@/components/auth/auth-wrapper';
import {
  Zap,
  BarChart3,
  ArrowRight,
  Calculator,
  Store,
  Building2,
  Landmark,
  Target,
  Sparkles,
  ChevronDown,
  HelpCircle,
  Info,
} from 'lucide-react';
import { JsonLd } from '@/components/seo/json-ld';
import { PricingSection } from '@/components/landing/pricing-section';
import { BackToTop } from '@/components/back-to-top';
import { HeroMockupAnimated } from '@/components/landing/hero-mockup-animated';
import { MobileMenu } from '@/components/landing/mobile-menu';

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

const faqItems = [
  {
    question: 'Što je KPD šifra?',
    answer:
      'KPD (Klasifikacija Proizvoda po Djelatnostima) je 6-znamenkasta šifra koja klasificira proizvode i usluge prema vrsti ekonomske djelatnosti. Od 1. siječnja 2026. postaje obvezna na svim eRačunima u Hrvatskoj.',
  },
  {
    question: 'Kako AI KPD Klasifikator pronalazi šifre?',
    answer:
      'AI KPD Klasifikator koristi napredni Google jezični model koji razumije hrvatski jezik. Analizira vaš opis proizvoda ili usluge i uspoređuje ga s cijelom bazom od 5.726 KPD šifri kako bi pronašao najprikladnije klasifikacije.',
  },
  {
    question: 'Koliko je AI klasifikacija pouzdana?',
    answer:
      'AI pruža prijedloge s prikazanom razinom pouzdanosti za svaku klasifikaciju. Za visoko pouzdane rezultate (iznad 80%), AI je vrlo siguran u prijedlog. Za niže pouzdanosti, preporučujemo provjeru i eventualno preciziranje opisa.',
  },
  {
    question: 'Mogu li koristiti klasifikator besplatno?',
    answer:
      'Da! Nudimo besplatni plan s 3 AI upita mjesečno za isprobavanje. Za veće potrebe, dostupni su plaćeni planovi od 6,99 EUR/mj (10 upita) do 30,99 EUR/mj (50 upita) s dodatnim značajkama poput CSV izvoza i prioritetne podrške.',
  },
  {
    question: 'Jesu li moji podaci sigurni?',
    answer:
      'Da. Koristimo enkripciju za sve podatke u prijenosu i na pohrani. Vaši opisi se šalju Google AI servisu isključivo za potrebe klasifikacije i ne pohranjuju se trajno na njihovim serverima. Sustav je u skladu s GDPR propisima.',
  },
];

const stats = [
  { value: '5.726', label: 'KPD šifri u bazi' },
  { value: '24/7', label: 'dostupnost sustava' },
  { value: '10-60s', label: 'brzina obrade' },
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
                <span className="kpd-logo__subtext">created by 2klika</span>
              </div>
            </Link>

            <nav className="kpd-nav">
              <a href="#features" className="kpd-nav__link">
                Značajke
              </a>
              <a href="#how-it-works" className="kpd-nav__link">
                Kako radi
              </a>
              <a href="#pricing" className="kpd-nav__link">
                Cijene
              </a>
              <a href="#faq" className="kpd-nav__link">
                FAQ
              </a>
            </nav>

            <div className="kpd-header__actions">
              <ConditionalSignedOut>
                <Link href="/login" className="kpd-nav__link kpd-hide-mobile">
                  Prijava
                </Link>
                <Link
                  href="/register"
                  className="kpd-btn kpd-btn--primary kpd-btn--sm kpd-hide-mobile"
                >
                  Registracija
                </Link>
              </ConditionalSignedOut>
              <ConditionalSignedIn>
                <Link
                  href="/dashboard"
                  className="kpd-btn kpd-btn--primary kpd-btn--sm kpd-hide-mobile"
                >
                  Dashboard
                  <ArrowRight className="kpd-btn__icon" />
                </Link>
              </ConditionalSignedIn>
              <MobileMenu />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="kpd-hero">
          <div className="kpd-hero__bg"></div>
          <div className="kpd-hero__container">
            {/* Left side - Text content */}
            <div className="kpd-hero__content">
              <div className="kpd-hero__badge">
                <span className="kpd-hero__badge-dot"></span>
                <span>Powered by Google Cloud</span>
              </div>

              <h1 className="kpd-hero__title">
                Fiskalizacija 2.0: <span className="kpd-marker">KPD šifre</span> bez ručnog traženja
              </h1>

              <p className="kpd-hero__subtitle">
                Upišite stavku, a AI predloži odgovarajuću KPD šifru za e-račun. Jednostavno i brzo.
              </p>

              <div className="kpd-hero__cta">
                <ConditionalSignedOut>
                  <Link
                    href="/login"
                    className="kpd-btn kpd-btn--primary kpd-btn--lg"
                  >
                    Klasificiraj odmah
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
              </div>

              {/* Trust indicators */}
              <div className="kpd-hero__trust">
                <div className="kpd-hero__trust-avatars">
                  <span className="kpd-hero__trust-avatar">JF</span>
                  <span className="kpd-hero__trust-avatar">MK</span>
                  <span className="kpd-hero__trust-avatar">AP</span>
                </div>
                <span className="kpd-hero__trust-text">
                  Koriste računovođe i poduzetnici diljem Hrvatske
                </span>
              </div>
            </div>

            {/* Right side - Animated Mockup */}
            <HeroMockupAnimated />
          </div>
        </section>

        {/* Stats Section */}
        <section className="kpd-hero__stats-section">
          <div className="kpd-hero__stats">
            {stats.map((stat) => (
              <div key={stat.label} className="kpd-hero__stat">
                <span className="kpd-hero__stat-value">{stat.value}</span>
                <span className="kpd-hero__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="kpd-section kpd-section--features">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Zašto <span className="kpd-marker">AI KPD</span> Klasifikator?</h2>
              <p className="kpd-section__subtitle">
                Klasifikacija proizvoda po djelatnostima (KPD) je obvezna za sve
                koji izdaju eRačune. Naš AI alat analizira vaš opis i predlaže
                najprikladnije šifre - brzo, pouzdano i jednostavno.
              </p>
              <p className="kpd-section__highlight">
                <Sparkles className="kpd-section__highlight-icon" />
                <span>Dobijte uvid u <strong>hijerarhiju kategorija</strong> - od glavne djelatnosti do specifične podkategorije. AI objašnjava zašto je šifra prikladna i koje su alternativne opcije.</span>
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
        <section id="how-it-works" className="kpd-section">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Kako <span className="kpd-marker">funkcionira</span>?</h2>
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
        <section id="audience" className="kpd-section kpd-section--alt">
          <div className="kpd-container">
            <div className="kpd-section__header">
              <h2 className="kpd-heading-2">Za koga je <span className="kpd-marker">AI KPD</span> Klasifikator?</h2>
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
        <PricingSection />

        {/* FAQ Section */}
        <section id="faq" className="kpd-section kpd-section--faq">
          <div className="kpd-container kpd-container--narrow">
            <div className="kpd-section__header">
              <div className="kpd-section__badge">
                <HelpCircle className="w-4 h-4" />
                <span>Česta pitanja</span>
              </div>
              <h2 className="kpd-heading-2">
                Imate <span className="kpd-marker">pitanja</span>?
              </h2>
              <p className="kpd-section__subtitle">
                Pronađite odgovore na najčešća pitanja o KPD klasifikaciji i korištenju naše platforme.
              </p>
            </div>

            <div className="kpd-faq__list">
              {faqItems.map((item, index) => (
                <details key={index} className="kpd-faq__item">
                  <summary className="kpd-faq__question">
                    <span>{item.question}</span>
                    <ChevronDown className="kpd-faq__icon" />
                  </summary>
                  <div className="kpd-faq__answer">
                    <p>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>

            <div className="kpd-faq__more">
              <Link href="/faq" className="kpd-btn kpd-btn--outline kpd-btn--md">
                Pogledaj sva pitanja
                <ArrowRight className="kpd-btn__icon" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="kpd-cta">
          <div className="kpd-cta__bg"></div>
          <div className="kpd-container">
            <div className="kpd-cta__content">
              <h2 className="kpd-cta__title">
                Pripremite se za <span className="kpd-marker">Fiskalizaciju 2.0</span>
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

        {/* Disclaimer */}
        <section className="kpd-disclaimer">
          <div className="kpd-container">
            <div className="kpd-disclaimer__content">
              <Info className="kpd-disclaimer__icon" />
              <p className="kpd-disclaimer__text">
                <strong>Napomena:</strong> AI KPD Klasifikator je pomoćni alat koji daje prijedloge klasifikacija.
                Rezultati ne predstavljaju službeno pravno ili porezno mišljenje.
                Korisnik je odgovoran za provjeru i odabir konačne KPD šifre.
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
                    <span className="kpd-logo__text kpd-logo__text--light">AI KPD Klasifikator</span>
                    <span className="kpd-logo__subtext kpd-logo__subtext--light">created by 2klika</span>
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
                  <a href="#pricing" className="kpd-footer__link">
                    Cijene
                  </a>
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
              <p className="kpd-footer__disclaimer">
                AI klasifikacija je pomoćni alat — provjerite KPD šifre prije službene upotrebe.
              </p>
              <p className="kpd-footer__copyright">
                © {new Date().getFullYear()} 2 KLIKA obrt. Sva prava pridržana.
              </p>
            </div>
          </div>
        </footer>

        {/* Back to Top Button */}
        <BackToTop />
      </div>
    </>
  );
}

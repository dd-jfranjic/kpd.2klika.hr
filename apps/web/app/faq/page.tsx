import Link from 'next/link';
import { Metadata } from 'next';
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Često postavljana pitanja | AI KPD Klasifikator',
  description:
    'Pronađite odgovore na najčešća pitanja o KPD klasifikaciji, Fiskalizaciji 2.0 i AI KPD Klasifikatoru.',
};

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  // O KPD šiframa
  {
    category: 'O KPD šiframa',
    question: 'Što je KPD šifra?',
    answer:
      'KPD (Klasifikacija Proizvoda po Djelatnostima) je 6-znamenkasta numerička šifra koja klasificira proizvode i usluge prema vrsti ekonomske djelatnosti. Temelji se na europskoj CPA klasifikaciji (Classification of Products by Activity) i koristi se za statističke i porezne svrhe.',
  },
  {
    category: 'O KPD šiframa',
    question: 'Koliko KPD šifri postoji?',
    answer:
      'Službena KPD klasifikacija sadrži preko 3.300 različitih šifri, organiziranih u hijerarhijsku strukturu od 21 sekcije (A-U), 88 odjeljaka, 261 skupina, 575 razreda i 1.342 kategorije.',
  },
  {
    category: 'O KPD šiframa',
    question: 'Gdje mogu pronaći službenu listu KPD šifri?',
    answer:
      'Službena lista KPD šifri dostupna je na stranicama Državnog zavoda za statistiku (DZS). AI KPD Klasifikator koristi ažuriranu bazu svih službenih šifri i omogućuje brzo pretraživanje pomoću AI tehnologije.',
  },
  // O Fiskalizaciji 2.0
  {
    category: 'Fiskalizacija 2.0',
    question: 'Što je Fiskalizacija 2.0?',
    answer:
      'Fiskalizacija 2.0 je nadogradnja sustava fiskalizacije u Hrvatskoj koja uvodi nove zahtjeve za eRačune. Jedna od ključnih novosti je obveza navođenja KPD šifre za svaku stavku na računu, počevši od 1. siječnja 2026.',
  },
  {
    category: 'Fiskalizacija 2.0',
    question: 'Kada KPD šifre postaju obvezne?',
    answer:
      'Od 1. siječnja 2026. svaki eRačun u Hrvatskoj mora sadržavati KPD šifru za svaku stavku (proizvod ili uslugu). Preporučujemo da se pripremite unaprijed i klasificirate svoje proizvode i usluge prije tog datuma.',
  },
  {
    category: 'Fiskalizacija 2.0',
    question: 'Tko mora koristiti KPD šifre?',
    answer:
      'Svi porezni obveznici koji izdaju eRačune moraju uključiti KPD šifre. To uključuje poduzetnike, obrtnike, računovođe, knjigovodstvene servise i sve koji posluju s poslovnim subjektima ili javnim sektorom.',
  },
  // O AI KPD Klasifikatoru
  {
    category: 'AI KPD Klasifikator',
    question: 'Kako AI KPD Klasifikator pronalazi šifre?',
    answer:
      'AI KPD Klasifikator koristi napredni Google jezični model koji razumije hrvatski jezik. Analizira vaš opis proizvoda ili usluge i uspoređuje ga s cijelom bazom KPD šifri kako bi pronašao najprikladnije klasifikacije. Svaki rezultat dolazi s prikazom razine pouzdanosti.',
  },
  {
    category: 'AI KPD Klasifikator',
    question: 'Koliko je AI klasifikacija pouzdana?',
    answer:
      'AI pruža prijedloge s prikazanom razinom pouzdanosti za svaku klasifikaciju. Za visoko pouzdane rezultate (iznad 80%), AI je vrlo siguran u prijedlog. Za niže pouzdanosti, preporučujemo provjeru i eventualno preciziranje opisa.',
  },
  {
    category: 'AI KPD Klasifikator',
    question: 'Mogu li koristiti klasifikator besplatno?',
    answer:
      'Da! Nudimo besplatni plan s 50 klasifikacija mjesečno. Za veće potrebe, dostupni su plaćeni planovi koji nude više klasifikacija, dodatne značajke poput batch obrade i prioritetnu podršku.',
  },
  {
    category: 'AI KPD Klasifikator',
    question: 'Kako započeti s korištenjem?',
    answer:
      'Jednostavno se registrirajte s email adresom, potvrdite račun i odmah možete započeti s klasifikacijom. Unesite opis proizvoda ili usluge na hrvatskom jeziku, a AI će predložiti odgovarajuće KPD šifre.',
  },
  // Tehnička pitanja
  {
    category: 'Tehnička pitanja',
    question: 'Mogu li izvesti svoje klasifikacije?',
    answer:
      'Da, na plaćenim planovima možete izvesti sve svoje klasifikacije u CSV formatu. Ovo je korisno za integraciju s vašim računovodstvenim softverom ili za evidenciju.',
  },
  {
    category: 'Tehnička pitanja',
    question: 'Jesu li moji podaci sigurni?',
    answer:
      'Apsolutno. Koristimo enkripciju za sve podatke u prijenosu i na pohrani. Vaši opisi proizvoda i klasifikacije nisu dijeljeni s trećim stranama. Sustav je u skladu s GDPR propisima.',
  },
  {
    category: 'Tehnička pitanja',
    question: 'Postoji li API za integraciju?',
    answer:
      'Trenutno radimo na API-ju koji će omogućiti direktnu integraciju s vašim sustavima. Kontaktirajte nas na info@2klika.hr za više informacija o beta pristupstvu.',
  },
  // Planovi i plaćanje
  {
    category: 'Planovi i plaćanje',
    question: 'Koji plan mi je potreban?',
    answer:
      'Za pojedinačne poduzetnike s manjim brojem različitih proizvoda, besplatni ili Starter plan je dovoljan. Računovođe i tvrtke s većim asortimanom trebale bi razmotriti Pro ili Business plan za veći broj klasifikacija i dodatne značajke.',
  },
  {
    category: 'Planovi i plaćanje',
    question: 'Kako funkcionira naplata?',
    answer:
      'Naplata se vrši mjesečno putem kartice (Visa, Mastercard). Možete otkazati pretplatu u bilo kojem trenutku. Nakon otkazivanja, zadržavate pristup do kraja plaćenog razdoblja.',
  },
  {
    category: 'Planovi i plaćanje',
    question: 'Mogu li nadograditi ili smanjiti plan?',
    answer:
      'Da, plan možete promijeniti u bilo kojem trenutku iz postavki računa. Promjena stupa na snagu od sljedećeg obračunskog razdoblja.',
  },
];

const categories = [...new Set(faqItems.map((item) => item.category))];

export default function FAQPage() {
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
              <span className="kpd-logo__subtext">asistent by 2klika</span>
            </div>
          </Link>

          <nav className="kpd-nav">
            <Link href="/#features" className="kpd-nav__link">
              Značajke
            </Link>
            <Link href="/#how-it-works" className="kpd-nav__link">
              Kako radi
            </Link>
            <Link href="/pricing" className="kpd-nav__link">
              Cijene
            </Link>
            <Link href="/faq" className="kpd-nav__link kpd-nav__link--active">
              FAQ
            </Link>
          </nav>

          <div className="kpd-header__actions">
            <Link href="/login" className="kpd-nav__link">
              Prijava
            </Link>
            <Link href="/register" className="kpd-btn kpd-btn--primary kpd-btn--sm">
              Registracija
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="kpd-hero kpd-hero--compact">
        <div className="kpd-hero__bg"></div>
        <div className="kpd-hero__content">
          <div className="kpd-hero__badge">
            <HelpCircle className="kpd-hero__badge-icon" />
            <span>Pomoć i podrška</span>
          </div>

          <h1 className="kpd-heading-1">
            Često postavljana
            <span className="kpd-text-gradient"> pitanja</span>
          </h1>

          <p className="kpd-hero__subtitle">
            Pronađite odgovore na najčešća pitanja o KPD klasifikaciji,
            Fiskalizaciji 2.0 i korištenju AI KPD Klasifikatora.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="kpd-section">
        <div className="kpd-container kpd-container--narrow">
          {categories.map((category) => (
            <div key={category} className="kpd-faq__category">
              <h2 className="kpd-faq__category-title">{category}</h2>
              <div className="kpd-faq__list">
                {faqItems
                  .filter((item) => item.category === category)
                  .map((item, index) => (
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
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="kpd-cta">
        <div className="kpd-cta__bg"></div>
        <div className="kpd-container">
          <div className="kpd-cta__content">
            <h2 className="kpd-cta__title">Niste pronašli odgovor?</h2>
            <p className="kpd-cta__subtitle">
              Kontaktirajte nas na{' '}
              <a href="mailto:info@2klika.hr" className="kpd-cta__link">
                info@2klika.hr
              </a>{' '}
              i rado ćemo vam pomoći.
            </p>
            <div className="kpd-cta__buttons">
              <Link
                href="/register"
                className="kpd-btn kpd-btn--white kpd-btn--lg"
              >
                Započnite besplatno
                <ArrowRight className="kpd-btn__icon" />
              </Link>
              <Link
                href="/pricing"
                className="kpd-btn kpd-btn--outline-white kpd-btn--lg"
              >
                Pogledajte cijene
              </Link>
            </div>
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
                    asistent by 2klika
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

          <div className="kpd-footer__bottom">
            <p className="kpd-footer__copyright">
              © {new Date().getFullYear()} 2 KLIKA obrt. Sva prava pridržana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

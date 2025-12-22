import Link from 'next/link';
import { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { BackToTop } from '@/components/back-to-top';

export const metadata: Metadata = {
  title: 'Politika privatnosti | AI KPD Klasifikator',
  description:
    'Politika privatnosti AI KPD Klasifikator usluge. Saznajte kako prikupljamo, koristimo i štitimo vaše osobne podatke u skladu s GDPR-om. Enkripcija podataka, Google AI obrada i vaša prava.',
  alternates: {
    canonical: 'https://kpd.2klika.hr/privacy',
  },
};

export default function PrivacyPage() {
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
            <Link href="/pricing" className="kpd-nav__link">
              Cijene
            </Link>
            <a href="/#faq" className="kpd-nav__link">
              FAQ
            </a>
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
        <div className="kpd-container">
          <div className="kpd-hero__content kpd-hero__content--centered">
            <div className="kpd-hero__badge">
              <Shield className="kpd-hero__badge-icon" />
              <span>GDPR usklađeno</span>
            </div>

            <h1 className="kpd-heading-1">
              Politika
              <span className="kpd-text-gradient"> privatnosti</span>
            </h1>

            <p className="kpd-hero__subtitle">
              Zadnja izmjena: {new Date().toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="kpd-section">
        <div className="kpd-container kpd-container--narrow">
          <div className="kpd-legal">
            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">1. Voditelj obrade podataka</h2>
              <p>
                Voditelj obrade osobnih podataka je:
              </p>
              <div className="kpd-legal__contact">
                <p><strong>2 KLIKA</strong></p>
                <p>Obrt za promidžbu i računalne djelatnosti</p>
                <p>vl. Josip Franjić</p>
                <p>Kašinski odvojak 20a, 10360 Sesvete, Hrvatska</p>
                <p>OIB: 99991580018</p>
                <p>Email: <a href="mailto:info@2klika.hr">info@2klika.hr</a></p>
              </div>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">2. Koje podatke prikupljamo</h2>
              <p>Prikupljamo sljedeće kategorije osobnih podataka:</p>

              <h3 className="kpd-legal__subheading">2.1 Podaci koje nam izravno dostavljate</h3>
              <ul>
                <li><strong>Registracijski podaci:</strong> email adresa, ime, prezime (opcionalno)</li>
                <li><strong>Podaci o organizaciji:</strong> naziv tvrtke/obrta, OIB (opcionalno)</li>
                <li><strong>Podaci o plaćanju:</strong> obrađuje Stripe Inc. - mi ne pohranjujemo podatke o karticama</li>
                <li><strong>Upiti za klasifikaciju:</strong> opisi proizvoda/usluga koje unosite</li>
              </ul>

              <h3 className="kpd-legal__subheading">2.2 Automatski prikupljeni podaci</h3>
              <ul>
                <li><strong>Tehnički podaci:</strong> IP adresa, vrsta preglednika, operativni sustav</li>
                <li><strong>Podaci o korištenju:</strong> vrijeme pristupa, pregledane stranice, akcije u aplikaciji</li>
                <li><strong>Kolačići:</strong> funkcionalni i analitički kolačići (vidi odjeljak 8)</li>
              </ul>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">3. Svrha i pravna osnova obrade</h2>
              <p>Vaše podatke obrađujemo za sljedeće svrhe:</p>

              <table className="kpd-legal__table">
                <thead>
                  <tr>
                    <th>Svrha</th>
                    <th>Pravna osnova (GDPR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pružanje usluge AI klasifikacije</td>
                    <td>Članak 6(1)(b) - izvršenje ugovora</td>
                  </tr>
                  <tr>
                    <td>Obrada plaćanja</td>
                    <td>Članak 6(1)(b) - izvršenje ugovora</td>
                  </tr>
                  <tr>
                    <td>Slanje obavijesti o usluzi</td>
                    <td>Članak 6(1)(b) - izvršenje ugovora</td>
                  </tr>
                  <tr>
                    <td>Poboljšanje usluge i analitika</td>
                    <td>Članak 6(1)(f) - legitimni interes</td>
                  </tr>
                  <tr>
                    <td>Marketing i promotivne poruke</td>
                    <td>Članak 6(1)(a) - privola</td>
                  </tr>
                  <tr>
                    <td>Usklađenost sa zakonom</td>
                    <td>Članak 6(1)(c) - pravna obveza</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">4. Dijeljenje podataka s trećim stranama</h2>
              <p>Vaše podatke dijelimo sa sljedećim kategorijama primatelja:</p>
              <ul>
                <li>
                  <strong>Stripe Inc.</strong> - obrada plaćanja (SAD, EU-US Data Privacy Framework)
                </li>
                <li>
                  <strong>Google Cloud Platform</strong> - hosting i AI obrada (EU regija, standardne ugovorne klauzule)
                </li>
                <li>
                  <strong>ANGARA d.o.o.</strong> - partner za naplatu (Hrvatska)
                </li>
              </ul>
              <p>
                Ne prodajemo vaše osobne podatke trećim stranama. Podaci se dijele isključivo
                u mjeri potrebnoj za pružanje usluge.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">5. Prijenos podataka izvan EU</h2>
              <p>
                Neki naši pružatelji usluga nalaze se izvan Europskog gospodarskog prostora (EGP).
                U tim slučajevima osiguravamo odgovarajuće zaštitne mjere:
              </p>
              <ul>
                <li>EU-US Data Privacy Framework (za pružatelje iz SAD-a)</li>
                <li>Standardne ugovorne klauzule EU komisije</li>
                <li>Procjena prikladnosti od strane EU komisije</li>
              </ul>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">6. Razdoblje čuvanja podataka</h2>
              <table className="kpd-legal__table">
                <thead>
                  <tr>
                    <th>Vrsta podataka</th>
                    <th>Razdoblje čuvanja</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Korisnički račun i profil</td>
                    <td>Do zatvaranja računa + 30 dana</td>
                  </tr>
                  <tr>
                    <td>Povijest klasifikacija</td>
                    <td>Do zatvaranja računa</td>
                  </tr>
                  <tr>
                    <td>Podaci o transakcijama</td>
                    <td>11 godina (zakonska obveza)</td>
                  </tr>
                  <tr>
                    <td>Analitički podaci</td>
                    <td>26 mjeseci (anonimizirano)</td>
                  </tr>
                  <tr>
                    <td>Sigurnosni logovi</td>
                    <td>12 mjeseci</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">7. Vaša prava</h2>
              <p>Sukladno GDPR-u imate sljedeća prava:</p>
              <ul>
                <li>
                  <strong>Pravo pristupa</strong> - zatražite kopiju vaših osobnih podataka
                </li>
                <li>
                  <strong>Pravo na ispravak</strong> - ispravite netočne ili nepotpune podatke
                </li>
                <li>
                  <strong>Pravo na brisanje</strong> - zatražite brisanje vaših podataka ("pravo na zaborav")
                </li>
                <li>
                  <strong>Pravo na ograničenje obrade</strong> - ograničite način obrade vaših podataka
                </li>
                <li>
                  <strong>Pravo na prenosivost</strong> - preuzmite podatke u strukturiranom formatu
                </li>
                <li>
                  <strong>Pravo na prigovor</strong> - uložite prigovor na obradu temeljenu na legitimnom interesu
                </li>
                <li>
                  <strong>Pravo na povlačenje privole</strong> - povucite privolu u bilo kojem trenutku
                </li>
              </ul>
              <p>
                Za ostvarivanje svojih prava kontaktirajte nas na <a href="mailto:info@2klika.hr">info@2klika.hr</a>.
                Odgovorit ćemo na vaš zahtjev u roku od 30 dana.
              </p>
              <p>
                Ako smatrate da je obrada vaših podataka u suprotnosti s GDPR-om, imate pravo
                podnijeti pritužbu <strong>Agenciji za zaštitu osobnih podataka (AZOP)</strong>,
                Selska cesta 136, 10000 Zagreb, <a href="https://azop.hr" target="_blank" rel="noopener">www.azop.hr</a>.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">8. Kolačići</h2>
              <p>Koristimo sljedeće vrste kolačića:</p>

              <h3 className="kpd-legal__subheading">8.1 Nužni kolačići</h3>
              <p>
                Potrebni za rad stranice (prijava, sigurnost). Ne možete ih isključiti.
              </p>

              <h3 className="kpd-legal__subheading">8.2 Funkcionalni kolačići</h3>
              <p>
                Pamte vaše postavke (jezik, preferencije prikaza).
              </p>

              <h3 className="kpd-legal__subheading">8.3 Analitički kolačići</h3>
              <p>
                Pomažu nam razumjeti kako koristite stranicu. Podaci su anonimizirani.
              </p>

              <p>
                Možete upravljati kolačićima putem postavki vašeg preglednika. Imajte na umu da
                isključivanje nekih kolačića može utjecati na funkcionalnost stranice.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">9. Sigurnost podataka</h2>
              <p>Primjenjujemo odgovarajuće tehničke i organizacijske mjere za zaštitu vaših podataka:</p>
              <ul>
                <li>Enkripcija podataka u prijenosu (TLS 1.3) i na pohrani</li>
                <li>Redovite sigurnosne provjere i penetracijsko testiranje</li>
                <li>Ograničen pristup podacima samo ovlaštenim osobama</li>
                <li>Sigurnosno kopiranje podataka</li>
                <li>Hosting u certificiranim podatkovnim centrima (ISO 27001)</li>
              </ul>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">10. Djeca</h2>
              <p>
                Naša usluga nije namijenjena osobama mlađim od 16 godina. Ne prikupljamo
                svjesno osobne podatke djece. Ako saznamo da smo prikupili podatke djeteta,
                odmah ćemo ih izbrisati.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">11. Izmjene politike privatnosti</h2>
              <p>
                Ovu Politiku privatnosti možemo povremeno ažurirati. O značajnim promjenama
                obavijestit ćemo vas putem email adrese ili obavijesti u aplikaciji prije
                stupanja na snagu.
              </p>
              <p>
                Preporučujemo povremeno pregledavanje ove stranice kako biste bili informirani
                o našim praksama zaštite podataka.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">12. Kontakt za pitanja o privatnosti</h2>
              <p>
                Za sva pitanja vezana uz zaštitu vaših osobnih podataka, molimo kontaktirajte nas:
              </p>
              <div className="kpd-legal__contact">
                <p><strong>2 KLIKA - Služba za zaštitu podataka</strong></p>
                <p>Email: <a href="mailto:info@2klika.hr">info@2klika.hr</a></p>
                <p>Adresa: Kašinski odvojak 20a, 10360 Sesvete, Hrvatska</p>
              </div>
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

          <div className="kpd-footer__bottom">
            <p className="kpd-footer__disclaimer">
              AI klasifikacija je pomoćni alat — provjerite KPD šifre prije službene upotrebe.
            </p>
            <p className="kpd-footer__copyright">
              &copy; {new Date().getFullYear()} 2 KLIKA obrt. Sva prava pridržana.
            </p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}

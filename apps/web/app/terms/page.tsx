import Link from 'next/link';
import { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { BackToTop } from '@/components/back-to-top';

export const metadata: Metadata = {
  title: 'Uvjeti korištenja | AI KPD Klasifikator',
  description:
    'Uvjeti korištenja AI KPD Klasifikator usluge. Saznajte više o pravilima korištenja, pretplatama, naplatama putem Stripe platforme, ograničenjima odgovornosti i zaštiti podataka prema GDPR-u.',
  alternates: {
    canonical: 'https://kpd.2klika.hr/terms',
  },
};

export default function TermsPage() {
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
              <FileText className="kpd-hero__badge-icon" />
              <span>Pravni dokumenti</span>
            </div>

            <h1 className="kpd-heading-1">
              Uvjeti
              <span className="kpd-text-gradient"> korištenja</span>
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
              <h2 className="kpd-legal__heading">1. Opće odredbe</h2>
              <p>
                Ovi Uvjeti korištenja (u daljnjem tekstu: "Uvjeti") reguliraju odnos između pružatelja usluge
                <strong> 2 KLIKA</strong>, obrt za promidžbu i računalne djelatnosti, vl. Josip Franjić,
                Kašinski odvojak 20a, 10360 Sesvete, OIB: 99991580018, MBS: 97131652 (u daljnjem tekstu: "Pružatelj")
                i korisnika usluge AI KPD Klasifikator (u daljnjem tekstu: "Korisnik").
              </p>
              <p>
                Korištenjem usluge AI KPD Klasifikator dostupne na web stranici kpd.2klika.hr
                (u daljnjem tekstu: "Usluga"), Korisnik potvrđuje da je pročitao, razumio i prihvatio ove Uvjete.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">2. Opis usluge</h2>
              <p>
                AI KPD Klasifikator je web aplikacija koja koristi tehnologiju umjetne inteligencije za
                klasifikaciju proizvoda i usluga prema Klasifikaciji proizvoda po djelatnostima (KPD).
              </p>
              <p>Usluga uključuje:</p>
              <ul>
                <li>AI potpomognutu klasifikaciju proizvoda i usluga na hrvatskom jeziku</li>
                <li>Pretraživanje baze KPD šifri</li>
                <li>Spremanje povijesti klasifikacija</li>
                <li>Izvoz podataka (ovisno o planu pretplate)</li>
              </ul>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">3. Registracija i korisnički račun</h2>
              <p>
                Za korištenje Usluge potrebna je registracija putem valjane email adrese.
                Korisnik jamči da su svi podaci uneseni tijekom registracije točni i ažurni.
              </p>
              <p>
                Korisnik je odgovoran za čuvanje povjerljivosti svojih pristupnih podataka i za sve
                aktivnosti koje se odvijaju putem njegovog računa.
              </p>
              <p>
                Pružatelj zadržava pravo suspendirati ili ukinuti korisnički račun u slučaju kršenja ovih Uvjeta
                ili sumnje na zlouporabu usluge.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">4. Planovi pretplate i plaćanje</h2>
              <p>
                Usluga je dostupna kroz različite planove pretplate - besplatni i plaćeni planovi.
                Svaki plan ima definiran broj dopuštenih klasifikacija i dostupnih značajki.
              </p>
              <p>
                Partner za naplatu je <strong>ANGARA d.o.o.</strong>, OIB: 95745406877.
                Plaćanje se vrši putem platforme Stripe koja podržava kartice Visa i Mastercard.
              </p>
              <p>
                Pretplata se automatski obnavlja na kraju obračunskog razdoblja osim ako Korisnik
                ne otkaže pretplatu prije isteka. Korisnik zadržava pristup plaćenim značajkama
                do kraja plaćenog razdoblja.
              </p>
              <p>
                Povrat sredstava moguć je u roku od 14 dana od plaćanja, u skladu s pravima potrošača prema
                Zakonu o zaštiti potrošača (NN 19/22), pod uvjetom da usluga nije značajno korištena.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">5. Ograničenje odgovornosti</h2>
              <div className="kpd-legal__warning">
                <p>
                  <strong>VAŽNO UPOZORENJE:</strong> AI KPD Klasifikator je isključivo pomoćni alat za
                  pronalaženje prikladnih KPD šifri. Rezultati koje pruža AI KPD Klasifikator predstavljaju
                  prijedloge temeljene na umjetnoj inteligenciji i <strong>NE predstavljaju</strong> službeno
                  pravno, porezno ili računovodstveno mišljenje.
                </p>
              </div>
              <p>Korisnik je <strong>ISKLJUČIVO</strong> odgovoran za:</p>
              <ul>
                <li>Provjeru točnosti predložene KPD šifre</li>
                <li>Odabir konačne šifre za svoje proizvode i usluge</li>
                <li>Usklađenost s važećim propisima Republike Hrvatske</li>
              </ul>
              <p>Pružatelj usluge ne snosi nikakvu odgovornost za:</p>
              <ul>
                <li>Eventualne pogreške u AI klasifikaciji</li>
                <li>Kazne, poreze ili druge financijske posljedice</li>
                <li>Štetu nastalu korištenjem predloženih šifri</li>
              </ul>
              <p>
                Za službeno tumačenje KPD klasifikacije preporučujemo konzultaciju s Državnim zavodom
                za statistiku ili ovlaštenim poreznim savjetnikom.
              </p>
              <p>
                Pružatelj nastoji osigurati dostupnost usluge 24/7, ali ne jamči neprekidan rad
                sustava. Pružatelj ne odgovara za štetu nastalu zbog privremene nedostupnosti usluge.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">6. Intelektualno vlasništvo</h2>
              <p>
                Sav sadržaj Usluge, uključujući ali ne ograničavajući se na softver, dizajn, tekstove,
                grafike i logotipe, vlasništvo je Pružatelja ili njegovih davatelja licence i zaštićen
                je zakonima o intelektualnom vlasništvu.
              </p>
              <p>
                Korištenjem Usluge Korisnik ne stječe nikakva vlasnička prava nad sadržajem Usluge
                osim prava korištenja u skladu s planom pretplate.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">7. Zaštita podataka</h2>
              <p>
                Pružatelj prikuplja i obrađuje osobne podatke Korisnika u skladu s Općom uredbom o
                zaštiti podataka (GDPR) i hrvatskim Zakonom o provedbi Opće uredbe o zaštiti podataka.
              </p>
              <p>
                Detaljne informacije o prikupljanju, obradi i zaštiti osobnih podataka dostupne su
                u <Link href="/privacy" className="kpd-legal__link">Politici privatnosti</Link>.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">8. Prihvatljivo korištenje</h2>
              <p>Korisnik se obvezuje da neće:</p>
              <ul>
                <li>Koristiti Uslugu za nezakonite svrhe</li>
                <li>Pokušavati pristupiti sustavu neovlaštenim metodama</li>
                <li>Preopteretiti sustav automatiziranim upitima bez prethodnog odobrenja</li>
                <li>Dijeliti pristupne podatke s trećim osobama</li>
                <li>Preprodavati ili redistribuirati Uslugu bez pisanog odobrenja</li>
              </ul>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">9. Izmjene uvjeta</h2>
              <p>
                Pružatelj zadržava pravo izmjene ovih Uvjeta u bilo kojem trenutku. O značajnim
                izmjenama Korisnici će biti obaviješteni putem email adrese ili obavijesti u aplikaciji
                najmanje 14 dana prije stupanja izmjena na snagu.
              </p>
              <p>
                Nastavak korištenja Usluge nakon stupanja izmjena na snagu smatra se prihvaćanjem
                izmijenjenih Uvjeta.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">10. Raskid ugovora</h2>
              <p>
                Korisnik može u bilo kojem trenutku zatvoriti svoj račun putem postavki u aplikaciji
                ili kontaktiranjem korisničke podrške na info@2klika.hr.
              </p>
              <p>
                Pružatelj može raskinuti ugovor i ukinuti korisnički račun u slučaju ozbiljnog
                kršenja ovih Uvjeta, nakon prethodne obavijesti Korisniku.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">11. Mjerodavno pravo i rješavanje sporova</h2>
              <p>
                Na ove Uvjete primjenjuje se pravo Republike Hrvatske. Za sve sporove koji mogu
                proizaći iz korištenja Usluge nadležan je stvarno nadležan sud u Zagrebu.
              </p>
              <p>
                Prije pokretanja sudskog postupka, strane će nastojati spor riješiti mirnim putem.
              </p>
            </div>

            <div className="kpd-legal__section">
              <h2 className="kpd-legal__heading">12. Kontakt</h2>
              <p>Za sva pitanja vezana uz ove Uvjete, molimo kontaktirajte nas:</p>
              <div className="kpd-legal__contact">
                <p><strong>2 KLIKA</strong></p>
                <p>Obrt za promidžbu i računalne djelatnosti</p>
                <p>vl. Josip Franjić</p>
                <p>Kašinski odvojak 20a, 10360 Sesvete</p>
                <p>OIB: 99991580018</p>
                <p>Email: <a href="mailto:info@2klika.hr">info@2klika.hr</a></p>
                <p>Web: <a href="https://2klika.hr" target="_blank" rel="noopener">www.2klika.hr</a></p>
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

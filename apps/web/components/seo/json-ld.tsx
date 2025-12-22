import Script from 'next/script';

// JSON-LD Structured Data for AI KPD Klasifikator
const softwareData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI KPD Klasifikator',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI klasifikacija proizvoda i usluga prema KPD standardu za Fiskalizaciju 2.0. Od 1.1.2026. obvezno za eRačune.',
  url: 'https://kpd.2klika.hr',
  author: {
    '@type': 'Organization',
    name: '2 KLIKA obrt',
    url: 'https://2klika.hr',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kašinski odvojak 20a',
      addressLocality: 'Sesvete',
      postalCode: '10360',
      addressCountry: 'HR',
    },
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'KPD Starter',
      price: '0',
      priceCurrency: 'EUR',
      description: '3 AI upita mjesečno, 1 korisnik',
    },
    {
      '@type': 'Offer',
      name: 'KPD Plus',
      price: '6.99',
      priceCurrency: 'EUR',
      description: '10 AI upita mjesečno, do 2 člana tima',
    },
    {
      '@type': 'Offer',
      name: 'KPD Pro',
      price: '11.99',
      priceCurrency: 'EUR',
      description: '20 AI upita mjesečno, do 5 članova tima, CSV izvoz',
    },
    {
      '@type': 'Offer',
      name: 'KPD Business',
      price: '30.99',
      priceCurrency: 'EUR',
      description: '50 AI upita mjesečno, do 10 članova tima, CSV izvoz',
    },
    {
      '@type': 'Offer',
      name: 'KPD Enterprise',
      price: '199',
      priceCurrency: 'EUR',
      description: '2500 AI upita mjesečno, neograničen broj članova',
    },
  ],
  featureList: [
    'AI klasifikacija proizvoda i usluga',
    '5.726 KPD šifri u bazi',
    'Prikazana razina pouzdanosti',
    'Povijest klasifikacija',
    'Izvoz podataka u CSV',
    'Fiskalizacija 2.0 usklađenost',
  ],
};

// FAQPage Schema for better search visibility
const faqData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Što je KPD šifra?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'KPD (Klasifikacija Proizvoda po Djelatnostima) je 6-znamenkasta šifra koja klasificira proizvode i usluge prema vrsti ekonomske djelatnosti. Od 1. siječnja 2026. postaje obvezna na svim eRačunima u Hrvatskoj.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kako AI KPD Klasifikator pronalazi šifre?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI KPD Klasifikator koristi napredni Google jezični model koji razumije hrvatski jezik. Analizira vaš opis proizvoda ili usluge i uspoređuje ga s cijelom bazom od 5.726 KPD šifri kako bi pronašao najprikladnije klasifikacije.',
      },
    },
    {
      '@type': 'Question',
      name: 'Koliko je AI klasifikacija pouzdana?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI pruža prijedloge s prikazanom razinom pouzdanosti za svaku klasifikaciju. Za visoko pouzdane rezultate (iznad 80%), AI je vrlo siguran u prijedlog. Za niže pouzdanosti, preporučujemo provjeru i eventualno preciziranje opisa.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mogu li koristiti klasifikator besplatno?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Da! Nudimo besplatni plan s 3 AI upita mjesečno za isprobavanje. Za veće potrebe, dostupni su plaćeni planovi od 6,99 EUR/mj (10 upita) do 30,99 EUR/mj (50 upita) s dodatnim značajkama poput CSV izvoza.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kada KPD šifre postaju obvezne?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Od 1. siječnja 2026. svaki eRačun u Hrvatskoj mora sadržavati KPD šifru za svaku stavku (proizvod ili uslugu). Preporučujemo da se pripremite unaprijed i klasificirate svoje proizvode i usluge prije tog datuma.',
      },
    },
  ],
};

export function JsonLd() {
  return (
    <>
      <Script
        id="json-ld-software"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(softwareData)}
      </Script>
      <Script
        id="json-ld-faq"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(faqData)}
      </Script>
    </>
  );
}

import Script from 'next/script';

// JSON-LD Structured Data for AI KPD Klasifikator
const structuredData = {
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
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'EUR',
      description: '50 klasifikacija mjesečno',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '9',
      priceCurrency: 'EUR',
      description: '500 klasifikacija mjesečno',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19',
      priceCurrency: 'EUR',
      description: '2000 klasifikacija mjesečno',
    },
    {
      '@type': 'Offer',
      name: 'Business',
      price: '49',
      priceCurrency: 'EUR',
      description: '10000 klasifikacija mjesečno',
    },
  ],
  featureList: [
    'AI klasifikacija proizvoda i usluga',
    '3.300+ KPD šifri u bazi',
    'Prikazana razina pouzdanosti',
    'Batch klasifikacija',
    'Povijest klasifikacija',
    'Izvoz podataka u CSV',
    'Fiskalizacija 2.0 usklađenost',
  ],
};

export function JsonLd() {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      strategy="afterInteractive"
    >
      {JSON.stringify(structuredData)}
    </Script>
  );
}

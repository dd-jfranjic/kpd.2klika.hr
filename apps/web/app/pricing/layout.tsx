import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cijene i planovi | AI KPD Klasifikator',
  description:
    'Odaberite plan AI KPD Klasifikatora koji odgovara vašim potrebama. Besplatni plan s 3 upita mjesečno ili plaćeni planovi od 6,99 EUR/mj. Bez skrivenih naknada.',
  keywords: [
    'KPD klasifikator cijene',
    'AI klasifikacija cijena',
    'KPD šifre pretplata',
    'fiskalizacija 2.0 alat',
    'e-račun klasifikacija',
  ],
  openGraph: {
    title: 'Cijene i planovi | AI KPD Klasifikator',
    description:
      'Odaberite plan AI KPD Klasifikatora koji odgovara vašim potrebama. Besplatni plan s 3 upita mjesečno ili plaćeni planovi od 6,99 EUR/mj.',
    url: 'https://kpd.2klika.hr/pricing',
    siteName: 'AI KPD Klasifikator',
    locale: 'hr_HR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cijene i planovi | AI KPD Klasifikator',
    description:
      'Odaberite plan AI KPD Klasifikatora. Besplatni plan s 3 upita ili plaćeni planovi od 6,99 EUR/mj.',
  },
  alternates: {
    canonical: 'https://kpd.2klika.hr/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

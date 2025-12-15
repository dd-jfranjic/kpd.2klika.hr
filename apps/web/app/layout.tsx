import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AuthProvider } from '@/contexts/auth-context';

// Premium font configuration
const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jakarta',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
});

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://kpd.2klika.hr'),
  title: {
    default: 'AI KPD Klasifikator | Fiskalizacija 2.0 - AI klasifikacija proizvoda i usluga',
    template: '%s | AI KPD Klasifikator',
  },
  description:
    'Od 1.1.2026. KPD šifre su obvezne na eRačunima. Pronađite točnu 6-znamenkastu KPD šifru pomoću AI tehnologije. 3.300+ šifri, jednostavno korištenje. Besplatno za početi.',
  keywords: [
    'KPD',
    'KPD šifre',
    'Fiskalizacija 2.0',
    'eRačun',
    'klasifikacija proizvoda',
    'hrvatska',
    'poduzetnici',
    'računovođe',
    'AI klasifikacija',
    'Google AI',
    '6-znamenkasti kod',
  ],
  authors: [{ name: '2 KLIKA obrt', url: 'https://2klika.hr' }],
  creator: '2 KLIKA obrt',
  publisher: '2 KLIKA obrt',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'hr_HR',
    url: 'https://kpd.2klika.hr',
    siteName: 'AI KPD Klasifikator',
    title: 'AI KPD Klasifikator | Fiskalizacija 2.0 - AI klasifikacija za eRačune',
    description:
      'Od 1.1.2026. KPD šifre su obvezne na eRačunima. Pronađite točnu klasifikaciju proizvoda i usluga pomoću AI tehnologije.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI KPD Klasifikator - AI klasifikacija proizvoda i usluga za Fiskalizaciju 2.0',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI KPD Klasifikator | Fiskalizacija 2.0',
    description:
      'Od 1.1.2026. KPD šifre su obvezne na eRačunima. Pronađite točnu klasifikaciju pomoću AI.',
    images: ['/og-image.png'],
    creator: '@2klika',
  },
  alternates: {
    canonical: 'https://kpd.2klika.hr',
    languages: {
      'hr-HR': 'https://kpd.2klika.hr',
    },
  },
  category: 'Business',
  classification: 'Business Application',
  other: {
    'application-name': 'AI KPD Klasifikator',
  },
};

// Viewport configuration - Light theme only
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#6B9B76',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${outfit.variable} ${plusJakarta.variable} ${playfair.variable} antialiased`}
      >
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}

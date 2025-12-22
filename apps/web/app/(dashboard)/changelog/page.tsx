'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Sparkles, Bug, Wrench, Zap } from 'lucide-react';

// Changelog entries - add new entries at the top
const changelogEntries = [
  {
    version: 'v1.3.0',
    date: '2025-12-19',
    title: 'Fleksibilne opcije plaćanja',
    changes: [
      {
        type: 'feature',
        description: 'Jednokratna kupnja - svi planovi sada dostupni i kao jednokratna kupnja gdje upiti nikad ne istječu',
      },
      {
        type: 'feature',
        description: 'Query Booster - kupite dodatnih 10 upita za 6,99 EUR koji nikad ne istječu',
      },
      {
        type: 'feature',
        description: 'Billing Toggle - jednostavno prebacivanje između mjesečne pretplate i jednokratne kupnje na svakom planu',
      },
      {
        type: 'improvement',
        description: 'Jasniji prikaz cijena i opcija plaćanja na stranici s cijenama',
      },
      {
        type: 'improvement',
        description: 'Dodani Enterprise plan (199 EUR, 2500 upita) za velike organizacije',
      },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2025-12-17',
    title: 'Mobilna navigacija i GDPR usklađenost',
    changes: [
      {
        type: 'feature',
        description: 'Novi mobilni izbornik - premium hamburger meni s brzim pristupom svim funkcijama',
      },
      {
        type: 'feature',
        description: 'GDPR usklađenost - upravljanje privolama za kolačiće s mogućnošću prilagodbe',
      },
      {
        type: 'improvement',
        description: 'Poboljšano korisničko iskustvo na mobilnim uređajima',
      },
      {
        type: 'improvement',
        description: 'Optimizirano učitavanje stranica',
      },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2025-12-16',
    title: 'Poboljšana stabilnost i performanse',
    changes: [
      {
        type: 'improvement',
        description: 'Značajno poboljšana pouzdanost AI upita - sustav sada automatski pokušava ponovno ako dođe do privremene greške',
      },
      {
        type: 'improvement',
        description: 'Brži odgovori za ponovljene upite zahvaljujući naprednom sustavu predmemoriranja',
      },
      {
        type: 'improvement',
        description: 'Bolja podrška za više istovremenih korisnika',
      },
      {
        type: 'fix',
        description: 'Ispravljene poruke o greškama - sada su jasnije i na hrvatskom jeziku',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2025-12-14',
    title: 'Inicijalno izdanje',
    changes: [
      {
        type: 'feature',
        description: 'AI klasifikacija proizvoda i usluga pomoću Google Gemini',
      },
      {
        type: 'feature',
        description: 'Ručna pretraga KPD šifara s hijerarhijskim pregledom',
      },
      {
        type: 'feature',
        description: 'Prikaz vremena odgovora za svaki AI upit',
      },
      {
        type: 'feature',
        description: 'Mjesečni limit upita s prikazom preostale kvote',
      },
      {
        type: 'feature',
        description: 'Premium poruka kada korisnik iskoristi sve upite',
      },
      {
        type: 'feature',
        description: 'Stripe integracija za pretplate',
      },
      {
        type: 'feature',
        description: 'Admin panel za upravljanje korisnicima i konfiguracijom',
      },
    ],
  },
];

const typeConfig = {
  feature: { label: 'Nova značajka', icon: Sparkles, color: 'bg-green-100 text-green-700' },
  fix: { label: 'Ispravka', icon: Bug, color: 'bg-red-100 text-red-700' },
  improvement: { label: 'Poboljšanje', icon: Zap, color: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Održavanje', icon: Wrench, color: 'bg-gray-100 text-gray-700' },
};

export default function ChangelogPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-600" />
          Changelog
        </h1>
        <p className="text-gray-600 mt-2">
          Pratite sve promjene i nova izdanja AI KPD Klasifikatora.
        </p>
      </div>

      <div className="space-y-6">
        {changelogEntries.map((entry) => (
          <Card key={entry.version} className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-t-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-xl font-bold text-primary-700">
                  {entry.version} - {entry.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(entry.date).toLocaleDateString('hr-HR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-3">
                {entry.changes.map((change, index) => {
                  const config = typeConfig[change.type as keyof typeof typeConfig];
                  const Icon = config.icon;
                  return (
                    <li key={index} className="flex items-start gap-3">
                      <span className={`${config.color} flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md text-xs font-medium`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-gray-700">{change.description}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Imate prijedlog za poboljšanje? Kontaktirajte nas na{' '}
          <a href="mailto:kpd@2klika.hr" className="text-primary-600 hover:underline">
            kpd@2klika.hr
          </a>
        </p>
      </div>
    </div>
  );
}

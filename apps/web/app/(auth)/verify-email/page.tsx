'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'GET',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Verifikacija nije uspjela');
        }

        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verifikacija nije uspjela. Pokušajte ponovno.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  // No token provided
  if (!token) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <AlertCircle className="kpd-auth-card__success-icon" style={{ color: 'var(--error)' }} />
          <h2 className="kpd-auth-card__title">Nevažeći link</h2>
          <p className="kpd-auth-card__subtitle">
            Link za verifikaciju email adrese je nevažeći ili nedostaje.
            Ako ste se registrirali, provjerite email za ispravan link.
          </p>
          <Link href="/login" className="kpd-btn kpd-btn--primary kpd-btn--full">
            Prijava
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <Loader2 className="kpd-auth-card__success-icon kpd-auth-card__spinner" />
          <h2 className="kpd-auth-card__title">Verifikacija u tijeku...</h2>
          <p className="kpd-auth-card__subtitle">
            Molimo pričekajte dok verificiramo vašu email adresu.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <AlertCircle className="kpd-auth-card__success-icon" style={{ color: 'var(--error)' }} />
          <h2 className="kpd-auth-card__title">Verifikacija nije uspjela</h2>
          <p className="kpd-auth-card__subtitle">
            {error}
          </p>
          <p className="kpd-auth-card__subtitle" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Link za verifikaciju je možda istekao ili je već iskorišten.
            Prijavite se kako biste zatražili novi verifikacijski email.
          </p>
          <Link href="/login" className="kpd-btn kpd-btn--primary kpd-btn--full">
            Prijava
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <CheckCircle className="kpd-auth-card__success-icon" />
          <h2 className="kpd-auth-card__title">Email verificiran!</h2>
          <p className="kpd-auth-card__subtitle">
            Vaša email adresa je uspješno verificirana.
            Sada se možete prijaviti u aplikaciju.
          </p>
          <Link href="/login" className="kpd-btn kpd-btn--primary kpd-btn--full">
            Prijava
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="kpd-auth-card">
          <div className="kpd-auth-card__loading">
            <Loader2 className="kpd-auth-card__spinner" />
            <span>Učitavanje...</span>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

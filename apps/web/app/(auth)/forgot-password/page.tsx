'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Nešto je pošlo po zlu');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zahtjev nije uspio. Pokušajte ponovno.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <CheckCircle className="kpd-auth-card__success-icon" />
          <h2 className="kpd-auth-card__title">Provjerite email</h2>
          <p className="kpd-auth-card__subtitle">
            Ako postoji račun s email adresom <strong>{email}</strong>,
            poslali smo vam link za reset lozinke. Link vrijedi 1 sat.
          </p>
          <Link href="/login" className="kpd-btn kpd-btn--secondary kpd-btn--full">
            <ArrowLeft className="kpd-btn__icon" style={{ marginRight: '0.5rem', transform: 'none' }} />
            Natrag na prijavu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="kpd-auth-card">
      <div className="kpd-auth-card__header">
        <h1 className="kpd-auth-card__title">Zaboravili lozinku?</h1>
        <p className="kpd-auth-card__subtitle">
          Unesite email adresu i poslat ćemo vam link za reset lozinke.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kpd-auth-form">
        {error && (
          <div className="kpd-auth-form__error">
            <AlertCircle className="kpd-auth-form__error-icon" />
            <span>{error}</span>
          </div>
        )}

        <div className="kpd-auth-form__field">
          <label htmlFor="email" className="kpd-auth-form__label">
            Email adresa
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.com"
            className="kpd-auth-form__input"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="kpd-btn kpd-btn--primary kpd-btn--full kpd-auth-form__submit"
        >
          {loading ? (
            <>
              <Loader2 className="kpd-btn__spinner" />
              <span>Slanje...</span>
            </>
          ) : (
            'Pošalji link za reset'
          )}
        </button>
      </form>

      <div className="kpd-auth-card__footer">
        <Link href="/login" className="kpd-auth-card__footer-link">
          <ArrowLeft className="kpd-btn__icon" style={{ width: '16px', height: '16px', marginRight: '0.25rem', display: 'inline', transform: 'none' }} />
          Natrag na prijavu
        </Link>
      </div>
    </div>
  );
}

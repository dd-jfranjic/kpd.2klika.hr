'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Lozinka mora imati najmanje 8 znakova';
    }
    if (!/[a-z]/.test(password)) {
      return 'Lozinka mora sadržavati malo slovo';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Lozinka mora sadržavati veliko slovo';
    }
    if (!/\d/.test(password)) {
      return 'Lozinka mora sadržavati broj';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Nedostaje token za reset lozinke. Zatražite novi link.');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Reset lozinke nije uspio');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset lozinke nije uspio. Pokušajte ponovno.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <AlertCircle className="kpd-auth-card__success-icon" style={{ color: 'var(--error)' }} />
          <h2 className="kpd-auth-card__title">Nevažeći link</h2>
          <p className="kpd-auth-card__subtitle">
            Link za reset lozinke je nevažeći ili je istekao.
            Zatražite novi link za reset.
          </p>
          <Link href="/forgot-password" className="kpd-btn kpd-btn--primary kpd-btn--full">
            Zatraži novi link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="kpd-auth-card">
        <div className="kpd-auth-card__success">
          <CheckCircle className="kpd-auth-card__success-icon" />
          <h2 className="kpd-auth-card__title">Lozinka promijenjena</h2>
          <p className="kpd-auth-card__subtitle">
            Vaša lozinka je uspješno promijenjena. Sada se možete prijaviti s novom lozinkom.
          </p>
          <Link href="/login" className="kpd-btn kpd-btn--primary kpd-btn--full">
            Prijava
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="kpd-auth-card">
      <div className="kpd-auth-card__header">
        <h1 className="kpd-auth-card__title">Nova lozinka</h1>
        <p className="kpd-auth-card__subtitle">
          Unesite novu lozinku za vaš račun.
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
          <label htmlFor="password" className="kpd-auth-form__label">
            Nova lozinka
          </label>
          <div className="kpd-auth-form__input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 znakova"
              className="kpd-auth-form__input kpd-auth-form__input--with-icon"
              required
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="kpd-auth-form__toggle-password"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <p className="kpd-auth-form__hint">
            Mora sadržavati veliko slovo, malo slovo i broj
          </p>
        </div>

        <div className="kpd-auth-form__field">
          <label htmlFor="confirmPassword" className="kpd-auth-form__label">
            Potvrdite lozinku
          </label>
          <div className="kpd-auth-form__input-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovite lozinku"
              className="kpd-auth-form__input kpd-auth-form__input--with-icon"
              required
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="kpd-auth-form__toggle-password"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="kpd-btn kpd-btn--primary kpd-btn--full kpd-auth-form__submit"
        >
          {loading ? (
            <>
              <Loader2 className="kpd-btn__spinner" />
              <span>Postavljanje lozinke...</span>
            </>
          ) : (
            'Postavi novu lozinku'
          )}
        </button>
      </form>

      <div className="kpd-auth-card__footer">
        <p>
          Prisjetili ste se lozinke?{' '}
          <Link href="/login" className="kpd-auth-card__footer-link">
            Prijavite se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}

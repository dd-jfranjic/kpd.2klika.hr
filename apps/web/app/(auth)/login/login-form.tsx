'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import styles from './login.module.css';

export default function LoginForm() {
  const { login, user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const redirectParam = searchParams.get('redirect');
  // Admin users always go to /admin, regular users use redirect param or /dashboard
  const redirectUrl = isAdmin ? '/admin' : (redirectParam || '/dashboard');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Molimo unesite email i lozinku');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Neispravni podaci za prijavu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!mounted || authLoading) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.bgDecoration}>
          <div className={`${styles.blob} ${styles.blob1}`}></div>
          <div className={`${styles.blob} ${styles.blob2}`}></div>
          <div className={`${styles.blob} ${styles.blob3}`}></div>
        </div>
        <div className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                </svg>
              </div>
              <span className={styles.logoText}>AI KPD Klasifikator</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
              <div className={styles.spinner}></div>
              <span>Učitavanje...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      {/* Background Decoration */}
      <div className={styles.bgDecoration}>
        <div className={`${styles.blob} ${styles.blob1}`}></div>
        <div className={`${styles.blob} ${styles.blob2}`}></div>
        <div className={`${styles.blob} ${styles.blob3}`}></div>
      </div>

      {/* Illustration Panel (Left) */}
      <div className={styles.illustrationPanel}>
        <div className={styles.brandBadge}>
          <span className={styles.brandBadgeDot}></span>
          AI KPD Klasifikator by 2klika
        </div>

        <h1 className={styles.illustrationTitle}>
          AI klasifikacija<br />proizvoda i usluga
        </h1>

        <p className={styles.illustrationSubtitle}>
          Jednostavno i pouzdano odredite KPD šifre za vaše proizvode i usluge.
          AI-powered klasifikacija uz potpunu usklađenost s KPD 2025.
        </p>

        <div className={styles.featureCards}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>AI Inteligencija</h3>
              <p>Gemini AI za preciznu i brzu klasifikaciju</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>KPD 2025 Standard</h3>
              <p>Potpuna usklađenost s najnovijom verzijom klasifikacije</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>Brza pretraga</h3>
              <p>Preko 5.700 KPD šifara na dohvat ruke</p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Divider - Decentan vizual */}
      <div className={styles.centerDivider}>
        <div className={styles.dividerLine}></div>
        <div className={styles.dividerIcon}>
          <svg viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div className={styles.dividerLine}></div>
      </div>

      {/* Form Panel (Right) */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
              </svg>
            </div>
            <span className={styles.logoText}>AI KPD Klasifikator</span>
          </div>

          {/* Form Header */}
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Dobrodošli natrag</h2>
            <p className={styles.formSubtitle}>Prijavite se u svoj račun</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} suppressHydrationWarning>
            {/* Email */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email adresa</label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="ime@tvrtka.hr"
                  autoComplete="email"
                  disabled={loading}
                />
                <span className={styles.inputIcon}>
                  <svg viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Lozinka</label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Unesite lozinku"
                  style={{ paddingRight: '3rem' }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <span className={styles.inputIcon}>
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Form Options */}
            <div className={styles.formOptions}>
              <div
                className={styles.checkboxWrapper}
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div className={`${styles.checkbox} ${rememberMe ? styles.checked : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className={styles.checkboxLabel}>Zapamti me</span>
              </div>
              <Link href="/forgot-password" className={styles.forgotPassword}>
                Zaboravljena lozinka?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={styles.btnPrimary}
            >
              {loading ? (
                <div className={styles.spinner}></div>
              ) : (
                <>
                  Prijavi se
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              SSL zaštićeno
            </div>
            <div className={styles.trustBadge}>
              <svg viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              GDPR
            </div>
          </div>

          {/* Register Link */}
          <div className={styles.registerLink}>
            Nemate račun? <Link href="/register">Registrirajte se</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

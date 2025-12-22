'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import styles from './register.module.css';

export default function RegisterForm() {
  const { register: registerUser, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  // GDPR Consent states - separate for compliance audit trail
  const [termsOfService, setTermsOfService] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim() || formData.name.length < 2) {
      return 'Ime mora imati najmanje 2 znaka';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Neispravna email adresa';
    }
    if (formData.password.length < 8) {
      return 'Lozinka mora imati najmanje 8 znakova';
    }
    if (!/[a-z]/.test(formData.password)) {
      return 'Lozinka mora sadržavati malo slovo';
    }
    if (!/[A-Z]/.test(formData.password)) {
      return 'Lozinka mora sadržavati veliko slovo';
    }
    if (!/\d/.test(formData.password)) {
      return 'Lozinka mora sadržavati broj';
    }
    if (!/[@$!%*?&]/.test(formData.password)) {
      return 'Lozinka mora sadržavati specijalni znak (@$!%*?&)';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Lozinke se ne podudaraju';
    }
    // GDPR consent validation - both required
    if (!termsOfService) {
      return 'Morate prihvatiti Uvjete korištenja';
    }
    if (!privacyPolicy) {
      return 'Morate prihvatiti Politiku privatnosti';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await registerUser(
        formData.email,
        formData.password,
        formData.name.split(' ')[0],
        formData.name.split(' ').slice(1).join(' ') || undefined,
        // GDPR consents - passed to backend for audit trail
        {
          termsOfService,
          privacyPolicy,
          marketingEmails: marketingEmails || undefined,
        }
      );

      if (result?.requiresVerification) {
        setSuccess(true);
      }
    } catch (err: unknown) {
      console.error('[RegisterForm] Registration failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Greška pri registraciji';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthClass = (level: number) => {
    if (level > passwordStrength) return '';
    if (passwordStrength <= 2) return styles.weak;
    if (passwordStrength <= 3) return styles.medium;
    return styles.strong;
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

  // Success state
  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.bgDecoration}>
          <div className={`${styles.blob} ${styles.blob1}`}></div>
          <div className={`${styles.blob} ${styles.blob2}`}></div>
          <div className={`${styles.blob} ${styles.blob3}`}></div>
        </div>
        <div className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className={styles.formTitle}>Provjerite email</h2>
              <p className={styles.formSubtitle}>
                Poslali smo vam email s linkom za verifikaciju.
                Kliknite na link da završite registraciju.
              </p>
              <Link href="/login" className={styles.btnPrimary} style={{ marginTop: '1.5rem', textDecoration: 'none' }}>
                Natrag na prijavu
              </Link>
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
          Pridružite se<br />našim korisnicima
        </h1>

        <p className={styles.illustrationSubtitle}>
          Kreirajte svoj račun i započnite s AI klasifikacijom
          u samo nekoliko minuta.
        </p>

        <div className={styles.featureCards}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>Sigurna registracija</h3>
              <p>Vaši podaci su zaštićeni enkripcijom najviše razine</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>Brzo postavljanje</h3>
              <p>Aktivirajte svoj račun za manje od 5 minuta</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className={styles.featureContent}>
              <h3>Besplatno probno razdoblje</h3>
              <p>3 besplatna AI upita za testiranje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Divider */}
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
            <h2 className={styles.formTitle}>Kreirajte račun</h2>
            <p className={styles.formSubtitle}>Pridružite se KPD platformi</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} suppressHydrationWarning>
            {/* Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ime i prezime</label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Ivan Horvat"
                  autoComplete="name"
                  disabled={loading}
                />
                <span className={styles.inputIcon}>
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email adresa</label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  placeholder="Unesite lozinku"
                  autoComplete="new-password"
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

              {/* Password Strength */}
              {formData.password && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`${styles.strengthBar} ${getStrengthClass(level)}`}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel}>
                    Jačina: {passwordStrength <= 2 ? 'Slaba' : passwordStrength <= 3 ? 'Srednja' : 'Jaka'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Potvrdite lozinku</label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  placeholder="Ponovite lozinku"
                  autoComplete="new-password"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.passwordToggle}
                >
                  {showConfirmPassword ? (
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

            {/* Password Requirements */}
            <div className={styles.passwordRequirements}>
              <h4 className={styles.requirementsTitle}>Zahtjevi za lozinku:</h4>
              <div className={styles.requirementsList}>
                <div className={`${styles.requirement} ${formData.password && formData.password.length >= 8 ? styles.met : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Najmanje 8 znakova</span>
                </div>
                <div className={`${styles.requirement} ${formData.password && /[A-Z]/.test(formData.password) ? styles.met : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Jedno veliko slovo</span>
                </div>
                <div className={`${styles.requirement} ${formData.password && /[a-z]/.test(formData.password) ? styles.met : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Jedno malo slovo</span>
                </div>
                <div className={`${styles.requirement} ${formData.password && /\d/.test(formData.password) ? styles.met : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Jedan broj</span>
                </div>
                <div className={`${styles.requirement} ${formData.password && /[@$!%*?&]/.test(formData.password) ? styles.met : ''}`}>
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Jedan specijalni znak (@$!%*?&)</span>
                </div>
              </div>
            </div>

            {/* GDPR Consent Section */}
            <div className={styles.gdprSection}>
              <h4 className={styles.gdprTitle}>Privole (GDPR)</h4>

              {/* Terms of Service - Required */}
              <div className={styles.gdprCheckbox}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={termsOfService}
                    onChange={(e) => setTermsOfService(e.target.checked)}
                    className={styles.checkbox}
                    disabled={loading}
                  />
                  <span className={styles.checkboxCustom}>
                    <svg viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.checkboxText}>
                    Prihvaćam <Link href="/terms">Uvjete korištenja</Link> <span className={styles.required}>*</span>
                  </span>
                </label>
              </div>

              {/* Privacy Policy - Required */}
              <div className={styles.gdprCheckbox}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.checked)}
                    className={styles.checkbox}
                    disabled={loading}
                  />
                  <span className={styles.checkboxCustom}>
                    <svg viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.checkboxText}>
                    Prihvaćam <Link href="/privacy">Politiku privatnosti</Link> <span className={styles.required}>*</span>
                  </span>
                </label>
              </div>

              {/* Marketing Emails - Optional */}
              <div className={styles.gdprCheckbox}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                    className={styles.checkbox}
                    disabled={loading}
                  />
                  <span className={styles.checkboxCustom}>
                    <svg viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.checkboxText}>
                    Želim primati marketinške obavijesti i novosti <span className={styles.optional}>(opcionalno)</span>
                  </span>
                </label>
              </div>

              <p className={styles.gdprNote}>
                <span className={styles.required}>*</span> Obavezna polja
              </p>
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
                  Registrirajte se
                  <svg viewBox="0 0 24 24">
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

          {/* Login Link */}
          <div className={styles.loginLink}>
            Već imate račun? <Link href="/login">Prijavite se</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

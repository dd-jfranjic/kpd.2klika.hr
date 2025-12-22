'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './cookie-consent-banner.module.css';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const VISITOR_ID_KEY = 'kpd_visitor_id';
const CONSENT_KEY = 'kpd_cookie_consent';
const CONSENT_SHOWN_KEY = 'kpd_cookie_consent_shown';

// Generate a unique visitor ID
const generateVisitorId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Get or create visitor ID
const getVisitorId = (): string => {
  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be changed
    analytics: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if consent has already been given
  useEffect(() => {
    const consentShown = localStorage.getItem(CONSENT_SHOWN_KEY);
    if (!consentShown) {
      // Add a small delay for smoother UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Load existing preferences from localStorage
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setPreferences(parsed);
      } catch (e) {
        // Ignore parse errors
      }
    }

    return undefined;
  }, []);

  // Save consent to backend
  const saveConsent = useCallback(async (prefs: CookiePreferences) => {
    const visitorId = getVisitorId();

    try {
      await fetch(`${API_BASE}/gdpr/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          visitorId,
          analytics: prefs.analytics,
          marketing: prefs.marketing,
        }),
      });
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }, []);

  // Accept all cookies
  const handleAcceptAll = async () => {
    setIsLoading(true);
    const newPrefs = { necessary: true, analytics: true, marketing: true };
    setPreferences(newPrefs);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(newPrefs));
    localStorage.setItem(CONSENT_SHOWN_KEY, 'true');

    await saveConsent(newPrefs);
    setIsVisible(false);
    setIsLoading(false);
  };

  // Accept only necessary cookies
  const handleAcceptNecessary = async () => {
    setIsLoading(true);
    const newPrefs = { necessary: true, analytics: false, marketing: false };
    setPreferences(newPrefs);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(newPrefs));
    localStorage.setItem(CONSENT_SHOWN_KEY, 'true');

    await saveConsent(newPrefs);
    setIsVisible(false);
    setIsLoading(false);
  };

  // Save custom preferences
  const handleSavePreferences = async () => {
    setIsLoading(true);

    localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    localStorage.setItem(CONSENT_SHOWN_KEY, 'true');

    await saveConsent(preferences);
    setIsVisible(false);
    setIsLoading(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.banner} ${showDetails ? styles.expanded : ''}`}>
        {/* Cookie Icon */}
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" className={styles.cookieIcon}>
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" fill="none" stroke="currentColor" />
            <circle cx="8" cy="9" r="1.5" fill="currentColor" />
            <circle cx="15" cy="8" r="1" fill="currentColor" />
            <circle cx="10" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="13" r="1" fill="currentColor" />
            <circle cx="13" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          <h3 className={styles.title}>Kolacici na nasoj stranici</h3>
          <p className={styles.description}>
            Koristimo kolacice kako bismo vam pruzili najbolje iskustvo na nasoj stranici.
            Mozete prihvatiti sve kolacice ili prilagoditi postavke.
          </p>

          {/* Cookie Categories (Detailed View) */}
          {showDetails && (
            <div className={styles.categories}>
              {/* Necessary */}
              <div className={styles.category}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>Neophodni kolacici</span>
                    <span className={styles.categoryBadge}>Obavezno</span>
                  </div>
                  <label className={`${styles.toggle} ${styles.disabled}`}>
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
                <p className={styles.categoryDesc}>
                  Ovi kolacici su potrebni za rad web stranice i ne mogu se iskljuciti.
                </p>
              </div>

              {/* Analytics */}
              <div className={styles.category}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>Analiticki kolacici</span>
                    <span className={styles.categoryBadgeOptional}>Opcionalno</span>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
                <p className={styles.categoryDesc}>
                  Pomazu nam razumjeti kako posjetitelji koriste nasu stranicu.
                </p>
              </div>

              {/* Marketing */}
              <div className={styles.category}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryName}>Marketinski kolacici</span>
                    <span className={styles.categoryBadgeOptional}>Opcionalno</span>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
                <p className={styles.categoryDesc}>
                  Koriste se za prikazivanje relevantnih oglasa i pracenje kampanja.
                </p>
              </div>
            </div>
          )}

          {/* Privacy Link */}
          <div className={styles.privacyLink}>
            <Link href="/privacy">Saznajte vise u Politici privatnosti</Link>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {!showDetails ? (
            <>
              <button
                onClick={() => setShowDetails(true)}
                className={styles.btnSecondary}
                disabled={isLoading}
              >
                Prilagodi
              </button>
              <button
                onClick={handleAcceptNecessary}
                className={styles.btnOutline}
                disabled={isLoading}
              >
                Samo neophodni
              </button>
              <button
                onClick={handleAcceptAll}
                className={styles.btnPrimary}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className={styles.spinner}></span>
                ) : (
                  'Prihvati sve'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDetails(false)}
                className={styles.btnSecondary}
                disabled={isLoading}
              >
                Natrag
              </button>
              <button
                onClick={handleSavePreferences}
                className={styles.btnPrimary}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className={styles.spinner}></span>
                ) : (
                  'Spremi postavke'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;

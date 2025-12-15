'use client';

import { Suspense } from 'react';
import LoginForm from './login-form';
import styles from './login.module.css';

function LoadingFallback() {
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}

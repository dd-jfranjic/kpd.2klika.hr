'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User, Mail, Shield, Save, Loader2, Check, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ProfileSettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profil uspješno ažuriran!' });
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greška pri ažuriranju profila');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greška',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Form */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Osobni podaci</h2>
            <p className="kpd-text-small">Ažurirajte svoje osobne informacije</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="kpd-settings-card__body space-y-4">
            {/* Message */}
            {message && (
              <div className={`kpd-alert kpd-alert--${message.type}`}>
                {message.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {message.text}
              </div>
            )}

            {/* First Name */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">Ime</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="kpd-auth-form__input"
                placeholder="Vaše ime"
              />
            </div>

            {/* Last Name */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">Prezime</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="kpd-auth-form__input"
                placeholder="Vaše prezime"
              />
            </div>

            {/* Email (read-only) */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">
                <Mail className="w-4 h-4 inline mr-1" />
                Email adresa
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="kpd-auth-form__input"
              />
              <p className="kpd-auth-form__hint">
                Email adresa se ne može promijeniti
              </p>
            </div>
          </div>

          <div className="kpd-settings-card__footer">
            <button
              type="submit"
              disabled={isLoading}
              className="kpd-btn kpd-btn--primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Spremanje...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Spremi promjene
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Sigurnost</h2>
            <p className="kpd-text-small">Upravljajte sigurnosnim postavkama</p>
          </div>
        </div>

        <div className="kpd-settings-card__body">
          <button className="kpd-btn kpd-btn--secondary" disabled>
            Promijeni lozinku
          </button>
          <p className="kpd-auth-form__hint kpd-mt-sm">
            Funkcionalnost promjene lozinke dolazi uskoro
          </p>
        </div>
      </div>
    </div>
  );
}

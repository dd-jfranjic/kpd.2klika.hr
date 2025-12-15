'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Building2, Save, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export default function WorkspaceSettingsPage() {
  const { token } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [token]);

  const fetchOrganization = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/organizations/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganization(data.data);
          setName(data.data.name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !organization) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrganization(data.data);
          setMessage({ type: 'success', text: 'Workspace uspješno ažuriran!' });
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greška pri ažuriranju');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greška',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="kpd-settings-loading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Učitavanje...</span>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__body">
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="kpd-text-body">Nemate workspace.</p>
            <p className="kpd-text-small">
              Workspace će biti kreiran automatski.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Form */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Postavke workspacea</h2>
            <p className="kpd-text-small">Upravljajte postavkama vašeg workspacea</p>
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

            {/* Name */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">Naziv workspacea</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="kpd-auth-form__input"
                placeholder="Naziv vaše tvrtke ili tima"
                required
              />
            </div>

            {/* Slug (read-only) */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">Slug</label>
              <input
                type="text"
                value={organization.slug}
                disabled
                className="kpd-auth-form__input"
              />
              <p className="kpd-auth-form__hint">
                Slug je jedinstven identifikator i ne može se mijenjati
              </p>
            </div>

            {/* Created */}
            <div className="kpd-auth-form__field">
              <label className="kpd-auth-form__label">Kreirano</label>
              <input
                type="text"
                value={new Date(organization.createdAt).toLocaleDateString('hr-HR')}
                disabled
                className="kpd-auth-form__input"
              />
            </div>
          </div>

          <div className="kpd-settings-card__footer">
            <button
              type="submit"
              disabled={isSaving}
              className="kpd-btn kpd-btn--primary"
            >
              {isSaving ? (
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

      {/* Danger Zone */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon" style={{ background: 'var(--error)' }}>
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="kpd-heading-3">Opasna zona</h2>
            <p className="kpd-text-small">Nepovratne akcije</p>
          </div>
        </div>

        <div className="kpd-settings-card__body">
          <button className="kpd-btn kpd-btn--secondary" disabled>
            <Trash2 className="w-4 h-4" />
            Obriši workspace
          </button>
          <p className="kpd-auth-form__hint kpd-mt-sm">
            Ova akcija je nepovratna! Svi podaci će biti trajno obrisani.
          </p>
        </div>
      </div>
    </div>
  );
}

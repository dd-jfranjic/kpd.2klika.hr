'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  X,
  Crown,
  Shield,
  User
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export default function MembersSettingsPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`${API_BASE}/organizations/current/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/organizations/current/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        if (data.success) {
          setMembers(data.data || []);
        }
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        if (data.success) {
          setInvitations(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteEmail.trim()) return;

    setIsInviting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/organizations/current/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pozivnica uspješno poslana!' });
        setInviteEmail('');
        setShowInviteModal(false);
        fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Greška pri slanju pozivnice');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nepoznata greška',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'kpd-badge--warning';
      case 'ADMIN':
        return 'kpd-badge--info';
      default:
        return 'kpd-badge--muted';
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

  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');

  return (
    <div className="space-y-6">
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

      {/* Members List */}
      <div className="kpd-settings-card">
        <div className="kpd-settings-card__header">
          <div className="kpd-settings-card__icon">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="kpd-heading-3">Članovi tima</h2>
            <p className="kpd-text-small">{members.length} članova</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="kpd-btn kpd-btn--primary kpd-btn--sm"
          >
            <UserPlus className="w-4 h-4" />
            Pozovi
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {members.length === 0 ? (
            <div className="kpd-settings-card__body text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="kpd-text-body">Nema članova</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="kpd-text-small">{member.user.email}</p>
                  </div>
                </div>
                <span className={`kpd-badge ${getRoleBadge(member.role)}`}>
                  {member.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="kpd-settings-card">
          <div className="kpd-settings-card__header">
            <div className="kpd-settings-card__icon">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="kpd-heading-3">Čekaju prihvat</h2>
              <p className="kpd-text-small">{pendingInvitations.length} pozivnica</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{invitation.email}</p>
                  <p className="kpd-text-small">
                    Poslano {new Date(invitation.createdAt).toLocaleDateString('hr-HR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="kpd-badge kpd-badge--warning">Čeka</span>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="kpd-btn kpd-btn--ghost kpd-btn--sm"
                    title="Otkaži"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="kpd-auth-card max-w-md w-full">
            <div className="kpd-auth-card__header">
              <h2 className="kpd-auth-card__title">Pozovi novog člana</h2>
              <p className="kpd-auth-card__subtitle">
                Pošaljite pozivnicu na email adresu
              </p>
            </div>

            <form onSubmit={handleInvite} className="kpd-auth-form">
              <div className="kpd-auth-form__field">
                <label className="kpd-auth-form__label">Email adresa</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="kpd-auth-form__input"
                  placeholder="email@primjer.hr"
                  required
                />
              </div>

              <div className="kpd-auth-form__field">
                <label className="kpd-auth-form__label">Rola</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  className="kpd-auth-form__input"
                >
                  <option value="MEMBER">Član</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="kpd-btn kpd-btn--secondary flex-1"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="kpd-btn kpd-btn--primary flex-1"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Slanje...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Pošalji pozivnicu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Zap, Loader2, Infinity } from 'lucide-react';

interface QueryBoosterProps {
  organizationId: string;
  token: string;
  onError?: (message: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * QueryBooster - Component for purchasing additional queries
 * 10 queries for 6.99 EUR that never expire
 */
export function QueryBooster({ organizationId, token, onError }: QueryBoosterProps) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!organizationId || !token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/stripe/query-booster`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const errorData = await response.json();
        onError?.(errorData.message || 'Greska pri kreiranju checkout sesije');
      }
    } catch (err) {
      console.error('Error purchasing query booster:', err);
      onError?.('Greska pri pokretanju procesa kupnje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kpd-query-booster">
      <div className="kpd-query-booster__header">
        <div className="kpd-query-booster__icon">
          <Zap size={24} />
        </div>
        <div>
          <h3 className="kpd-query-booster__title">Query Booster</h3>
          <p className="kpd-query-booster__subtitle">Trebate vise upita? Kupite dodatne!</p>
        </div>
      </div>

      <div className="kpd-query-booster__body">
        <div className="kpd-query-booster__info">
          <div className="kpd-query-booster__price">6,99 EUR</div>
          <div className="kpd-query-booster__details">10 dodatnih upita</div>
          <div className="kpd-query-booster__badge">
            <Infinity size={12} />
            Nikad ne istjecu
          </div>
        </div>

        <button
          onClick={handlePurchase}
          disabled={loading}
          className="kpd-btn kpd-btn--primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ucitavanje...
            </>
          ) : (
            <>
              <Zap size={16} />
              Kupi Query Booster
            </>
          )}
        </button>
      </div>
    </div>
  );
}

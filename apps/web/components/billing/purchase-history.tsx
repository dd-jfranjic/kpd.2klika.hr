'use client';

import { useState, useEffect } from 'react';
import { History, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Purchase {
  id: string;
  productType: 'ONE_TIME_PLAN' | 'QUERY_BOOSTER' | 'MANUAL_GRANT';
  productName: string;
  priceEur: number;
  queriesIncluded: number;
  status: 'PENDING' | 'COMPLETED' | 'REFUNDED';
  purchasedAt: string | null;
  createdAt: string;
}

interface PurchaseHistoryProps {
  organizationId: string;
  token: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const statusConfig = {
  PENDING: { label: 'Na cekanju', icon: Clock, color: 'text-yellow-600' },
  COMPLETED: { label: 'Zavrseno', icon: CheckCircle, color: 'text-green-600' },
  REFUNDED: { label: 'Refundirano', icon: XCircle, color: 'text-red-600' },
};

const productTypeLabels = {
  ONE_TIME_PLAN: 'Jednokratni paket',
  QUERY_BOOSTER: 'Query Booster',
  MANUAL_GRANT: 'Bonus upiti',
};

/**
 * PurchaseHistory - Displays purchase history for an organization
 */
export function PurchaseHistory({ organizationId, token }: PurchaseHistoryProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPurchases() {
      if (!organizationId || !token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/stripe/purchases/${organizationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPurchases(data.purchases || []);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Greska pri ucitavanju povijesti');
        }
      } catch (err) {
        console.error('Error fetching purchase history:', err);
        setError('Greska pri ucitavanju povijesti kupnji');
      } finally {
        setLoading(false);
      }
    }

    fetchPurchases();
  }, [organizationId, token]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Besplatno';
    return `${price.toFixed(2)} EUR`;
  };

  if (loading) {
    return (
      <div className="kpd-purchase-history">
        <div className="kpd-purchase-history__header">
          <h3 className="kpd-purchase-history__title">Povijest kupnji</h3>
        </div>
        <div className="kpd-purchase-history__list">
          <div className="kpd-purchase-history__empty">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Ucitavanje...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kpd-purchase-history">
        <div className="kpd-purchase-history__header">
          <h3 className="kpd-purchase-history__title">Povijest kupnji</h3>
        </div>
        <div className="kpd-purchase-history__list">
          <div className="kpd-purchase-history__empty text-red-600">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kpd-purchase-history">
      <div className="kpd-purchase-history__header">
        <h3 className="kpd-purchase-history__title">
          <History size={18} className="inline mr-2" />
          Povijest kupnji
        </h3>
      </div>

      {purchases.length === 0 ? (
        <div className="kpd-purchase-history__list">
          <div className="kpd-purchase-history__empty">
            Nemate nijednu jednokratnu kupnju.
          </div>
        </div>
      ) : (
        <div className="kpd-purchase-history__list">
          {purchases.map((purchase) => {
            const status = statusConfig[purchase.status];
            const StatusIcon = status.icon;

            return (
              <div key={purchase.id} className="kpd-purchase-history__item">
                <div className="kpd-purchase-history__item-info">
                  <div className="kpd-purchase-history__item-name">
                    {purchase.productName}
                  </div>
                  <div className="kpd-purchase-history__item-date">
                    {productTypeLabels[purchase.productType]} - {formatDate(purchase.purchasedAt || purchase.createdAt)}
                  </div>
                </div>
                <div className="kpd-purchase-history__item-meta">
                  <div className="kpd-purchase-history__item-price">
                    {formatPrice(purchase.priceEur)}
                  </div>
                  <div className={`kpd-purchase-history__item-status flex items-center gap-1 ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

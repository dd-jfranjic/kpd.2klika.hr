# Stripe Manual Setup - KPD 2klika

**Status**: ČEKA KORISNIKA
**Datum**: 2025-12-13

---

## Što treba napraviti u Stripe Dashboardu

### 1. Kreiraj Recurring Prices (Monthly)

Idi na: https://dashboard.stripe.com/test/products

Za svaki produkt klikni "Add Price":

| Produkt | Product ID | Cijena | Tip |
|---------|------------|--------|-----|
| KPD Basic Plan | `prod_Tb6qvnt8Xv8ydf` | 9.99 EUR | Recurring Monthly |
| KPD Pro Plan | `prod_Tb6q49VnIeQZhU` | 19.99 EUR | Recurring Monthly |
| KPD Enterprise Plan | `prod_Tb6qiu9i5xUobo` | 49.99 EUR | Recurring Monthly |

**Koraci:**
1. Klikni na produkt
2. Klikni "Add another price"
3. Pricing model: Standard pricing
4. Price: [cijena] EUR
5. Billing period: Monthly
6. Save

### 2. Kopiraj Price IDs

Nakon kreiranja cijena, kopiraj Price IDs (počinju s `price_`) i dodaj u `.env`:

```bash
# /var/www/vhosts/kpd.2klika.hr/httpdocs/.env

STRIPE_PRICE_BASIC=price_XXXXXXXXX
STRIPE_PRICE_PRO=price_XXXXXXXXX
STRIPE_PRICE_ENTERPRISE=price_XXXXXXXXX
```

### 3. Registriraj Webhook Endpoint

Idi na: https://dashboard.stripe.com/test/webhooks

Klikni "Add endpoint":

- **Endpoint URL**: `https://kpd.2klika.hr/api/v1/webhooks/stripe`
- **Events to listen**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `invoice.upcoming`

### 4. Kopiraj Webhook Secret

Nakon kreiranja endpointa, klikni na njega i kopiraj "Signing secret" (počinje s `whsec_`):

```bash
# /var/www/vhosts/kpd.2klika.hr/httpdocs/.env

STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXX
```

### 5. Restart Docker

Nakon dodavanja u .env:

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d
```

---

## Verifikacija

Nakon setup-a testiraj:

1. **Plans endpoint**: https://kpd.2klika.hr/api/v1/stripe/plans
   - Trebao bi vratiti planove s priceId vrijednostima

2. **Checkout flow**: Prijavi se, idi na /settings/billing, klikni "Nadogradi"
   - Trebao bi se otvoriti Stripe Checkout

3. **Webhook**: U Stripe Dashboard -> Webhooks -> klikni endpoint -> "Send test webhook"
   - Provjeri API logove: `docker logs kpd-api -f`

---

## Test Kartice (Test Mode)

| Broj kartice | Opis |
|--------------|------|
| 4242 4242 4242 4242 | Uspješno plaćanje |
| 4000 0000 0000 9995 | Odbijeno (insufficient funds) |
| 4000 0000 0000 0341 | Odbijeno (generic decline) |

Koristi bilo koji budući datum isteka i bilo koji CVC.

---

**Kada završiš**: Javi da mogu verificirati i zatvoriti FAZU 3.

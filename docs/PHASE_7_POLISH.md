# FAZA 7: POLISH & LAUNCH

**Status**: Ceka
**Preduvjeti**: PHASE_6_ADMIN.md - kompletirana
**Sljedeca faza**: GO LIVE!

---

## Cilj Faze

Finalizirati sve detalje, testirati, optimizirati i lansirati.

---

## 1. Email Templates

### Templates za Kreirati

Koristiti React Email + Tailwind.

**Lokacija:** `packages/email/templates/`

| Template | Event | Subject |
|----------|-------|---------|
| welcome.tsx | Registration | "Dobrodosli u KPD 2klika!" |
| verification.tsx | Email verify | "Potvrdite email adresu" |
| password-reset.tsx | Password reset | "Reset lozinke" |
| invitation.tsx | Workspace invite | "{name} vas je pozvao..." |
| subscription-welcome.tsx | New subscription | "Dobrodosli u KPD {plan}!" |
| payment-receipt.tsx | Payment success | "Potvrda placanja" |
| payment-failed.tsx | Payment failed | "Problem s placanjem" |
| upcoming-renewal.tsx | 3 days before | "Vasa pretplata se obnavlja" |
| subscription-cancelled.tsx | Cancelled | "Pretplata otkazana" |
| query-limit-warning.tsx | 80% usage | "Blizu ste dnevnog limita" |

### Email Style Guide

```tsx
// Konzistentna tema kroz sve emailove
const emailTheme = {
  primaryColor: '#10B981',
  textColor: '#111827',
  backgroundColor: '#F9FAFB',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
```

---

## 2. Landing Page Update

### Izmjene

- [ ] Update tekst za subscription model
- [ ] Dodati pricing CTA sekciju
- [ ] Link na /pricing stranicu
- [ ] Update footer

### Pricing CTA Section

```
+----------------------------------------------------------+
|                                                          |
|         Odaberite paket koji vam odgovara                |
|                                                          |
|  +----------+  +----------+  +----------+  +----------+  |
|  |   FREE   |  |  BASIC   |  |   PRO    |  |ENTERPRISE|  |
|  |   0 EUR  |  | 9.99 EUR |  |19.99 EUR |  |49.99 EUR |  |
|  +----------+  +----------+  +----------+  +----------+  |
|                                                          |
|              [Pogledaj sve pakete ->]                    |
|                                                          |
+----------------------------------------------------------+
```

---

## 3. SEO Optimization

### Meta Tags

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: 'KPD 2klika - AI KPD Klasifikator',
  description: 'Pronadi tocnu KPD sifru za svoju djelatnost uz pomoc AI-a. 3.300+ sifri, instant rezultati.',
  keywords: 'KPD, klasifikacija djelatnosti, KPD sifre, hrvatska, poduzetnici',
  openGraph: {
    title: 'KPD 2klika - AI KPD Klasifikator',
    description: 'Pronadi tocnu KPD sifru za svoju djelatnost',
    url: 'https://kpd.2klika.hr',
    siteName: 'KPD 2klika',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'hr_HR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KPD 2klika - AI KPD Klasifikator',
    description: 'Pronadi tocnu KPD sifru za svoju djelatnost',
    images: ['/og-image.png'],
  },
};
```

### Robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /api

Sitemap: https://kpd.2klika.hr/sitemap.xml
```

### Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kpd.2klika.hr/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kpd.2klika.hr/pricing</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://kpd.2klika.hr/login</loc>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://kpd.2klika.hr/register</loc>
    <priority>0.5</priority>
  </url>
</urlset>
```

---

## 4. Performance Optimization

### Frontend

- [ ] Image optimization (next/image)
- [ ] Lazy loading za heavy komponente
- [ ] Code splitting
- [ ] Bundle size analysis

### Backend

- [ ] Database query optimization
- [ ] Redis caching provjera
- [ ] Connection pooling (PgBouncer)
- [ ] Rate limiting fine-tuning

### Checklist

```bash
# Lighthouse audit
npx lighthouse https://kpd.2klika.hr --view

# Bundle analysis
npm run build -- --analyze
```

---

## 5. Security Audit

### OWASP Top 10 Checklist

- [ ] A01:2021 - Broken Access Control
  - Verificiraj role guards
  - Testiraj tenant isolation

- [ ] A02:2021 - Cryptographic Failures
  - Provjeri password hashing (bcrypt 12 rounds)
  - HTTPS only

- [ ] A03:2021 - Injection
  - Prisma parametrizirani upiti
  - Zod validacija inputa

- [ ] A04:2021 - Insecure Design
  - Rate limiting na svim endpoints
  - Audit logging

- [ ] A05:2021 - Security Misconfiguration
  - CORS pravilno konfiguriran
  - Security headers (helmet)

- [ ] A06:2021 - Vulnerable Components
  - `npm audit`
  - Update dependencies

- [ ] A07:2021 - Auth Failures
  - JWT expiry provjera
  - Password policy

- [ ] A08:2021 - Data Integrity
  - Webhook signature verification
  - CSRF protection

- [ ] A09:2021 - Logging & Monitoring
  - Error logging (Pino)
  - Audit trail kompletiran

- [ ] A10:2021 - SSRF
  - Nema external URL fetching

### Security Headers

```typescript
// NestJS helmet config
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        frameSrc: ['https://js.stripe.com'],
      },
    },
  }),
);
```

---

## 6. Testing

### E2E Test Scenarios

```typescript
// Kritični scenariji za testirati

describe('Auth Flow', () => {
  it('should register new user with org', () => {});
  it('should login and get JWT', () => {});
  it('should verify email', () => {});
  it('should reset password', () => {});
});

describe('KPD Tool', () => {
  it('should return AI suggestions', () => {});
  it('should enforce usage limit', () => {});
  it('should cache repeated queries', () => {});
});

describe('Subscription', () => {
  it('should create checkout session', () => {});
  it('should handle webhook events', () => {});
  it('should upgrade plan', () => {});
  it('should cancel subscription', () => {});
});

describe('Multi-tenant', () => {
  it('should isolate org data', () => {});
  it('should invite member', () => {});
  it('should enforce member limits', () => {});
});
```

### Load Testing

```bash
# Apache Bench
ab -n 1000 -c 50 https://kpd.2klika.hr/api/health

# K6
k6 run loadtest.js
```

---

## 7. Stripe Live Mode

### Checklist prije go-live

- [ ] Testiraj sve flows u test mode
- [ ] Kreiraj LIVE produkte u Stripe
- [ ] Zamijeni test keys s live keys
- [ ] Konfiguriraj LIVE webhook
- [ ] Test s pravom karticom (mali iznos)
- [ ] Provjeri invoice template u Stripe

### .env Update

```env
# LIVE mode
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

STRIPE_PRICE_BASIC=price_live_xxx
STRIPE_PRICE_PRO=price_live_xxx
STRIPE_PRICE_ENTERPRISE=price_live_xxx
```

---

## 8. Monitoring Setup

### Health Checks

```typescript
// Endpoint: GET /health
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "rag": "available",
  "uptime": 123456
}
```

### Alerts (optional)

- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance monitoring (optional)

---

## 9. Documentation

### User Documentation

- [ ] FAQ page
- [ ] Pricing explanation
- [ ] KPD search tips

### Developer Documentation

- [ ] API documentation (internal)
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

## 10. Go-Live Checklist

### Pre-Launch

- [ ] Svi testovi prolaze
- [ ] Security audit kompletiran
- [ ] Performance optimiziran
- [ ] Email templates testirani
- [ ] Stripe live mode
- [ ] DNS konfiguriran
- [ ] SSL certifikat
- [ ] Backup strategija

### Launch Day

- [ ] Final database migration
- [ ] Deploy to production
- [ ] Provjeri sve endpoints
- [ ] Test registration flow
- [ ] Test payment flow
- [ ] Monitor error logs

### Post-Launch

- [ ] Monitor performance
- [ ] Odgovaraj na user feedback
- [ ] Fix kritične bugove odmah
- [ ] Weekly backup provjera

---

## Docker Cleanup (OBAVEZNO!)

Nakon svakog rebuilda:

```bash
docker image prune -f
docker builder prune -f
docker system df  # Provjera
```

---

## Final Files Checklist

- [ ] .env s live keys
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] og-image.png
- [ ] favicon.ico
- [ ] README.md update

---

## Reference

- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md)
- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **CLAUDE.md**: Projektne upute

---

**SLJEDECI KORAK**: GO LIVE!

---

**Last Updated**: 2025-12-13
**Maintained by**: Claude Code

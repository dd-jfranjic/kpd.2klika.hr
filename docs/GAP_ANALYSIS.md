# GAP_ANALYSIS.md - Usporedba Trenutnog Stanja s Premium Praksama

**Projekt**: KPD 2klika
**Datum**: 2025-12-15
**Verzija**: 1.0
**Svrha**: Identificirati nedostatke u usporedbi s industry best practices

---

## SADRŽAJ

1. [Executive Summary](#1-executive-summary)
2. [Gap Analiza po Kategorijama](#2-gap-analiza-po-kategorijama)
3. [Detaljna Usporedba](#3-detaljna-usporedba)
4. [Prioritizacija](#4-prioritizacija)
5. [Rizici Trenutnog Stanja](#5-rizici-trenutnog-stanja)

---

## 1. EXECUTIVE SUMMARY

### Ukupan Score

| Kategorija | Trenutno | Premium Standard | Gap |
|------------|----------|------------------|-----|
| **RBAC** | 60% | 100% | -40% |
| **Secrets Management** | 45% | 100% | -55% |
| **Audit Logging** | 70% | 100% | -30% |
| **Admin UX** | 55% | 100% | -45% |
| **Security** | 75% | 100% | -25% |
| **UKUPNO** | **61%** | **100%** | **-39%** |

### Ključni Nedostaci (Top 5)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 1 | **Nema Admin Dashboard landing page** | Visok | Nizak |
| 2 | **Secrets bez verzioniranja i rotacije** | Visok | Srednji |
| 3 | **Audit log bez export funkcije** | Srednji | Nizak |
| 4 | **Analytics s placeholder podacima** | Srednji | Srednji |
| 5 | **Nema bulk operacija** | Srednji | Nizak |

### Što Radi Dobro

| Feature | Status | Komentar |
|---------|--------|----------|
| AdminGuard s DB lookup | **Implementirano** | Defense-in-depth |
| Whitelist za config keys | **Implementirano** | Sigurnosna mjera |
| Audit logging za sve akcije | **Implementirano** | Compliance ready |
| Secret masking u UI | **Implementirano** | OWASP compliant |
| JWT + Refresh tokens | **Implementirano** | Standard praksa |
| Zod validacija | **Implementirano** | Input sanitization |

---

## 2. GAP ANALIZA PO KATEGORIJAMA

### 2.1 RBAC - Role-Based Access Control

| Premium Praksa | Trenutno Stanje | Gap | Prioritet |
|----------------|-----------------|-----|-----------|
| Odvojen Master Admin entitet | Email whitelist + SUPER_ADMIN role | **PARTIAL** | P1 |
| Tenant-scoped roles | Samo globalne role (MEMBER, SUPER_ADMIN) | **MISSING** | P2 |
| Permission builder | Nema - fiksne permisije | **MISSING** | P3 |
| Role inheritance | Nema | **MISSING** | P3 |
| Custom roles per tenant | Nema | **MISSING** | P3 |
| Master Admin poseban dashboard | Koristi isti layout kao useri | **PARTIAL** | P1 |
| Master Admin billing bypass | Implementirano (isMasterAdmin check) | **OK** | - |

**Gap Score: 40%**

**Analiza:**
- Trenutni sustav koristi jednostavan **Global Roles** pristup (MEMBER, SUPER_ADMIN)
- Premium praksa preporučuje **Hybrid Templates** za B2B SaaS
- Master Admin detekcija na frontendu koristi email whitelist - OK za MVP, ali ne skalira
- Nema UI distinkcije između Master Admin i Tenant Admin

### 2.2 Secrets Management

| Premium Praksa | Trenutno Stanje | Gap | Prioritet |
|----------------|-----------------|-----|-----------|
| Encryption at-rest | SystemConfig.isSecret=true | **PARTIAL** | P1 |
| Secret versioning | Nema | **MISSING** | P1 |
| Automatic rotation | Nema | **MISSING** | P2 |
| Rotation notifications | Nema | **MISSING** | P2 |
| Secret expiration | Nema | **MISSING** | P2 |
| Environment scoping (dev/prod) | Nema | **MISSING** | P1 |
| Audit trail za secret access | Samo update se logira | **PARTIAL** | P1 |
| UI masking | Implementirano (•••••) | **OK** | - |
| Whitelist protection | Implementirano | **OK** | - |

**Gap Score: 55%**

**Analiza:**
- Trenutno stanje: secrets se čuvaju u SystemConfig s isSecret=true
- Premium praksa: verzioniranje, rotacija, expiration, environment scoping
- OWASP preporučuje rotaciju svakih 90 dana - **nije implementirano**
- Nema načina da se vrati na prethodnu verziju secreta

### 2.3 Audit Logging

| Premium Praksa | Trenutno Stanje | Gap | Prioritet |
|----------------|-----------------|-----|-----------|
| All admin actions logged | Implementirano | **OK** | - |
| Filterable by action/date | Implementirano | **OK** | - |
| User agent logging | Implementirano | **OK** | - |
| IP address logging | Implementirano | **OK** | - |
| Export (CSV, JSON) | Nema | **MISSING** | P0 |
| Real-time streaming | Nema | **MISSING** | P2 |
| Retention policies | Nema auto-cleanup | **MISSING** | P2 |
| Compliance reports | Nema | **MISSING** | P2 |
| Anomaly detection | Nema | **MISSING** | P3 |
| SIEM integration | Nema | **MISSING** | P3 |

**Gap Score: 30%**

**Analiza:**
- Audit logging je solidno implementiran za SOC 2 baseline
- Kritični gap: **nema export funkcionalnosti** - compliance zahtjev
- Nema real-time updates (polling every page load)
- Retention nije definirano - potencijalni storage issue

### 2.4 Admin Dashboard UX

| Premium Praksa | Trenutno Stanje | Gap | Prioritet |
|----------------|-----------------|-----|-----------|
| Landing page s metrikama | **/admin nema landing** | **MISSING** | P0 |
| Recent activity timeline | Nema | **MISSING** | P1 |
| Quick actions | Nema | **MISSING** | P1 |
| System health status | Nema | **MISSING** | P2 |
| Search (full-text) | Partial - per-page | **PARTIAL** | P2 |
| Bulk operations | Nema | **MISSING** | P1 |
| Column visibility toggle | Nema | **MISSING** | P3 |
| Export funkcionalnost | Nema | **MISSING** | P0 |
| Breadcrumbs navigation | Partial | **PARTIAL** | P2 |
| Keyboard shortcuts | Nema | **MISSING** | P3 |
| Detail modals | Nema | **MISSING** | P2 |

**Gap Score: 45%**

**Analiza:**
- **/admin ruta ne postoji** - korisnik mora odabrati stranicu iz sidebara
- Premium dashboards imaju landing page s key metrics i quick actions
- Bulk operations su standard u enterprise admin panelima
- Export je očekivana funkcionalnost za compliance

### 2.5 Security

| Premium Praksa | Trenutno Stanje | Gap | Prioritet |
|----------------|-----------------|-----|-----------|
| JWT authentication | Implementirano | **OK** | - |
| Refresh token rotation | Implementirano | **OK** | - |
| AdminGuard | Implementirano | **OK** | - |
| Rate limiting | Global throttler | **OK** | - |
| Input validation | Zod schemas | **OK** | - |
| Defense in depth | DB lookup u guard | **OK** | - |
| IP whitelisting za admin | Nema | **MISSING** | P2 |
| 2FA enforcement za admin | Nema | **MISSING** | P1 |
| Session timeout (30 min) | 15 min access token | **PARTIAL** | P2 |
| Re-auth za kritične akcije | Nema | **MISSING** | P2 |
| SSO support | Nema | **MISSING** | P3 |

**Gap Score: 25%**

**Analiza:**
- Sigurnosne osnove su dobro implementirane
- **2FA za admin račune** - kritični gap za enterprise
- IP whitelisting bi dodao dodatni sloj zaštite
- Re-authentication za kritične akcije (npr. brisanje) je standard

---

## 3. DETALJNA USPOREDBA

### 3.1 Admin Dashboard Landing Page

**Premium Primjer (Clerk/Stripe):**
```
┌─────────────────────────────────────────────────┐
│ ADMIN DASHBOARD                                 │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Users   │ │ Tenants │ │ Revenue │ │ Queries │ │
│ │   127   │ │    23   │ │ €2,340  │ │  8,521  │ │
│ │ +12%    │ │ +8%     │ │ +15%    │ │ +23%    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────┤
│ RECENT ACTIVITY            │ QUICK ACTIONS      │
│ ────────────────────────── │ ─────────────────  │
│ User john@ex.com signed up │ [+ Create User]    │
│ 2 minutes ago              │ [Sync KPD Codes]   │
│                            │ [View Audit Logs]  │
│ Tenant "Acme" upgraded     │ [System Health]    │
│ 15 minutes ago             │                    │
├─────────────────────────────────────────────────┤
│ SYSTEM HEALTH              │ ALERTS             │
│ API: ● Online              │ ⚠ 3 failed logins  │
│ DB: ● Online               │ ⚠ Disk 85% full    │
│ Cache: ● Online            │                    │
└─────────────────────────────────────────────────┘
```

**Trenutno Stanje:**
- `/admin` ruta **NE POSTOJI**
- Korisnik mora odabrati stranicu iz sidebara
- Nema overview metrika na jednom mjestu
- Nema quick actions

**Gap:**
- **KRITIČNO** - nema landing page
- Potrebno: kreirati `/admin` s overview metrikama

### 3.2 Secrets Management

**Premium Primjer (HashiCorp Vault):**
```typescript
interface SecretVersion {
  id: string;
  secretKey: string;
  version: number;
  value: string;         // encrypted
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  rotatedAt?: Date;
  isActive: boolean;
}

// API: Get secret with version history
GET /admin/secrets/STRIPE_API_KEY/versions
Response: [
  { version: 3, createdAt: "2025-12-01", isActive: true },
  { version: 2, createdAt: "2025-09-01", isActive: false },
  { version: 1, createdAt: "2025-06-01", isActive: false }
]

// API: Rotate secret
POST /admin/secrets/STRIPE_API_KEY/rotate
Response: { newVersion: 4, previousVersion: 3 }

// API: Rollback to previous version
POST /admin/secrets/STRIPE_API_KEY/rollback
Body: { targetVersion: 2 }
```

**Trenutno Stanje:**
```typescript
// Samo update, bez verzioniranja
PATCH /admin/integrations/:key
Body: { value: "new_secret" }
// Stara vrijednost se gubi!
```

**Gap:**
- Nema verzioniranja
- Nema rollback
- Nema expiration
- Nema automatska rotacija

### 3.3 Audit Log Export

**Premium Primjer (Datadog):**
```typescript
// Export API
GET /admin/audit-logs/export?format=csv&dateFrom=2025-01-01&dateTo=2025-12-31
Response Headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="audit-logs-2025.csv"

// Background job za velike exportse
POST /admin/audit-logs/export-async
Body: { format: "json", dateFrom: "2025-01-01", dateTo: "2025-12-31", email: true }
Response: { jobId: "export-123", estimatedTime: "5 minutes" }
```

**Trenutno Stanje:**
- Samo UI prikaz
- **Nema export opcije**
- Nema download

**Gap:**
- Export je **compliance zahtjev** (SOC 2, GDPR)
- Potrebno: CSV, JSON, PDF export

### 3.4 Bulk Operations

**Premium Primjer (Clerk):**
```
┌──────────────────────────────────────────────────┐
│ □ Select All (127 users)         [Bulk Actions▼]│
├──────────────────────────────────────────────────┤
│ ☑ john@example.com    Admin     Active          │
│ ☑ jane@example.com    Member    Active          │
│ □ bob@example.com     Member    Suspended       │
├──────────────────────────────────────────────────┤
│ 2 selected                                       │
│ [Suspend Selected] [Change Role] [Export] [Delete]│
└──────────────────────────────────────────────────┘
```

**Trenutno Stanje:**
- Samo pojedinačne akcije
- Nema select all
- Nema bulk actions

**Gap:**
- Bulk suspend/activate
- Bulk role change
- Bulk delete
- Multi-select UI

---

## 4. PRIORITIZACIJA

### P0 - Critical (Must Have - Sprint 1)

| Gap | Impact | Effort | Justification |
|-----|--------|--------|---------------|
| Admin Dashboard landing page | Visok | 3 dana | UX baseline, prvi dojam |
| Audit log export (CSV/JSON) | Visok | 2 dana | Compliance zahtjev |
| Master Admin "Unlimited" UI | Srednji | 1 dan | Business zahtjev |

**Sprint 1 Total: ~6 dana**

### P1 - High (Should Have - Sprint 2-3)

| Gap | Impact | Effort | Justification |
|-----|--------|--------|---------------|
| Secret verzioniranje | Visok | 5 dana | OWASP preporuka |
| Bulk operations (users/tenants) | Srednji | 3 dana | Admin efficiency |
| Analytics pravi podaci | Srednji | 4 dana | Ukloniti placeholdere |
| Recent activity timeline | Srednji | 2 dana | Admin awareness |
| Quick actions widget | Nizak | 1 dan | UX improvement |
| 2FA za admin račune | Visok | 4 dana | Security requirement |

**Sprint 2-3 Total: ~19 dana**

### P2 - Medium (Nice to Have - Sprint 4+)

| Gap | Impact | Effort | Justification |
|-----|--------|--------|---------------|
| Secret rotation | Srednji | 3 dana | Security enhancement |
| IP whitelisting za admin | Srednji | 2 dana | Additional security layer |
| Real-time audit updates | Nizak | 3 dana | UX enhancement |
| Retention policies | Nizak | 2 dana | Storage management |
| System health dashboard | Srednji | 3 dana | Monitoring |
| Re-auth za kritične akcije | Srednji | 2 dana | Security |
| Environment scoping | Srednji | 4 dana | Dev/Prod separation |
| Breadcrumbs improvement | Nizak | 1 dan | Navigation |

**Sprint 4+ Total: ~20 dana**

### P3 - Low (Future Consideration)

| Gap | Impact | Effort | Justification |
|-----|--------|--------|---------------|
| Custom roles per tenant | Nizak | 10 dana | Enterprise feature |
| Permission builder | Nizak | 15 dana | Advanced RBAC |
| Anomaly detection | Nizak | 10 dana | AI/ML feature |
| SIEM integration | Nizak | 5 dana | Enterprise compliance |
| SSO support | Srednji | 10 dana | Enterprise feature |
| Keyboard shortcuts | Nizak | 3 dana | Power user feature |

---

## 5. RIZICI TRENUTNOG STANJA

### 5.1 Sigurnosni Rizici

| Rizik | Opis | Mitigacija |
|-------|------|------------|
| **Secret exposure** | Nema verzioniranja - ako se secret kompromitira, nema rollback | Implementirati verzioniranje |
| **No 2FA** | Admin računi nemaju dodatnu zaštitu | Dodati 2FA requirement |
| **No IP restriction** | Admin panel dostupan s bilo koje IP adrese | IP whitelist |
| **Session hijacking** | 15 min access token može biti predug | Skratiti + re-auth |

### 5.2 Compliance Rizici

| Rizik | Standard | Status |
|-------|----------|--------|
| **Audit export** | SOC 2, GDPR | **NIJE IMPLEMENTIRANO** |
| **Retention policy** | GDPR Art. 17 | **NIJE DEFINIRANO** |
| **Data portability** | GDPR Art. 20 | **NIJE IMPLEMENTIRANO** |

### 5.3 Operativni Rizici

| Rizik | Opis | Impact |
|-------|------|--------|
| **No dashboard** | Admin nema overview - mora navigirati kroz sve stranice | Smanjena efikasnost |
| **Placeholder analytics** | Odluke se ne mogu temeljiti na podacima | Loše poslovne odluke |
| **No bulk ops** | Svaki user/tenant zasebno | Vrijeme za admin ops |

---

## ZAKLJUČAK

### Prioritetni Action Items

1. **ODMAH (P0)**:
   - Kreirati `/admin` landing page s metrikama
   - Dodati export za audit logove
   - Implementirati "Unlimited" badge za Master Admin

2. **KRATKOROČNO (P1)**:
   - Secret verzioniranje i audit
   - Bulk operacije za users/tenants
   - Analytics s pravim podacima
   - 2FA za admin račune

3. **SREDNJOROČNO (P2)**:
   - Secret rotation
   - IP whitelisting
   - Real-time updates
   - System health monitoring

### Metrike Uspjeha

| Metrika | Trenutno | Cilj (3 mjeseca) |
|---------|----------|------------------|
| Gap Score | 61% | 85% |
| P0 Items | 0/3 | 3/3 |
| P1 Items | 0/6 | 4/6 |
| Compliance Ready | Partial | Full |

---

**Kreirano**: 2025-12-15
**Autor**: Claude Code
**Verzija**: 1.0

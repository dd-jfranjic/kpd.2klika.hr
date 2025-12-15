# MASTER_ADMIN_ROADMAP.md - Roadmap za Master Admin Panel

**Projekt**: KPD 2klika
**Datum**: 2025-12-15
**Verzija**: 1.0
**Svrha**: Prioritizirani plan razvoja Master Admin panela

---

## SADRŽAJ

1. [Sprint Overview](#1-sprint-overview)
2. [Sprint 1 - Critical Fixes (P0)](#2-sprint-1---critical-fixes-p0)
3. [Sprint 2 - Security & Efficiency (P1)](#3-sprint-2---security--efficiency-p1)
4. [Sprint 3 - Analytics & Operations (P1)](#4-sprint-3---analytics--operations-p1)
5. [Sprint 4+ - Enhancements (P2)](#5-sprint-4---enhancements-p2)
6. [Future Considerations (P3)](#6-future-considerations-p3)
7. [Dependencies](#7-dependencies)
8. [Success Metrics](#8-success-metrics)

---

## 1. SPRINT OVERVIEW

| Sprint | Fokus | User Stories | Effort |
|--------|-------|--------------|--------|
| **Sprint 1** | Critical Fixes (P0) | 4 | ~6 dana |
| **Sprint 2** | Security & Efficiency (P1) | 5 | ~10 dana |
| **Sprint 3** | Analytics & Operations (P1) | 4 | ~9 dana |
| **Sprint 4+** | Enhancements (P2) | 8 | ~20 dana |
| **Future** | Enterprise Features (P3) | 6 | TBD |

**Total Estimated Effort**: ~45 dana (Sprints 1-4)

---

## 2. SPRINT 1 - CRITICAL FIXES (P0)

**Trajanje**: 6 dana
**Cilj**: Riješiti kritične nedostatke koji blokiraju osnovnu funkcionalnost

---

### US-001: Admin Dashboard Landing Page

**Prioritet**: P0
**Effort**: 3 dana
**Kategorija**: UX

#### User Story
```
Kao Master Admin,
Želim vidjeti pregled ključnih metrika na početnoj stranici admin panela,
Kako bih odmah znao stanje sustava bez navigiranja kroz sve stranice.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | `/admin` ruta postoji i prikazuje dashboard | Navigacija na URL |
| AC2 | 4 stats kartice: Users, Tenants, Revenue, Queries | UI pregled |
| AC3 | Recent Activity timeline (zadnjih 10 aktivnosti) | UI pregled |
| AC4 | Quick Actions (min 4 gumba) | Klik na akcije radi |
| AC5 | System Health indikatori (API, DB, Cache) | Status se ažurira |
| AC6 | Period selector (7d, 30d, 90d) utječe na metrike | Filter radi |
| AC7 | Responsive design (mobile friendly) | Test na mobilnom |

#### Technical Notes
```
Frontend:
- Kreirati /apps/web/app/admin/page.tsx
- Dodati DashboardStats komponente
- Dodati RecentActivity timeline
- Dodati QuickActions widget
- Dodati SystemHealth status

Backend:
- GET /api/v1/admin/dashboard endpoint
- Agregacija metrika iz postojećih servisa
- Cache na 5 minuta za performance
```

#### Definition of Done
- [ ] Kod napisan i reviewan
- [ ] Unit testovi prolaze
- [ ] Manual QA prošao
- [ ] Dokumentacija ažurirana
- [ ] Deployed na production

---

### US-002: Audit Log Export

**Prioritet**: P0
**Effort**: 2 dana
**Kategorija**: Compliance

#### User Story
```
Kao Master Admin,
Želim exportirati audit logove u CSV i JSON formatu,
Kako bih zadovoljio compliance zahtjeve i omogućio eksternu analizu.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Export gumb vidljiv na /admin/audit | UI pregled |
| AC2 | Dropdown s opcijama: CSV, JSON | Klik na gumb |
| AC3 | Export poštuje aktivne filtere | Filter pa export |
| AC4 | Download počinje unutar 5 sekundi (do 1000 zapisa) | Timing |
| AC5 | Ime datoteke: `audit-logs-YYYY-MM-DD.csv` | Download file |
| AC6 | CSV sadrži sve stupce iz tablice | Otvoriti file |
| AC7 | Za >10,000 zapisa, background job + email | Test s puno podataka |

#### Technical Notes
```
Frontend:
- Dodati ExportButton komponentu
- Dropdown za format selection
- Loading state tijekom exporta

Backend:
- GET /api/v1/admin/audit-logs/export?format=csv
- Stream response za velike fileove
- Background job za >10k zapisa (Bull queue)
```

#### Definition of Done
- [ ] CSV export radi
- [ ] JSON export radi
- [ ] Background job za velike exportse
- [ ] Dokumentacija ažurirana

---

### US-003: Master Admin "Unlimited" Badge

**Prioritet**: P0
**Effort**: 1 dan
**Kategorija**: Business Logic

#### User Story
```
Kao Master Admin,
Želim vidjeti jasnu indikaciju da imam "Unlimited" status (ne Enterprise),
Kako bi bilo jasno da ne plaćam za korištenje klasifikatora.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Billing stranica prikazuje "Unlimited" badge | UI pregled |
| AC2 | Badge je zlatne boje s crown ikonom | Visual check |
| AC3 | Tooltip objašnjava: "Master Admin - neograničeno korištenje" | Hover |
| AC4 | Nema "Upgrade" gumba za Master Admina | UI pregled |
| AC5 | Usage statistika prikazuje "∞" umjesto broja | UI pregled |
| AC6 | Admin sidebar prikazuje "Master Admin" tag | UI pregled |
| AC7 | Backend vraća isMasterAdmin: true za API | API response |

#### Technical Notes
```
Frontend:
- Ažurirati BillingPage za isMasterAdmin check
- Kreirati UnlimitedBadge komponentu
- Ažurirati AdminSidebar s Master Admin tag

Backend:
- Dodati isMasterAdmin u user response
- Ažurirati UsageService da preskače Master Admin
```

#### Definition of Done
- [ ] Badge se prikazuje ispravno
- [ ] Nema Upgrade opcija
- [ ] Usage tracking preskače Master Admina

---

### US-004: Sidebar Master Admin Distinkcija

**Prioritet**: P0
**Effort**: 0.5 dana
**Kategorija**: UX

#### User Story
```
Kao Master Admin,
Želim vizualnu distinkciju u navigaciji da sam Master Admin,
Kako bih odmah znao da imam povlašteni pristup.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | "Master Admin" badge u sidebaru pored imena | UI pregled |
| AC2 | Administracija sekcija ima posebnu boju | Visual check |
| AC3 | Crown ikona pored "Administracija" naslova | UI pregled |

#### Definition of Done
- [ ] Visual distinkcija implementirana
- [ ] Konzistentno na svim admin stranicama

---

## 3. SPRINT 2 - SECURITY & EFFICIENCY (P1)

**Trajanje**: 10 dana
**Cilj**: Poboljšati sigurnost i operativnu efikasnost

---

### US-005: Secret Verzioniranje

**Prioritet**: P1
**Effort**: 5 dana
**Kategorija**: Security

#### User Story
```
Kao Master Admin,
Želim verzioniranje secrets-a s mogućnošću rollbacka,
Kako bih mogao vratiti prethodnu vrijednost ako nešto pođe krivo.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Svaka promjena secreta kreira novu verziju | DB provjera |
| AC2 | UI prikazuje "Version X" za svaki secret | UI pregled |
| AC3 | History gumb pokazuje prethodne verzije | Klik + pregled |
| AC4 | Rollback gumb vraća prethodnu verziju | Rollback test |
| AC5 | Audit log bilježi verziju i rollback akcije | Audit pregled |
| AC6 | Max 10 verzija po secretu (FIFO cleanup) | Config provjera |

#### Technical Notes
```
Database:
- Kreirati SecretVersion model
- Dodati currentVersion relaciju na SystemConfig

Backend:
- GET /admin/secrets/:key/versions
- POST /admin/secrets/:key/rollback

Frontend:
- SecretHistoryModal komponenta
- RollbackButton s potvrdom
```

#### Definition of Done
- [ ] Verzioniranje radi
- [ ] Rollback radi
- [ ] Audit logging za sve akcije
- [ ] UI za history i rollback

---

### US-006: Bulk User Operations

**Prioritet**: P1
**Effort**: 3 dana
**Kategorija**: Efficiency

#### User Story
```
Kao Master Admin,
Želim označiti više korisnika i izvršiti bulk akcije,
Kako bih uštedio vrijeme kod masovnih operacija.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Checkbox za selekciju u svakom redu | UI pregled |
| AC2 | "Select All" checkbox u headeru | Klik selektira sve |
| AC3 | Bulk Actions dropdown vidljiv kad je >0 selektirano | Selekcija + UI |
| AC4 | Bulk Suspend akcija | Test s 3 usera |
| AC5 | Bulk Activate akcija | Test s 3 usera |
| AC6 | Bulk Change Role akcija | Test promjene role |
| AC7 | Confirmation modal prije bulk akcije | Klik pa modal |
| AC8 | Progress indicator tijekom bulk operacije | UI pregled |

#### Technical Notes
```
Backend:
- POST /admin/users/bulk-action
- Body: { userIds: [], action: "suspend" | "activate" | "changeRole", role?: string }
- Transaction za atomicity

Frontend:
- BulkActionBar komponenta
- Selection state management
- ConfirmationModal
```

#### Definition of Done
- [ ] Multi-select radi
- [ ] Sve bulk akcije rade
- [ ] Confirmation modal
- [ ] Audit log za svaku promjenu

---

### US-007: 2FA za Admin Račune

**Prioritet**: P1
**Effort**: 4 dana
**Kategorija**: Security

#### User Story
```
Kao vlasnik sustava,
Želim da Master Admin računi imaju obaveznu 2FA,
Kako bi admin pristup bio dodatno zaštićen.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | 2FA setup flow za TOTP (Google Authenticator) | Setup test |
| AC2 | QR kod za skeniranje | Mobile test |
| AC3 | Backup kodovi (10 jednokratnih) | Generate + use |
| AC4 | 2FA prompt na svakom admin loginu | Login test |
| AC5 | "Remember this device" opcija (30 dana) | Checkbox test |
| AC6 | Forced 2FA setup za nove admin račune | Novi admin test |
| AC7 | Disable 2FA samo uz master password | Security test |

#### Technical Notes
```
Backend:
- Koristiti speakeasy library za TOTP
- TwoFactorAuth model (userId, secret, backupCodes, isEnabled)
- POST /auth/2fa/setup
- POST /auth/2fa/verify
- POST /auth/2fa/disable

Frontend:
- TwoFactorSetup wizard
- TOTPInput komponenta (6 digits)
- BackupCodesDisplay
```

#### Definition of Done
- [ ] TOTP setup radi
- [ ] Verifikacija na login
- [ ] Backup kodovi rade
- [ ] Remember device radi

---

### US-008: Bulk Tenant Operations

**Prioritet**: P1
**Effort**: 2 dana
**Kategorija**: Efficiency

#### User Story
```
Kao Master Admin,
Želim bulk operacije za tenante (promjena plana, status),
Kako bih mogao efikasno upravljati većim brojem organizacija.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Multi-select za tenante | UI pregled |
| AC2 | Bulk Change Plan | Test s 3 tenanta |
| AC3 | Bulk Suspend/Activate | Test |
| AC4 | Confirmation s listom pogođenih tenanta | Modal pregled |

#### Definition of Done
- [ ] Multi-select implementiran
- [ ] Bulk akcije rade
- [ ] Audit log za sve promjene

---

### US-009: Recent Activity Widget

**Prioritet**: P1
**Effort**: 2 dana
**Kategorija**: UX

#### User Story
```
Kao Master Admin,
Želim vidjeti timeline nedavnih aktivnosti na dashboardu,
Kako bih bio svjestan što se događa u sustavu.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Timeline zadnjih 10 aktivnosti | UI pregled |
| AC2 | Svaka aktivnost ima ikonu, opis, vrijeme | Visual check |
| AC3 | Klik na aktivnost vodi na detalje | Navigacija |
| AC4 | "View all" link vodi na /admin/audit | Link test |
| AC5 | Real-time update (polling 30 sec) | Čekati + provjeriti |

#### Definition of Done
- [ ] Timeline komponenta radi
- [ ] Polling implementiran
- [ ] Navigacija radi

---

## 4. SPRINT 3 - ANALYTICS & OPERATIONS (P1)

**Trajanje**: 9 dana
**Cilj**: Ukloniti placeholder podatke i dodati operativne alate

---

### US-010: Analytics Pravi Podaci

**Prioritet**: P1
**Effort**: 4 dana
**Kategorija**: Data

#### User Story
```
Kao Master Admin,
Želim vidjeti prave podatke u analytics dashboardu,
Kako bih mogao donositi informirane poslovne odluke.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Revenue iz Stripe (ne placeholder) | Stripe dashboard usporedba |
| AC2 | Change percentage izračunat iz prethodnog perioda | Math provjera |
| AC3 | Avg response time iz query latency | Real metric |
| AC4 | Cache hit rate iz Redis stats | Redis provjera |
| AC5 | Uptime iz health check loga | Calculation check |
| AC6 | Error rate iz error logova | Real metric |

#### Technical Notes
```
Backend:
- Stripe API: list invoices za revenue
- Redis: INFO stats za cache hit rate
- QueryLog model za latency calculation
- HealthCheck model za uptime
```

#### Definition of Done
- [ ] Svi placeholder podaci zamijenjeni
- [ ] Metrike se ažuriraju u real-time
- [ ] Dokumentacija metrika

---

### US-011: Quick Actions Widget

**Prioritet**: P1
**Effort**: 1 dan
**Kategorija**: UX

#### User Story
```
Kao Master Admin,
Želim quick action gumbe na dashboardu,
Kako bih brzo pristupio čestim akcijama bez navigacije.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | "+ Create User" gumb | Otvara modal |
| AC2 | "Sync KPD Codes" gumb | Pokreće sync |
| AC3 | "View Audit Logs" gumb | Navigira |
| AC4 | "System Config" gumb | Navigira |
| AC5 | Gumbi imaju ikone i tooltips | Visual + hover |

#### Definition of Done
- [ ] 4+ quick actions implementirano
- [ ] Sve akcije rade

---

### US-012: User Creation iz Admina

**Prioritet**: P1
**Effort**: 2 dana
**Kategorija**: Operations

#### User Story
```
Kao Master Admin,
Želim kreirati novog korisnika direktno iz admin panela,
Kako bih mogao dodati korisnike bez da prolaze registration flow.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | "+ Create User" gumb na /admin/users | UI pregled |
| AC2 | Modal s formom: email, firstName, lastName, role | Modal test |
| AC3 | Password se auto-generira i šalje emailom | Email check |
| AC4 | Opcija za manual password | Form option |
| AC5 | Opcija za skip email verification | Checkbox |
| AC6 | Novi user pojavljuje se u listi | List refresh |
| AC7 | Audit log za kreiranje | Log provjera |

#### Technical Notes
```
Backend:
- POST /admin/users/create
- Generate secure password
- Send welcome email s credentials

Frontend:
- CreateUserModal komponenta
- Form validation (Zod)
```

#### Definition of Done
- [ ] User creation radi
- [ ] Email šalje password
- [ ] Audit log postoji

---

### US-013: Tenant Detail Modal

**Prioritet**: P1
**Effort**: 2 dana
**Kategorija**: UX

#### User Story
```
Kao Master Admin,
Želim vidjeti detalje o tenantu u modalu,
Kako bih imao sve informacije na jednom mjestu.
```

#### Acceptance Criteria

| # | Kriterij | Verifikacija |
|---|----------|--------------|
| AC1 | Klik na tenant otvara detail modal | Klik test |
| AC2 | Modal prikazuje: info, članove, usage, billing | Pregled sekcija |
| AC3 | Tab navigacija unutar modala | Tab switch |
| AC4 | Edit opcije unutar modala | Edit test |
| AC5 | Activity log za tog tenanta | Timeline pregled |

#### Definition of Done
- [ ] Modal implementiran
- [ ] Sve sekcije rade
- [ ] Edit funkcionalnost radi

---

## 5. SPRINT 4+ - ENHANCEMENTS (P2)

**Trajanje**: 20 dana
**Cilj**: Poboljšanja sigurnosti i UX-a

---

### US-014: Secret Rotation

**Prioritet**: P2
**Effort**: 3 dana

```
Kao Master Admin,
Želim automatsku rotaciju secrets-a s notifikacijom,
Kako bih zadovoljio OWASP preporuke za 90-dnevnu rotaciju.
```

**Acceptance Criteria:**
- Rotation schedule (30/60/90 dana)
- Email notifikacija 7 dana prije
- Manual rotate gumb
- Rotation log

---

### US-015: IP Whitelisting za Admin

**Prioritet**: P2
**Effort**: 2 dana

```
Kao vlasnik sustava,
Želim ograničiti admin pristup na specifične IP adrese,
Kako bih dodatno zaštitio admin panel.
```

**Acceptance Criteria:**
- Lista dozvoljenih IP-ova u config
- Wildcard support (10.0.0.*)
- Deny message za nedozvoljene IP-ove
- Audit log za blocked attempts

---

### US-016: Real-time Audit Updates

**Prioritet**: P2
**Effort**: 3 dana

```
Kao Master Admin,
Želim real-time ažuriranje audit logova,
Kako bih vidio aktivnosti čim se dogode.
```

**Acceptance Criteria:**
- WebSocket ili SSE connection
- New entry animacija
- Connection status indicator

---

### US-017: Retention Policies

**Prioritet**: P2
**Effort**: 2 dana

```
Kao vlasnik sustava,
Želim definirati retention politike za audit logove,
Kako bih upravljao storage i compliance zahtjevima.
```

**Acceptance Criteria:**
- Config za retention period (default 2 godine)
- Scheduled cleanup job
- Warning prije brisanja
- Export prije cleanup-a

---

### US-018: System Health Dashboard

**Prioritet**: P2
**Effort**: 3 dana

```
Kao Master Admin,
Želim dashboard sa statusom svih komponenti sustava,
Kako bih proaktivno reagirao na probleme.
```

**Acceptance Criteria:**
- API status (response time)
- Database status (connections)
- Redis status (memory)
- External services (Stripe, Gemini)
- Alert thresholds

---

### US-019: Re-auth za Kritične Akcije

**Prioritet**: P2
**Effort**: 2 dana

```
Kao vlasnik sustava,
Želim da kritične akcije zahtijevaju ponovnu autentifikaciju,
Kako bi se spriječile neovlaštene akcije.
```

**Acceptance Criteria:**
- Password re-entry modal
- Kritične akcije: delete user, change plan, modify secrets
- Session timeout za re-auth (5 min)

---

### US-020: Environment Scoping

**Prioritet**: P2
**Effort**: 4 dana

```
Kao Master Admin,
Želim odvojene konfiguracije za dev/staging/production,
Kako bih testirao promjene prije deploymenta.
```

**Acceptance Criteria:**
- Environment selector u admin panelu
- Separate config values per env
- Copy config between environments

---

### US-021: Improved Breadcrumbs

**Prioritet**: P2
**Effort**: 1 dan

```
Kao Master Admin,
Želim jasne breadcrumbs na svim admin stranicama,
Kako bih uvijek znao gdje se nalazim.
```

**Acceptance Criteria:**
- Breadcrumb na svim admin stranicama
- Klikabilni linkovi
- Current page highlighted

---

## 6. FUTURE CONSIDERATIONS (P3)

### Enterprise Features (TBD)

| Feature | Effort | Opis |
|---------|--------|------|
| Custom Roles per Tenant | 10 dana | Tenant može definirati vlastite role |
| Permission Builder | 15 dana | UI za kreiranje custom permisija |
| Anomaly Detection | 10 dana | AI/ML detekcija sumnjivih aktivnosti |
| SIEM Integration | 5 dana | Export logova u Splunk/Datadog |
| SSO Support | 10 dana | SAML/OIDC za enterprise klijente |
| Keyboard Shortcuts | 3 dana | Power user features |

---

## 7. DEPENDENCIES

### External Dependencies

| Dependency | Potrebno Za | Prioritet |
|------------|-------------|-----------|
| Stripe API | Revenue analytics | P1 |
| Redis INFO | Cache metrics | P1 |
| speakeasy | 2FA (TOTP) | P1 |
| Bull | Background jobs | P0 |

### Internal Dependencies

| Feature | Depends On |
|---------|------------|
| US-002 (Export) | Bulk data handling |
| US-007 (2FA) | Email service |
| US-010 (Analytics) | Query logging |
| US-016 (Real-time) | WebSocket setup |

---

## 8. SUCCESS METRICS

### Sprint 1 Success

| Metrika | Target |
|---------|--------|
| Dashboard exists | /admin ruta radi |
| Export works | CSV/JSON download |
| Unlimited badge | Visual distinction |
| Gap Score | 61% → 70% |

### Sprint 2 Success

| Metrika | Target |
|---------|--------|
| Secret versioning | Rollback works |
| Bulk ops | 3+ bulk actions |
| 2FA enabled | All admins have 2FA |
| Gap Score | 70% → 80% |

### Sprint 3 Success

| Metrika | Target |
|---------|--------|
| Real analytics | 0 placeholders |
| User creation | From admin works |
| Gap Score | 80% → 85% |

### Overall Success (Q1 2026)

| Metrika | Target |
|---------|--------|
| Gap Score | 85%+ |
| Compliance | SOC 2 ready |
| Admin NPS | 8+ |
| Security incidents | 0 |

---

## APPENDIX: Story Point Reference

| Points | Effort | Example |
|--------|--------|---------|
| 1 | 0.5 dana | Badge change |
| 2 | 1 dan | Simple component |
| 3 | 2 dana | Feature with API |
| 5 | 3-4 dana | Complex feature |
| 8 | 5+ dana | Major feature |

---

**Kreirano**: 2025-12-15
**Autor**: Claude Code
**Verzija**: 1.0
**Review Cycle**: Svaki sprint

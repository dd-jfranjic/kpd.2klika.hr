# KPD 2KLIKA - MASTER PLAN INDEX

**Verzija**: 2.0
**Datum**: 2025-12-13
**Status**: DRAFT - Spreman za razvoj

---

## EXECUTIVE SUMMARY

**Projekt**: AI KPD Klasifikator by 2klika
**Tip**: Multi-tenant SaaS aplikacija
**Cilj**: Komercijalizacija KPD klasifikacijskog alata iz FiskalAI projekta

### Kljucne Funkcionalnosti:
1. **AI KPD Klasifikacija** - Gemini RAG-based pretrazivanje 3.300+ KPD sifri
2. **Multi-tenant Workspace** - Organizacije s invite member sustavom
3. **Subscription Billing** - 4 paketa (FREE, Basic, Pro, Enterprise) via Stripe
4. **Master Admin Panel** - Kompletno pracenje ekosustava (pristup kroz SUPER_ADMIN rolu)
5. **Usage Tracking** - Pracenje upita po paketu/korisniku

---

## DOKUMENTACIJA - FAZE RAZVOJA

| Faza | Dokument | Opis | Status |
|------|----------|------|--------|
| 0 | [PHASE_0_PREPARATION.md](./docs/PHASE_0_PREPARATION.md) | API keys, SMTP, Stripe setup | U tijeku |
| 1 | [PHASE_1_FRESH_START.md](./docs/PHASE_1_FRESH_START.md) | Cleanup, nova Prisma schema | Ceka |
| 2 | [PHASE_2_AUTH.md](./docs/PHASE_2_AUTH.md) | JWT auth, multi-tenant, invite | Ceka |
| 3 | [PHASE_3_BILLING.md](./docs/PHASE_3_BILLING.md) | Stripe subscriptions, webhooks | Ceka |
| 4 | [PHASE_4_KPD_TOOL.md](./docs/PHASE_4_KPD_TOOL.md) | KPD alat, RAG, usage limits | Ceka |
| 5 | [PHASE_5_DASHBOARD.md](./docs/PHASE_5_DASHBOARD.md) | User dashboard, settings | Ceka |
| 6 | [PHASE_6_ADMIN.md](./docs/PHASE_6_ADMIN.md) | Master admin panel | Ceka |
| 7 | [PHASE_7_POLISH.md](./docs/PHASE_7_POLISH.md) | Email, SEO, launch | Ceka |

### Pomocni Dokumenti:

| Dokument | Opis |
|----------|------|
| [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Kompletna Prisma schema s seed podacima |
| [DESIGN_RULES.md](./docs/DESIGN_RULES.md) | UI/UX pravila, boje, responzivnost, NO INLINE CSS! |

---

## TECH STACK

| Komponenta | Tehnologija | Status |
|------------|-------------|--------|
| Frontend | Next.js 15 + React 19 | Postavljen |
| Backend | NestJS 11 | Postavljen |
| Database | PostgreSQL 17 | Postavljen |
| Cache | Redis 7 | Postavljen |
| ORM | Prisma 6 | Postavljen |
| Auth | JWT (vlastiti) | Ceka FAZU 2 |
| Payments | Stripe (subscriptions) | Ceka FAZU 3 |
| AI | Google Gemini (RAG) | Ceka FAZU 4 |

---

## SUBSCRIPTION PAKETI

| Plan | Cijena/mj | Upiti/dan | Clanovi | Status |
|------|-----------|-----------|---------|--------|
| **FREE** | 0 EUR | 5 | 1 | - |
| **BASIC** | 9.99 EUR | 50 | 3 | Kreirati u Stripe |
| **PRO** | 19.99 EUR | 250 | 10 | Kreirati u Stripe |
| **ENTERPRISE** | 49.99 EUR | 2000 | Unlimited | Kreirati u Stripe |

---

## KRITICNE SMJERNICE

### ZLATNA PRAVILA:

1. **ZERO HARDCODING** - Sve u bazu (SystemConfig/PlanConfig)
2. **NO INLINE CSS** - Sve stilove u CSS fajlove!
3. **RESPONSIVE** - Mobile-first dizajn, testiraj prije pusha
4. **SIGURNOST** - Zod validacija, rate limiting, audit log
5. **PREMIUM KVALITETA** - Enterprise-grade kod i UX

### Dizajn:

```
ZABRANJENO:  <div style={{ color: 'green' }}>
ISPRAVNO:    <div className={styles.container}>
```

**Detalji**: [DESIGN_RULES.md](./docs/DESIGN_RULES.md)

---

## ADMIN PRISTUP

**NEMA odvojenog /admin/login!**

- Svi korisnici koriste isti `/login`
- Admin panel vidi samo korisnik s `role = SUPER_ADMIN`
- SUPER_ADMIN se postavlja rucno u bazi

---

## KPD STORAGE - Dvostruki Pristup

```
PostgreSQL                    Google RAG Store
(Lokalna Baza)               (FileSearchStore)
├─ Brza egzaktna pretraga    ├─ AI semantic search
├─ CRUD operacije            ├─ Natural language
├─ Validacija kodova         ├─ Confidence scores
└─ Admin pregled             └─ Multiple suggestions
```

**Detalji**: [PHASE_4_KPD_TOOL.md](./docs/PHASE_4_KPD_TOOL.md)

---

## QUICK START - Sljedeci Koraci

### Faza 0 (trenutna):
1. [x] API kljucevi dokumentirani
2. [x] SMTP konfiguriran
3. [ ] Kreirati Stripe recurring produkte
4. [ ] Backup .env

### Za prelazak na Fazu 1:
```bash
# Backup
cp .env .env.backup.$(date +%Y%m%d)

# Zatim slijedi: docs/PHASE_1_FRESH_START.md
```

---

## DOCKER CLEANUP (OBAVEZNO!)

Nakon SVAKOG `docker compose up -d --build`:

```bash
docker image prune -f
docker builder prune -f
docker system df  # Provjera
```

---

## REFERENCE

| Dokument | Svrha |
|----------|-------|
| **CLAUDE.md** | Projektne upute, MCP tools |
| **AS_IMPLEMENTED.md** | Progress tracking |
| **docs/** | Detaljne faze i specifikacije |

---

**Last Updated**: 2025-12-13
**Maintained by**: Claude Code

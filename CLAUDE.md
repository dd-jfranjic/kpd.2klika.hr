# CLAUDE.md - KPD 2klika

> Zlatna pravila (Sloj 1) u ~/.claude/CLAUDE.md (symlink) — učitavaju se uvijek. Ovo = samo kpd-specifično.

**Domain**: kpd.2klika.hr
**Path**: `/var/www/vhosts/kpd.2klika.hr/httpdocs/`
**System User**: `kpd.2klika.hr_cjfmg3wnf4u`
**GitHub**: https://github.com/dd-jfranjic/kpd.2klika.hr.git
**Status**: Multi-tenant SaaS rebuild u tijeku

---

## Next.js 16 Docs Index

> **Docs location**: `apps/web/.next-docs/` — Next.js 16 ima BREAKING CHANGES. UVIJEK čitaj docs.

<!-- NEXT-DOCS-START -->[Next.js 16.0.10 Docs]|root:apps/web/.next-docs|STOP: Your Next.js knowledge may be outdated. Next.js 16 has BREAKING CHANGES. ALWAYS read docs before implementing.|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-partial-prerendering.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx}|01-app/02-guides:{authentication.mdx,caching.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,internationalization.mdx,multi-tenant.mdx,production-checklist.mdx}|01-app/03-api-reference/01-directives:{use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions:{error.mdx,forbidden.mdx,layout.mdx,loading.mdx,middleware.mdx,not-found.mdx,page.mdx,route.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,headers.mdx,redirect.mdx,revalidatePath.mdx,revalidateTag.mdx,use-router.mdx,use-search-params.mdx}<!-- NEXT-DOCS-END -->

---

## Projektna Dokumentacija

| Dokument | Svrha | Prioritet |
|----------|-------|-----------|
| **MASTER_PLAN.md** | Index faza, arhitektura, subscription paketi | #1 |
| **AS_IMPLEMENTED.md** | Progress — što je napravljeno | #2 |
| **docs/DATABASE_SCHEMA.md** | Prisma schema + seed | #3 |
| **docs/DESIGN_RULES.md** | UI/UX pravila, NO INLINE CSS! | #4 |

### Faze

| Faza | Status |
|------|--------|
| 0-6 | **ZAVRŠENO** |
| 7 Polish | **U TIJEKU** (~80%) |

Detalji: `docs/PHASE_[0-7]_*.md`

---

## Tech Stack

**Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind 4, shadcn/ui, React Hook Form + Zod
**Backend**: NestJS 11, Prisma 6, PostgreSQL 17, Redis 7, Passport JWT
**Payments**: Stripe Billing (subscriptions, webhooks, customer portal)
**AI**: Gemini 2.5 Flash (RAG) + File Search API
**Email**: Nodemailer + React Email

---

## KPD Referentna Implementacija (FiskalAI)

**Backend**: `/var/www/vhosts/fiskalai.2klika.hr/httpdocs/backend/src/modules/{kpd/,ai/}`
**Frontend**: `/var/www/vhosts/fiskalai.2klika.hr/httpdocs/frontend/app/tools/kpd-lookup/`
**KPD Podaci**: `/var/www/vhosts/fiskalai.2klika.hr/httpdocs/kpd-popis/` (5,701 kodova, KPD2025_NOVO.txt)
**Sync workflow**: `KpdSyncLog` model, `KpdSyncService`, admin `/admin/kpd-sync/`

---

## Zlatna Pravila

1. **ZERO HARDCODING** — SVE konfiguracije u bazu (`SystemConfig`, `PlanConfig`). Jedini izuzetak: `.env`
2. **NO INLINE CSS** — Koristi className, NIKAD style={{}}
3. **Zod validacija** za SVE inpute, rate limiting na SVE endpoints
4. **Docker cleanup** nakon SVAKOG builda: `docker image prune -f && docker builder prune -f`

---

## Subscription Paketi

| Plan | DisplayName | Cijena/mj | Upiti/mj | Članovi |
|------|-------------|-----------|----------|---------|
| FREE | KPD Starter | 0€ | 3 | 1 |
| PLUS | KPD Plus | 6.99€ | 10 | 2 |
| PRO | KPD Pro | 11.99€ | 20 | 5 |
| BUSINESS | KPD Business | 30.99€ | 50 | 10 |
| ENTERPRISE | KPD Enterprise | 199€ | 2500 | Unlimited |

**Stripe Price IDs**: PLUS `price_1SeIevKFcGpdxTuIQF3ZyDFQ`, PRO `price_1SeIevKFcGpdxTuI2FmI1GFs`, BUSINESS `price_1SeIewKFcGpdxTuInfJyipWm`, ENTERPRISE `price_1SeIewKFcGpdxTuIQNscv0j9`

---

## Blue-Green Deployment

| Environment | Web Port | API Port | Compose File |
|-------------|----------|----------|--------------|
| BLUE | 13620 | 13621 | `docker/docker-compose.prod.yml` |
| GREEN | 13630 | 13631 | `docker/docker-compose.green.yml` |

**Network**: `kpd-internal` (izolirana)

### Deploy

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs
./deploy/deploy.sh         # Auto: detektira aktivan, builda standby, cleanup, fix permissions
./deploy/switch.sh status  # Provjeri
./deploy/rollback.sh       # 1-sekunda rollback
```

### Apache Routing — VAŽNO!
`/api/kpd/` ide na Next.js (extended timeout 120s za Gemini RAG), ostali `/api/` na NestJS.
Ako AI upiti vrate 404 → provjeri `vhost_ssl.conf` ima `/api/kpd/` PRIJE `/api/`.

---

## Quick Commands

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

docker compose -f docker/docker-compose.prod.yml ps
docker logs kpd-web --tail 50
docker logs kpd-api --tail 50

# Health
curl -s https://kpd.2klika.hr/api/health | jq

# Permissions
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/
chmod +x deploy/*.sh
```

---

## Gemini RAG

```bash
cd /root/tools/gemini-rag
python3 gemini_rag.py create-store kpd-codes --display-name "KPD 2025"
python3 gemini_rag.py upload kpd-codes "/path/to/kpd.pdf"
python3 gemini_rag.py query kpd-codes "programiranje softvera" --verbose
python3 gemini_rag.py list-stores
```

**RAG Store**: `fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc`

### KPD Podaci (RAW FILES u FiskalAI)

| Datoteka | Velicina | Format |
|----------|----------|--------|
| `KPD2025_NOVO.txt` | 1.95 MB | TXT (KLASUS izvor) |
| `kpd_2025.csv` | 409 KB | CSV |
| `kpd_2025.sql` | 452 KB | SQL insert |
| `kpd_2025_flat.json` | 720 KB | JSON flat |
| `kpd_2025_hierarchy.json` | 1.1 MB | JSON hijerarhija |
| `kpd_scraper_final.py` | 9.6 KB | Parser script |

Lokacija: `/var/www/vhosts/fiskalai.2klika.hr/httpdocs/kpd-popis/`

---

## Napomene

- Auth: JWT email/password (Clerk uklonjen)
- Stripe: Test mode, recurring prices kreirane
- KPD Import: 5,701 kodova
- Usage: Mjesečni limiti, neuspješni upiti se NE broje

---

**Last Updated**: 2026-05-29
**Version**: 3.1 (WISC slim — golden-rule + generic dups maknuti u Sloj 1)

# FAZA 5: USER DASHBOARD

**Status**: Ceka
**Preduvjeti**: PHASE_4_KPD_TOOL.md - kompletirana
**Sljedeca faza**: PHASE_6_ADMIN.md

---

## Cilj Faze

Implementirati korisnicki dashboard s svim settings stranicama.

---

## Dashboard Layout

```
+------------------------------------------------------------------+
|  [LOGO]  KPD 2klika        [Org: Moja Tvrtka v]  [User Menu v]   |
+------------------------------------------------------------------+
|         |                                                        |
|  NAV    |  CONTENT AREA                                          |
|         |                                                        |
| Dashboard|  +----------------------------------------------------+|
| KPD Tool |  |  Dashboard Content / Settings / etc.              ||
| History  |  |                                                    ||
| -------- |  |                                                    ||
| Settings |  |                                                    ||
|  Profile |  |                                                    ||
|  Workspace|  |                                                    ||
|  Members |  |                                                    ||
|  Billing |  |                                                    ||
|         |  +----------------------------------------------------+|
+------------------------------------------------------------------+
```

---

## Stranice za Implementirati

### 1. Dashboard Home (`/dashboard`)

**Glavna stranica nakon login-a.**

```
+----------------------------------------------------------+
|  Dobrodosli, Ivan!                                       |
+----------------------------------------------------------+
|                                                          |
|  +-------------+  +-------------+  +-------------+       |
|  | Danas       |  | Ovaj mjesec |  | Ukupno      |       |
|  | 12 upita    |  | 342 upita   |  | 1,284 upita |       |
|  | od 250      |  |             |  |             |       |
|  +-------------+  +-------------+  +-------------+       |
|                                                          |
|  +--------------------------------------------------+   |
|  |  KPD ALAT                                         |   |
|  |  [Embedded KpdTool component]                     |   |
|  |                                                   |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

### 2. Query History (`/history`)

```
+----------------------------------------------------------+
|  Povijest pretraga                                        |
+----------------------------------------------------------+
|  [Search...]  [Filter: All v]  [Export CSV]              |
|                                                          |
|  +------------------------------------------------------+|
|  | Datum       | Upit                | Rezultat  | Acc  ||
|  |-------------|---------------------|-----------|------||
|  | 13.12 14:32 | izrada web aplikac..| 62.01.11  | 92%  ||
|  | 13.12 14:15 | konzalting usluge   | 70.22     | 87%  ||
|  | 13.12 13:58 | prijevoz robe       | 49.41     | 95%  ||
|  | ...         | ...                 | ...       | ...  ||
|  +------------------------------------------------------+|
|                                                          |
|  [< Previous]  Page 1 of 23  [Next >]                    |
+----------------------------------------------------------+
```

### 3. Profile Settings (`/settings/profile`)

```
+----------------------------------------------------------+
|  Postavke profila                                        |
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+   |
|  |  [Avatar]                                         |   |
|  |                                                   |   |
|  |  Ime: [Ivan____________]                         |   |
|  |  Prezime: [Horvat________]                       |   |
|  |  Email: ivan@tvrtka.hr (readonly)                |   |
|  |                                                   |   |
|  |  [Spremi promjene]                               |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Sigurnost                                        |   |
|  |                                                   |   |
|  |  [Promijeni lozinku]                             |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

### 4. Workspace Settings (`/settings/workspace`)

**Samo OWNER i ADMIN vide ovu stranicu.**

```
+----------------------------------------------------------+
|  Postavke workspacea                                     |
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+   |
|  |  Osnovni podaci                                   |   |
|  |                                                   |   |
|  |  Naziv: [Moja Tvrtka d.o.o.___]                  |   |
|  |  Slug: moja-tvrtka (readonly)                    |   |
|  |                                                   |   |
|  |  [Spremi promjene]                               |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Danger Zone                                      |   |
|  |                                                   |   |
|  |  [Obrisi workspace]                              |   |
|  |  Ova akcija je nepovratna!                       |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

### 5. Members (`/settings/members`)

**Samo OWNER i ADMIN vide ovu stranicu.**

```
+----------------------------------------------------------+
|  Clanovi tima                                [Pozovi +]  |
+----------------------------------------------------------+
|                                                          |
|  Trenutni clanovi (3/10)                                |
|                                                          |
|  +------------------------------------------------------+|
|  | Ime              | Email              | Rola  | Akcije|
|  |------------------|--------------------|----- -|-------|
|  | Ivan Horvat      | ivan@tvrtka.hr     | OWNER |       |
|  | Ana Anic         | ana@tvrtka.hr      | ADMIN | [x]   |
|  | Marko Markic     | marko@tvrtka.hr    | MEMBER| [x]   |
|  +------------------------------------------------------+|
|                                                          |
|  Pozvani (cekaju prihvat)                               |
|                                                          |
|  +------------------------------------------------------+|
|  | Email                   | Pozvan    | Status | Akcije|
|  |-------------------------|-----------|--------|-------|
|  | novi@tvrtka.hr          | 12.12.25  | Pending| [x]   |
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 6. Billing (`/settings/billing`)

```
+----------------------------------------------------------+
|  Naplata i pretplata                                     |
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+   |
|  |  Trenutni paket: PRO                              |   |
|  |  Cijena: 19.99 EUR/mjesec                        |   |
|  |  Sljedeca naplata: 15.01.2025                    |   |
|  |  Status: Aktivan                                  |   |
|  |                                                   |   |
|  |  [Promijeni paket]  [Otkazi pretplatu]           |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Koristenje                                       |   |
|  |                                                   |   |
|  |  Upiti danas: 45/250                             |   |
|  |  [============================------]             |   |
|  |                                                   |   |
|  |  Clanovi: 3/10                                   |   |
|  |  [==============-------------------]             |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Povijest placanja                                |   |
|  |                                                   |   |
|  |  15.12.2024 | PRO | 19.99 EUR | Uspjesno        |   |
|  |  15.11.2024 | PRO | 19.99 EUR | Uspjesno        |   |
|  |  [Vidi sve]                                       |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

---

## Frontend Struktura

```
apps/web/app/
  (dashboard)/
    layout.tsx           # Dashboard layout s nav
    page.tsx             # /dashboard redirect
    dashboard/
      page.tsx           # Dashboard home
    history/
      page.tsx           # Query history
    settings/
      layout.tsx         # Settings sub-nav
      page.tsx           # Redirect to profile
      profile/
        page.tsx
      workspace/
        page.tsx
      members/
        page.tsx
      billing/
        page.tsx

  components/
    dashboard/
      DashboardNav.tsx
      DashboardHeader.tsx
      StatsCard.tsx
      UsageChart.tsx
    settings/
      SettingsNav.tsx
      ProfileForm.tsx
      WorkspaceForm.tsx
      MembersList.tsx
      InviteModal.tsx
      BillingCard.tsx
```

---

## Backend Endpoints

### Profile

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| GET | /users/me | JWT | Trenutni user |
| PATCH | /users/me | JWT | Update profil |
| POST | /users/me/password | JWT | Promjena lozinke |

### Workspace

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| GET | /organizations/:id | JWT+Membership | Workspace detalji |
| PATCH | /organizations/:id | JWT+Owner/Admin | Update workspace |
| DELETE | /organizations/:id | JWT+Owner | Obrisi workspace |

### Members

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| GET | /organizations/:id/members | JWT+Membership | Lista clanova |
| PATCH | /organizations/:id/members/:userId | JWT+Owner/Admin | Update role |
| DELETE | /organizations/:id/members/:userId | JWT+Owner/Admin | Remove member |
| GET | /organizations/:id/invitations | JWT+Owner/Admin | Lista pozivnica |
| POST | /organizations/:id/invitations | JWT+Owner/Admin | Kreiraj pozivnicu |
| DELETE | /invitations/:id | JWT+Owner/Admin | Otkazi pozivnicu |

### History

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| GET | /queries | JWT | Lista upita (paginated) |
| GET | /queries/export | JWT | Export CSV |

---

## Checklist

### Frontend Pages
- [ ] Dashboard layout s nav
- [ ] Dashboard home
- [ ] Query history
- [ ] Profile settings
- [ ] Workspace settings
- [ ] Members management
- [ ] Billing page

### Components
- [ ] DashboardNav
- [ ] StatsCard
- [ ] UsageChart
- [ ] ProfileForm
- [ ] MembersList
- [ ] InviteModal

### Backend
- [ ] User CRUD endpoints
- [ ] Organization endpoints
- [ ] Member endpoints
- [ ] Invitation endpoints
- [ ] Query history endpoint

### Features
- [ ] Org switcher (ako user ima vise org)
- [ ] Role-based visibility
- [ ] Responsive layout
- [ ] Loading states
- [ ] Error handling

---

## Reference

- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md)
- **Auth**: [PHASE_2_AUTH.md](./PHASE_2_AUTH.md) - Invite flow
- **Billing**: [PHASE_3_BILLING.md](./PHASE_3_BILLING.md) - Stripe integration

---

**Sljedeca faza**: [PHASE_6_ADMIN.md](./PHASE_6_ADMIN.md)

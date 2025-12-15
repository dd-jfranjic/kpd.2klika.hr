# FAZA 6: MASTER ADMIN PANEL

**Status**: Ceka
**Preduvjeti**: PHASE_5_DASHBOARD.md - kompletirana
**Sljedeca faza**: PHASE_7_POLISH.md

---

## Cilj Faze

Implementirati kompletni Master Admin panel za pracenje i upravljanje cijelim ekosustavom.

---

## Pristup Admin Panelu

**NEMA odvojenog /admin/login!**

```
Svi korisnici koriste isti /login
            |
            v
JWT token sadrzi user.role
            |
            v
Middleware provjerava:
if (user.role === "SUPER_ADMIN") {
    -> Vidi "Admin Panel" link u nav
    -> Moze pristupiti /admin/* rutama
} else {
    -> /admin/* vraca 403 Forbidden
}
```

### SUPER_ADMIN Kreiranje

```sql
-- Rucno u bazi (nikad kroz UI!)
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = 'admin@2klika.hr';
```

---

## Admin Layout

```
+------------------------------------------------------------------+
|  [LOGO]  KPD Admin                            [Admin: Ivan v]    |
+------------------------------------------------------------------+
|           |                                                      |
|  ADMIN    |  CONTENT AREA                                        |
|  NAV      |                                                      |
|           |  +--------------------------------------------------+|
| Dashboard |  |                                                  ||
| Korisnici |  |  Admin Content                                   ||
| Organizacije|  |                                                  ||
| Pretplate |  |                                                  ||
| KPD       |  |                                                  ||
| AI Config |  |                                                  ||
| System    |  |                                                  ||
| Audit Log |  |                                                  ||
|           |  +--------------------------------------------------+|
+------------------------------------------------------------------+
```

---

## Stranice za Implementirati

### 1. Admin Dashboard (`/admin/dashboard`)

```
+----------------------------------------------------------+
|  Admin Dashboard                                          |
+----------------------------------------------------------+
|                                                          |
|  +----------+  +----------+  +----------+  +----------+  |
|  |   MRR    |  | Active   |  |  Total   |  |  Churn   |  |
|  | 1,234 EUR|  |   Orgs   |  |  Users   |  |  Rate    |  |
|  | +12.5%   |  |   342    |  |  1,284   |  |  2.3%    |  |
|  +----------+  +----------+  +----------+  +----------+  |
|                                                          |
|  +---------------------------+  +------------------------+|
|  |  Revenue (last 6 mo)      |  |  Plan Distribution    ||
|  |  [Line Chart]             |  |  [Pie Chart]          ||
|  |                           |  |  FREE: 65%            ||
|  |                           |  |  BASIC: 20%           ||
|  |                           |  |  PRO: 12%             ||
|  |                           |  |  ENTERPRISE: 3%       ||
|  +---------------------------+  +------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  |  Najnoviji korisnici                                 ||
|  |  Ivan Horvat | ivan@... | PRO | 13.12.2024          ||
|  |  Ana Anic | ana@... | FREE | 12.12.2024             ||
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 2. Korisnici (`/admin/users`)

```
+----------------------------------------------------------+
|  Korisnici                                    [+ Novi]   |
+----------------------------------------------------------+
|  [Search...]  [Role: All v]  [Status: All v]  [Export]   |
|                                                          |
|  +------------------------------------------------------+|
|  | Ime           | Email          | Org     |Role |Akcije|
|  |---------------|----------------|---------|-----|------|
|  | Ivan Horvat   | ivan@tvrtka.hr | Tvrtka  |ADMIN|[...] |
|  | Ana Anic      | ana@firma.hr   | Firma   |OWNER|[...] |
|  | Marko Markic  | marko@...      | Personal|MEMBER|[...]|
|  +------------------------------------------------------+|
|                                                          |
|  [< Previous]  Page 1 of 45  [Next >]                    |
+----------------------------------------------------------+

Akcije dropdown:
- View details
- Impersonate
- Disable
- Delete
```

### 3. Organizacije (`/admin/organizations`)

```
+----------------------------------------------------------+
|  Organizacije                                 [+ Nova]   |
+----------------------------------------------------------+
|  [Search...]  [Plan: All v]  [Status: All v]             |
|                                                          |
|  +------------------------------------------------------+|
|  | Naziv          | Members | Plan  | Status | Akcije   ||
|  |----------------|---------|-------|--------|----------|
|  | Tvrtka d.o.o.  | 5       | PRO   | Active | [...]    |
|  | Firma j.d.o.o. | 2       | BASIC | Active | [...]    |
|  | Ivan's Space   | 1       | FREE  | Active | [...]    |
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 4. Pretplate (`/admin/subscriptions`)

```
+----------------------------------------------------------+
|  Pretplate                                               |
+----------------------------------------------------------+
|                                                          |
|  Plan statistika:                                        |
|  +----------+  +----------+  +----------+  +----------+  |
|  |   FREE   |  |  BASIC   |  |   PRO    |  |ENTERPRISE|  |
|  |   842    |  |   257    |  |   156    |  |    29    |  |
|  |   65%    |  |   20%    |  |   12%    |  |    3%    |  |
|  +----------+  +----------+  +----------+  +----------+  |
|                                                          |
|  +------------------------------------------------------+|
|  | Organizacija    | Plan      | Status    | Renewal    ||
|  |-----------------|-----------|-----------|------------|
|  | Tvrtka d.o.o.   | PRO       | Active    | 15.01.2025 |
|  | Firma j.d.o.o.  | BASIC     | Past Due  | 10.12.2024 |
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 5. KPD Browser (`/admin/kpd`)

```
+----------------------------------------------------------+
|  KPD Sifrarnik                    [Rebuild RAG] [Import] |
+----------------------------------------------------------+
|  [Search...]                                             |
|                                                          |
|  +------------------------------------------------------+|
|  | > A - Poljoprivreda, sumarstvo i ribarstvo           ||
|  | > B - Rudarstvo i vadenje                            ||
|  | v J - Informacije i komunikacije                     ||
|  |   > 62 - Racunalno programiranje                     ||
|  |     > 62.01 - Programiranje                          ||
|  |       * 62.01.11 - Izrada aplikativnog softvera [E]  ||
|  |       * 62.01.12 - Izrada sistemskog softvera   [E]  ||
|  +------------------------------------------------------+|
|                                                          |
|  RAG Store Status:                                       |
|  Store: kpd-codes                                        |
|  Documents: 3,342                                        |
|  Last rebuild: 13.12.2024 14:32                         |
+----------------------------------------------------------+
```

### 6. AI Config (`/admin/ai-settings`)

```
+----------------------------------------------------------+
|  AI/LLM Postavke                                         |
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+   |
|  |  Model konfiguracija                              |   |
|  |                                                   |   |
|  |  Model: [Gemini 2.5 Flash v]                     |   |
|  |  Max tokens: [2048___]                           |   |
|  |  Temperature: [0.3___]                           |   |
|  |                                                   |   |
|  |  [Spremi]                                        |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  RAG Store                                        |   |
|  |                                                   |   |
|  |  Store name: kpd-codes                           |   |
|  |  Documents: 3,342                                |   |
|  |  Status: Active                                  |   |
|  |                                                   |   |
|  |  [Rebuild Store]  [Test Query]                   |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Test Interface                                   |   |
|  |                                                   |   |
|  |  Query: [programiranje________________]  [Test]  |   |
|  |                                                   |   |
|  |  Results:                                        |   |
|  |  62.01.11 - Programiranje (92%)                 |   |
|  |  62.01.12 - Web development (78%)               |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

### 7. System Config (`/admin/system-config`)

```
+----------------------------------------------------------+
|  System Config                               [+ Dodaj]   |
+----------------------------------------------------------+
|  [Search...]  [Category: All v]                          |
|                                                          |
|  +------------------------------------------------------+|
|  | Key                | Value          | Type   |Akcije ||
|  |--------------------|----------------|--------|-------||
|  | app.name           | KPD 2klika     | STRING | [E]   ||
|  | ai.model           | gemini-2.5-flash| STRING| [E]   ||
|  | ai.maxTokens       | 2048           | NUMBER | [E]   ||
|  | invite.expiryDays  | 7              | NUMBER | [E]   ||
|  | smtp.from          | noreply@...    | STRING | [E]   ||
|  | stripe.apiKey      | sk_***         | SECRET | [E]   ||
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
```

### 8. Audit Log (`/admin/audit-log`)

```
+----------------------------------------------------------+
|  Audit Log                                    [Export]   |
+----------------------------------------------------------+
|  [Search...]  [Admin: All v]  [Action: All v]            |
|  Date: [From] - [To]                                     |
|                                                          |
|  +------------------------------------------------------+|
|  | Datum       | Admin        | Akcija        | Entity  ||
|  |-------------|--------------|---------------|---------|
|  | 13.12 14:32 | admin@2klika | UPDATE_USER   | usr_123 ||
|  | 13.12 14:15 | admin@2klika | DISABLE_ORG   | org_456 ||
|  | 13.12 13:58 | super@2klika | UPDATE_PLAN   | sub_789 ||
|  +------------------------------------------------------+|
|                                                          |
|  [Click row to see details: oldValue, newValue]          |
+----------------------------------------------------------+
```

---

## Backend Endpoints

### Admin Guard

```typescript
// admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

// Usage
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController { ... }
```

### Endpoints

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | /admin/stats | Dashboard statistika |
| GET | /admin/users | Lista usera |
| GET | /admin/users/:id | User detalji |
| PATCH | /admin/users/:id | Update user |
| DELETE | /admin/users/:id | Delete user |
| POST | /admin/users/:id/impersonate | Impersonate |
| GET | /admin/organizations | Lista organizacija |
| GET | /admin/organizations/:id | Org detalji |
| PATCH | /admin/organizations/:id | Update org |
| DELETE | /admin/organizations/:id | Delete org |
| GET | /admin/subscriptions | Lista pretplata |
| PATCH | /admin/subscriptions/:id | Manual plan change |
| GET | /admin/kpd | KPD tree |
| POST | /admin/kpd/rebuild-rag | Rebuild RAG store |
| GET | /admin/config | System config |
| PATCH | /admin/config/:key | Update config |
| GET | /admin/audit-log | Audit log |

---

## Audit Logging

### Decorator za automatsko logiranje

```typescript
// audit.decorator.ts
export function AuditLog(action: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Log the action
      await this.auditService.log({
        action,
        userId: this.currentUser?.id,
        entityType: target.constructor.name,
        entityId: args[0]?.id,
        newValue: result,
      });

      return result;
    };

    return descriptor;
  };
}

// Usage
@AuditLog('UPDATE_USER')
async updateUser(id: string, data: UpdateUserDto) { ... }
```

---

## Frontend Struktura

```
apps/admin/app/
  layout.tsx           # Admin layout
  page.tsx             # Redirect to dashboard
  dashboard/
    page.tsx
  users/
    page.tsx
    [id]/
      page.tsx
  organizations/
    page.tsx
    [id]/
      page.tsx
  subscriptions/
    page.tsx
  kpd/
    page.tsx
  ai-settings/
    page.tsx
  system-config/
    page.tsx
  audit-log/
    page.tsx

  components/
    AdminNav.tsx
    AdminHeader.tsx
    StatsCard.tsx
    DataTable.tsx
    UserModal.tsx
    OrgModal.tsx
    ConfigEditor.tsx
```

---

## Checklist

### Backend
- [ ] Admin guard
- [ ] Stats endpoint
- [ ] User CRUD endpoints
- [ ] Organization endpoints
- [ ] Subscription management
- [ ] Config endpoints
- [ ] Audit log endpoints
- [ ] Impersonate functionality

### Frontend Pages
- [ ] Admin dashboard
- [ ] Users management
- [ ] Organizations management
- [ ] Subscriptions view
- [ ] KPD browser
- [ ] AI settings
- [ ] System config
- [ ] Audit log

### Security
- [ ] SUPER_ADMIN only access
- [ ] Audit logging na sve akcije
- [ ] Encrypted secrets display (masked)
- [ ] Impersonate with audit trail

---

## Reference

- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - AuditLog, SystemConfig
- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md)

---

**Sljedeca faza**: [PHASE_7_POLISH.md](./PHASE_7_POLISH.md)

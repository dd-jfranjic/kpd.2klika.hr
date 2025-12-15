# FAZA 2: AUTH & MULTI-TENANT

**Status**: Ceka
**Preduvjeti**: PHASE_1_FRESH_START.md - kompletirana
**Sljedeca faza**: PHASE_3_BILLING.md

---

## Cilj Faze

Implementirati kompletni auth sustav s JWT autentifikacijom i multi-tenant workspace modelom.

---

## Arhitektura

```
JWT Auth (NestJS)
        |
        v
+------------------+
|     User         |
|  role: MEMBER    |
|    ili           |
|  SUPER_ADMIN     |
+--------+---------+
         |
         v
+------------------+     +-----------------+
| OrganizationMember| --> | Organization    |
|   role: OWNER    |     | (Workspace)     |
|   ADMIN / MEMBER |     +-----------------+
+------------------+
```

---

## Backend Module (NestJS)

### 1. Auth Module

**Lokacija**: `apps/api/src/modules/auth/`

```
auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
    local.strategy.ts
  guards/
    jwt-auth.guard.ts
    roles.guard.ts
  decorators/
    current-user.decorator.ts
    roles.decorator.ts
  dto/
    register.dto.ts
    login.dto.ts
    forgot-password.dto.ts
    reset-password.dto.ts
```

### 2. Registration Flow

```typescript
// POST /auth/register
// Input: { email, password, firstName, lastName }

// 1. Validate input (Zod)
// 2. Check if email exists
// 3. Hash password (bcrypt, 12 rounds)
// 4. Create User
// 5. Create Organization (default name: "{firstName}'s Workspace")
// 6. Create OrganizationMember (role: OWNER)
// 7. Create Subscription (plan: FREE)
// 8. Create UsageRecord za tekuci period
// 9. Send verification email
// 10. Return JWT token
```

### 3. Login Flow

```typescript
// POST /auth/login
// Input: { email, password }

// 1. Validate credentials
// 2. Check user.isActive
// 3. Update lastLoginAt
// 4. Return JWT token + user data
```

### 4. JWT Payload

```typescript
interface JwtPayload {
  sub: string;         // user.id
  email: string;
  role: UserRole;      // MEMBER | SUPER_ADMIN
  organizationId?: string;  // default organization
  iat: number;
  exp: number;
}
```

### 5. Guards

**JwtAuthGuard** - Za sve protected rute:
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

**RolesGuard** - Za admin rute:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Get('admin/users')
getUsers() { ... }
```

---

## Frontend Pages

### Dizajn Reference

**OBAVEZNO**: Citaj [DESIGN_RULES.md](./DESIGN_RULES.md) prije implementacije!

- Kopirati vizual iz FiskalAI
- NIKAKO inline stilovi
- Mobile-first responsive

### 1. Login Page

**Ruta**: `/login`
**Komponente**:
- Logo
- Email input
- Password input
- "Zapamti me" checkbox
- Submit button
- "Zaboravili lozinku?" link
- "Nemate racun? Registrirajte se" link

### 2. Register Page

**Ruta**: `/register`
**Komponente**:
- Logo
- Email input
- Password input
- Password confirm input
- Submit button
- "Vec imate racun? Prijavite se" link

### 3. Forgot Password Page

**Ruta**: `/forgot-password`
**Flow**:
1. User unosi email
2. Backend generira reset token (1h expiry)
3. Email s linkom
4. User klikne link -> `/reset-password?token=xxx`
5. User unosi novu lozinku

### 4. Email Verification

**Ruta**: `/verify-email?token=xxx`
**Flow**:
1. User se registrira
2. Email s verification linkom
3. Klik -> oznaci emailVerified = true
4. Redirect na dashboard

---

## Invite Member System

### Flow

```
1. Admin/Owner otvara Settings > Members
2. Klikne "Invite Member"
3. Unosi email + role (MEMBER/ADMIN)
4. Backend kreira:
   - Invitation record (token, 7 dana expiry)
   - Salje email s linkom
5. Pozvani korisnik:
   - Klikne link u emailu (/invite/[token])
   - Ako vec ima account -> Join org
   - Ako nema account -> Register forma (email prefilled)
   - Auto email verification
```

### Invite Page

**Ruta**: `/invite/[token]`

```
+--------------------------------------------------+
|                                                  |
|              [LOGO KPD 2klika]                   |
|                                                  |
|   Ivan Horvat vas je pozvao u                   |
|   "Tvrtka d.o.o." workspace                      |
|                                                  |
|   +------------------------------------------+   |
|   | Kreirajte lozinku da se pridruzite       |   |
|   |                                          |   |
|   | Email: pozvani@email.com (readonly)      |   |
|   | Lozinka: [_______________________]       |   |
|   | Potvrdite: [_______________________]     |   |
|   |                                          |   |
|   | [    Pridruzite se    ]                  |   |
|   +------------------------------------------+   |
|                                                  |
+--------------------------------------------------+
```

### Backend Endpoints

```typescript
// POST /invitations
// Body: { email, organizationId, role }
// Auth: OWNER ili ADMIN organizacije

// GET /invitations/:token
// Public - za validaciju tokena

// POST /invitations/:token/accept
// Body: { password } (ako novi user)
```

### Security

- Max 20 pozivnica/dan po organizaciji
- Token expiry: 7 dana
- SHA-256 hash tokena u bazi
- Rate limiting na accept endpoint

---

## API Endpoints Summary

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| POST | /auth/register | - | Registracija |
| POST | /auth/login | - | Login |
| POST | /auth/logout | JWT | Logout |
| POST | /auth/forgot-password | - | Request reset |
| POST | /auth/reset-password | - | Reset s tokenom |
| GET | /auth/verify-email | - | Verifikacija |
| GET | /auth/me | JWT | Trenutni user |
| PATCH | /auth/me | JWT | Update profil |
| POST | /invitations | JWT+Role | Kreiraj pozivnicu |
| GET | /invitations/:token | - | Validacija tokena |
| POST | /invitations/:token/accept | - | Prihvati pozivnicu |

---

## Email Templates

Koristiti React Email + Tailwind za email template-e.

### Templates Potrebni:

1. **Welcome Email** - nakon registracije
2. **Email Verification** - link za verifikaciju
3. **Password Reset** - link za reset
4. **Invitation** - pozivnica u workspace

### Lokacija:
```
packages/email/
  templates/
    welcome.tsx
    verification.tsx
    password-reset.tsx
    invitation.tsx
  send.ts
```

---

## Checklist

### Backend
- [ ] Auth module kreiran
- [ ] JWT strategy implementirana
- [ ] Local strategy implementirana
- [ ] Guards kreirani (JWT, Roles)
- [ ] Registration endpoint
- [ ] Login endpoint
- [ ] Password reset endpoints
- [ ] Email verification endpoint
- [ ] Invitation endpoints

### Frontend
- [ ] Login page (kopirano iz FiskalAI)
- [ ] Register page
- [ ] Forgot password page
- [ ] Reset password page
- [ ] Email verification page
- [ ] Invite accept page
- [ ] useAuth() hook
- [ ] ProtectedRoute komponenta

### Email
- [ ] SMTP konfiguriran
- [ ] Welcome template
- [ ] Verification template
- [ ] Password reset template
- [ ] Invitation template

---

## Reference

- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - User, Organization, Invitation modeli
- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md) - Auth page dizajn

---

**Sljedeca faza**: [PHASE_3_BILLING.md](./PHASE_3_BILLING.md)

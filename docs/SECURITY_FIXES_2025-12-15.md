# Security Fixes - 15.12.2025

## Sažetak

Implementirane sigurnosne nadogradnje za KPD aplikaciju prema najboljim praksama.

---

## 1. Password Policy (Politika lozinki)

**Datoteke:**
- `apps/api/src/modules/auth/dto/register.dto.ts`
- `apps/api/src/modules/auth/dto/reset-password.dto.ts`

**Promjene:**
- Minimalno 8 znakova
- Obavezno veliko slovo (A-Z)
- Obavezno malo slovo (a-z)
- Obavezno broj (0-9)
- Obavezno specijalni znak (!@#$%^&*...)

**Regex:**
```typescript
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
  message: 'Lozinka mora sadržavati veliko slovo, malo slovo, broj i specijalni znak',
})
```

---

## 2. Account Lockout (Zaključavanje računa)

**Datoteke:**
- `packages/database/prisma/schema.prisma` - dodana polja
- `apps/api/src/modules/auth/auth.service.ts` - logika

**Nova polja u User modelu:**
```prisma
failedLoginAttempts Int      @default(0)
lockedUntil         DateTime?
```

**Logika:**
- Nakon 5 neuspjelih pokušaja prijave → račun se zaključava na 15 minuta
- Uspješna prijava resetira brojač
- Poruka korisniku koliko minuta mora čekati

**Konstante:**
```typescript
private readonly MAX_FAILED_ATTEMPTS = 5;
private readonly LOCKOUT_DURATION_MINUTES = 15;
```

---

## 3. JWT Refresh Token System

**Datoteke:**
- `apps/api/src/modules/auth/auth.module.ts` - JWT expiry
- `apps/api/src/modules/auth/auth.service.ts` - refresh token logika
- `apps/api/src/modules/auth/auth.controller.ts` - novi endpointi
- `apps/api/src/modules/auth/dto/login.dto.ts` - ažurirani DTO
- `packages/database/prisma/schema.prisma` - RefreshToken model

**Access Token:**
- Trajanje: **15 minuta** (prije 7 dana)
- Koristi se za autentifikaciju API poziva

**Refresh Token:**
- Trajanje: **7 dana**
- Sprema se hashiran (SHA-256) u bazu
- Koristi se za dobivanje novog access tokena
- Token rotation: svaki refresh generira novi par tokena

**Novi RefreshToken model:**
```prisma
model RefreshToken {
  id          String   @id @default(cuid())
  userId      String
  tokenHash   String   @unique
  userAgent   String?
  ipAddress   String?
  isRevoked   Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())
  user        User     @relation(...)
}
```

**Novi API endpointi:**

### POST /api/v1/auth/refresh
Obnovi access token korištenjem refresh tokena.
```json
// Request
{ "refreshToken": "abc123..." }

// Response
{
  "accessToken": "new-jwt...",
  "refreshToken": "new-refresh...",
  "expiresIn": 900
}
```

### POST /api/v1/auth/logout
Revocira refresh token (odjava s jednog uređaja).
```json
// Request
{ "refreshToken": "abc123..." }

// Response
{ "message": "Uspješno ste se odjavili" }
```

### POST /api/v1/auth/logout-all
Revocira sve refresh tokene korisnika (odjava sa svih uređaja).
Zahtijeva JWT autentifikaciju.
```json
// Response
{ "message": "Odjavljeni ste sa svih uređaja" }
```

---

## 4. Token Revocation

**Implementacija:**
- Refresh tokeni imaju `isRevoked` flag u bazi
- Logout revocira pojedinačni token
- Logout-all revocira sve tokene korisnika
- Ako se koristi revokirani token → svi tokeni korisnika se revociraju (security measure)

**Metode u AuthService:**
```typescript
async revokeRefreshToken(refreshToken: string): Promise<void>
async revokeAllUserTokens(userId: string): Promise<void>
async cleanupExpiredTokens(): Promise<number> // za cron job
```

---

## 5. Reset Token Single-Use

**Status:** Već implementirano

Token za reset lozinke se briše iz baze nakon uspješnog reseta:
```typescript
await this.prisma.systemConfig.delete({
  where: { key: `password_reset:${userId}` },
});
```

---

## 6. Login/Register Response Format

**Novi format odgovora:**
```typescript
interface LoginResponseDto {
  accessToken: string;      // JWT (15 min)
  refreshToken: string;     // Refresh token (7 dana)
  expiresIn: number;        // 900 (sekunde)
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}
```

---

## 7. Rate Limiting (već postojalo)

| Endpoint | Limit |
|----------|-------|
| POST /auth/register | 5/sat |
| POST /auth/login | 5/min |
| POST /auth/refresh | 30/min |
| POST /auth/forgot-password | 3/sat |
| POST /auth/reset-password | 5/sat |

---

## Frontend integracija

### Preporučeni flow:

1. **Login/Register** → spremi oba tokena
2. **API pozivi** → koristi accessToken u Authorization header
3. **Kad accessToken istekne (401)** → pozovi /auth/refresh
4. **Logout** → pozovi /auth/logout s refreshToken

### Primjer koda:
```typescript
// Interceptor za automatski refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post('/auth/refresh', {
        refreshToken: getRefreshToken()
      });
      setTokens(data.accessToken, data.refreshToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 8. Email Service (Email servis)

**Datoteke:**
- `apps/api/src/modules/email/email.service.ts` - glavna logika
- `apps/api/src/modules/email/email.module.ts` - NestJS modul
- `apps/api/src/modules/email/index.ts` - exports

**SMTP konfiguracija:**
```
Host: mail.2klika.hr
Port: 465 (SSL)
User: kpd@2klika.hr
From: noreply@kpd.2klika.hr
```

**Implementirani email tipovi:**

### 1. Verification Email
Šalje se prilikom registracije za potvrdu email adrese.
```typescript
await emailService.sendVerificationEmail(email, firstName, verificationToken);
```

### 2. Password Reset Email
Šalje se kada korisnik zatraži reset lozinke.
```typescript
await emailService.sendPasswordResetEmail(email, firstName, resetToken);
```

### 3. Welcome Email
Šalje se nakon uspješne verifikacije emaila.
```typescript
await emailService.sendWelcomeEmail(email, firstName);
```

### 4. Invitation Email
Šalje se za pozivnice u organizaciju.
```typescript
await emailService.sendInvitationEmail(email, inviterName, organizationName, inviteToken);
```

**Novi endpoint:**

### POST /api/v1/auth/resend-verification
Ponovo pošalje verifikacijski email (rate limit: 3/sat).
Zahtijeva JWT autentifikaciju.
```json
// Response
{ "message": "Verifikacijski email poslan na your@email.com" }
```

**Email template dizajn:**
- Responsive HTML/CSS (inline styles)
- KPD branding (plavi gradient header)
- Clean i profesionalan izgled
- CTA button za akciju
- Footer s disclaimer tekstom

---

## Ostalo za implementaciju (opcionalno)

1. **httpOnly cookie** - umjesto localStorage za tokene
2. **Security headers** - CSP, X-Frame-Options na frontendu
3. ~~**Email verifikacija**~~ ✅ Implementirano

---

## Database migracije

Izvršene direktno na PostgreSQL:

```sql
-- Account lockout polja
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- RefreshToken tablica
CREATE TABLE "RefreshToken" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isRevoked" BOOLEAN DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_user_id ON "RefreshToken" ("userId");
CREATE INDEX idx_refresh_token_hash ON "RefreshToken" ("tokenHash");
CREATE INDEX idx_refresh_token_expires ON "RefreshToken" ("expiresAt");
```

---

## Testirano

- [x] API health check
- [x] Login vraća refreshToken
- [x] Account lockout nakon 5 pokušaja
- [x] Password validation s special char
- [x] Docker rebuild uspješan
- [x] SMTP konekcija (mail.2klika.hr:465)
- [x] Email slanje (test email poslan na info@2klika.hr)

---

**Datum:** 15.12.2025
**Ažurirano:** 15.12.2025 (dodano: Email Service)
**Autor:** Claude Code

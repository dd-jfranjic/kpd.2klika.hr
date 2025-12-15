# KPD 2klika - Comprehensive Test Plan
**Version**: 1.0
**Date**: 2025-12-13
**Status**: Pre-Production Testing

---

## Test Environment

| Item | Value |
|------|-------|
| **URL** | https://kpd.2klika.hr |
| **API** | https://kpd.2klika.hr/api (proxied via Nginx) |
| **Database** | PostgreSQL (Docker: kpd-postgres) |
| **Cache** | Redis (Docker: kpd-redis) |

### Test Accounts

| Email | Password | Role | Organization | Plan |
|-------|----------|------|--------------|------|
| info@2klika.hr | Admin123! | SUPER_ADMIN | Admin Workspace | ENTERPRISE |
| jfranji@gmail.com | User123! | MEMBER | Josip Workspace | FREE |

---

## SECTION 1: PUBLIC PAGES (No Auth Required)

### 1.1 Landing Page (/)
- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Navigation links work (Znacajke, Kako radi, Cijene, FAQ)
- [ ] CTA buttons work ("Zapocnite besplatno", "Prijava", "Registracija")
- [ ] Features section displays 6 feature cards
- [ ] How it works section displays 3 steps
- [ ] Testimonials section renders
- [ ] Footer links work
- [ ] No console errors
- [ ] No network errors

### 1.2 Pricing Page (/pricing)
- [ ] Page loads without errors
- [ ] 4 pricing tiers display (Free, Basic, Pro, Enterprise)
- [ ] Prices match: Free(0), Basic(9.99), Pro(19.99), Enterprise(49.99)
- [ ] Features list displays for each plan
- [ ] CTA buttons are clickable
- [ ] Pro plan marked as "Najpopularniji"

### 1.3 FAQ Page (/faq)
- [ ] Page loads without errors
- [ ] 5 category sections display
- [ ] Accordion items expand/collapse on click
- [ ] All 16 FAQ items readable
- [ ] Navigation back to home works

### 1.4 Login Page (/login)
- [ ] Page loads without errors
- [ ] Email input field present
- [ ] Password input field present
- [ ] "Prijava" submit button present
- [ ] "Registracija" link works
- [ ] "Zaboravljena lozinka" link present
- [ ] Google OAuth button present (if enabled)

### 1.5 Register Page (/register)
- [ ] Page loads without errors
- [ ] First name, Last name fields present
- [ ] Email input field present
- [ ] Password input field present
- [ ] Terms checkbox present
- [ ] "Registracija" submit button present
- [ ] "Prijava" link works

---

## SECTION 2: REGISTRATION FLOW

### 2.1 New User Registration
- [ ] Enter valid registration data
- [ ] Form validates email format
- [ ] Form validates password strength (8+ chars)
- [ ] Terms checkbox required
- [ ] Submit creates:
  - [ ] User record in database
  - [ ] Organization record (auto-created)
  - [ ] OrganizationMember record (role: OWNER)
  - [ ] Subscription record (plan: FREE)
- [ ] Redirect to dashboard after registration
- [ ] Session cookie set properly

### 2.2 Duplicate Email Handling
- [ ] Attempt register with existing email
- [ ] Error message displays: "Email already exists"

### 2.3 Invalid Input Handling
- [ ] Invalid email format shows error
- [ ] Short password shows error
- [ ] Missing required fields show errors

---

## SECTION 3: REGULAR USER DASHBOARD

**Login as**: jfranji@gmail.com / User123!

### 3.1 Dashboard Overview (/dashboard)
- [ ] Page loads after login
- [ ] User name displays correctly
- [ ] Organization name displays
- [ ] Current plan shows (FREE)
- [ ] Usage statistics display:
  - [ ] Daily queries used / limit
  - [ ] Progress bar accurate

### 3.2 KPD Query Interface (/dashboard/query OR main dashboard)
- [ ] Query input field present
- [ ] Submit button present
- [ ] Enter test query: "Razvoj web aplikacija"
- [ ] Results display with:
  - [ ] KPD code
  - [ ] Name/description
  - [ ] Confidence percentage
- [ ] Usage counter increments after query
- [ ] Query history updates

### 3.3 Query History (/dashboard/history)
- [ ] History list displays
- [ ] Previous queries shown with:
  - [ ] Input text
  - [ ] Date/time
  - [ ] Selected code (if any)
- [ ] Can click to view details

### 3.4 Settings Page (/dashboard/settings)
- [ ] Profile settings accessible
- [ ] Can update first/last name
- [ ] Can change password
- [ ] Email displayed (read-only)
- [ ] Save changes works

### 3.5 Billing/Subscription (/dashboard/billing)
- [ ] Current plan displays (FREE)
- [ ] Upgrade options visible
- [ ] Plan comparison available
- [ ] Usage limits displayed

### 3.6 Team/Members (/dashboard/team)
- [ ] Current members list shows
- [ ] Invite member button present
- [ ] Role displayed for current user (OWNER)

---

## SECTION 4: WORKSPACE INVITATION SYSTEM

**Login as**: jfranji@gmail.com (workspace owner)

### 4.1 Send Invitation
- [ ] Navigate to team settings
- [ ] Click "Invite member" button
- [ ] Enter email: testinvite@example.com
- [ ] Select role: MEMBER
- [ ] Submit invitation
- [ ] Invitation record created in database
- [ ] Success message displays

### 4.2 Invitation Status
- [ ] Pending invitations list displays
- [ ] Invitation shows:
  - [ ] Email address
  - [ ] Role
  - [ ] Status (PENDING)
  - [ ] Expiry date
- [ ] Cancel invitation option available

### 4.3 Accept Invitation (New User)
- [ ] Access invitation link
- [ ] Registration form pre-filled with email
- [ ] Complete registration
- [ ] User added to organization
- [ ] Invitation status changes to ACCEPTED

---

## SECTION 5: MASTER ADMIN PANEL

**Login as**: info@2klika.hr / Admin123!

### 5.1 Admin Access (/admin)
- [ ] Admin panel accessible
- [ ] Redirect works from dashboard
- [ ] Non-admin users cannot access (test with jfranji)

### 5.2 Admin Dashboard (/admin)
- [ ] Overview statistics display:
  - [ ] Total users count
  - [ ] Total organizations
  - [ ] Total queries
  - [ ] Active subscriptions
- [ ] Recent activity feed
- [ ] Quick action buttons

### 5.3 User Management (/admin/users)
- [ ] Users list displays
- [ ] Can search/filter users
- [ ] User details show:
  - [ ] Email
  - [ ] Name
  - [ ] Role
  - [ ] Status (active/inactive)
  - [ ] Created date
  - [ ] Last login
- [ ] Can edit user
- [ ] Can deactivate user
- [ ] Can change user role

### 5.4 Organization Management (/admin/organizations)
- [ ] Organizations list displays
- [ ] Organization details show:
  - [ ] Name
  - [ ] Slug
  - [ ] Member count
  - [ ] Current plan
  - [ ] Created date
- [ ] Can view organization details
- [ ] Can see members list

### 5.5 Subscription Management (/admin/subscriptions)
- [ ] Subscriptions list displays
- [ ] Can filter by plan type
- [ ] Can see subscription details:
  - [ ] Organization name
  - [ ] Plan type
  - [ ] Status
  - [ ] Start/end dates
  - [ ] Stripe IDs (if paid)
- [ ] Can manually change plan

### 5.6 System Configuration (/admin/settings)
- [ ] Configuration categories display:
  - [ ] AI Settings
  - [ ] Cache Settings
  - [ ] Rate Limits
  - [ ] Feature Toggles
- [ ] Can view current values
- [ ] Can edit values
- [ ] Changes persist after refresh
- [ ] Audit log records changes

### 5.7 Plan Configuration (/admin/plans)
- [ ] Plan list displays
- [ ] Can view plan details:
  - [ ] Price
  - [ ] Daily query limit
  - [ ] Monthly limit
  - [ ] Member limit
  - [ ] Features list
- [ ] Can edit plan (if implemented)

### 5.8 Audit Logs (/admin/logs)
- [ ] Audit log entries display
- [ ] Can filter by:
  - [ ] Action type
  - [ ] User
  - [ ] Date range
- [ ] Log entry shows:
  - [ ] Timestamp
  - [ ] User who made change
  - [ ] Action description
  - [ ] Old/new values

### 5.9 Analytics (/admin/analytics)
- [ ] Usage charts display
- [ ] Can see:
  - [ ] Queries per day/week/month
  - [ ] User registrations over time
  - [ ] Popular KPD codes
  - [ ] AI model usage stats

---

## SECTION 6: API ENDPOINTS

### 6.1 Health Check
- [ ] GET /api/health returns 200
- [ ] Response includes version info

### 6.2 Authentication
- [ ] POST /api/auth/login works
- [ ] POST /api/auth/register works
- [ ] POST /api/auth/logout works
- [ ] GET /api/auth/me returns user info

### 6.3 KPD Endpoints
- [ ] POST /api/kpd/classify works
- [ ] GET /api/kpd/search works
- [ ] GET /api/kpd/codes/:id works

---

## TEST RESULTS LOG

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| 1.1 | Landing Page | ⏳ | |
| 1.2 | Pricing Page | ⏳ | |
| 1.3 | FAQ Page | ⏳ | |
| 1.4 | Login Page | ⏳ | |
| 1.5 | Register Page | ⏳ | |
| 2.1 | Registration Flow | ⏳ | |
| 3.1 | User Dashboard | ⏳ | |
| 3.2 | KPD Query | ⏳ | |
| 4.1 | Send Invitation | ⏳ | |
| 5.1 | Admin Access | ⏳ | |
| 5.2 | Admin Dashboard | ⏳ | |
| 5.3 | User Management | ⏳ | |
| 5.6 | System Config | ⏳ | |

**Legend**: ✅ Pass | ❌ Fail | ⏳ Pending | ⚠️ Partial

---

## ISSUES FOUND

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| | | | |

---

**Last Updated**: 2025-12-13

## SharpOrder v2 – Feature Plan (Expo + Next.js + Supabase)

This doc is the **source of truth** for what we’re rebuilding from the old SharpOrder app, and how it maps to the new stack:

- **Mobile app**: Expo Router (`sharporder-v2`)
- **Backend**: Next.js App Router (`sharporder-backed`)
- **Database**: Supabase Postgres via Prisma (`sharporder-backed/prisma/schema.prisma`)
- **Auth**: Custom email + password + OTP (Resend) + JWT

We will implement these features **step by step**, in roughly this order.

---

## 1. Auth & Users

### 1.1 Roles

- `shipper`
- `driver`

### 1.2 Data model

Backend `AppUser` table (Prisma → Supabase):

- **Core**
  - `id` (UUID, primary key)
  - `email` (unique)
  - `passwordHash`
  - `role` (`shipper` | `driver`)
  - `emailVerified` (boolean)
- **Shipper fields**
  - `businessName`
  - `phone`
- **Driver fields**
  - `firstName`, `lastName`
  - `phoneNumber`
  - `truckType`
  - `licenseNumber`

### 1.3 Auth flow (new)

- **Signup**
  - Expo calls `POST /api/auth/signup` with `{ email, password, role }`
  - Backend:
    - Creates `AppUser` row.
    - Creates OTP record (`Otp` table).
    - Sends email with 6‑digit code via Resend (`no-reply@vishu.app`).
- **Verify email**
  - Expo `verify-email` screen collects `{ email, code }`.
  - `POST /api/auth/verify-otp`:
    - Validates OTP.
    - Marks `emailVerified = true`.
    - Returns **JWT** + `user` (id, email, role).
  - Expo:
    - Stores JWT in `AsyncStorage`.
    - Keeps `user` in `AuthContext`.
    - Routes to role‑specific onboarding.
- **Login**
  - Expo `login` screen posts `{ email, password }` to `/api/auth/login`.
  - Backend:
    - If credentials invalid → 401.
    - If not verified:
      - Generates OTP (`purpose = "login"`), sends via email, returns `{ status: 'otp_required' }`.
    - If verified → returns `{ status: 'ok', token, user }`.
  - Expo:
    - If `otp_required` → navigate to `verify-email` with just email.
    - If `ok` → save JWT + user, route to onboarding.

### 1.4 Session handling (Expo)

- `AuthProvider` (`lib/auth-context.tsx`):
  - Stores `{ user, token }` in memory.
  - Persists `token` in `AsyncStorage` under `sharporder_auth_token`.
  - Exposes:
    - `signUpShipper`, `signUpDriver`
    - `verifyOtp`
    - `signIn`
    - `signOut`

All API calls that need auth use the JWT via `Authorization: Bearer <token>` header (helper: `lib/api.ts`).

---

## 2. Shipper Flows

### 2.1 Shipper onboarding

**Screens (Expo)**:

- `/(auth)/role-select` → choose **Shipper**.
- `/(auth)/signup-shipper` → email + password → `signup`.
- `/(auth)/verify-email` → OTP → `verify-otp`.
- `/(shipper)/onboarding`:
  - Inputs:
    - `businessName` (required)
    - `phone` (optional)
  - Calls `POST /api/users` with JWT:
    - Updates `AppUser` row with shipper fields.
  - Routes to `/(shipper)/profile`.
- `/(shipper)/profile`:
  - Shows email (from `AuthContext.user.email`).
  - Allows updating `businessName`, `phone` via `POST /api/users`.

### 2.2 Shipper app navigation (phase 2)

Planned screens (to implement next):

- `/(shipper)/(tabs)/dashboard`:
  - Overview of active `loads` and `shipments`.
- `/(shipper)/create-load/*`:
  - Wizard to create a new load (see 3.1).
- `/(shipper)/(tabs)/loads`:
  - List of loads owned by the shipper.
  - Tapping a load routes based on `status`:
    - `available` → driver search.
    - `applied` → driver selection.
    - `in_transit` → tracking.
- `/(shipper)/(tabs)/shipments`:
  - History of `shipments` for this shipper.

---

## 3. Loads & Bids

### 3.1 Data model (`Load`)

Fields (based on old Firestore `loads`, mapped to Prisma `Load` model):

- `id` (UUID)
- `shipperId` (FK → `AppUser.id`)
- `pickupAddress`, `deliveryAddress`
- `truckType`
- `loadDescription`
- `recipientName`, `recipientNumber`
- `fareOffer` (int)
- `loadImageUrl` (optional)
- `status` (`available | applied | accepted | in_transit | at_pickup | approaching_dropoff | delivered | cancelled`)
- `acceptedDriverId` (optional FK → driver user id)
- `acceptedAt` (optional timestamp)
- `createdAt`, `updatedAt`

### 3.2 Create load (shipper)

**Backend endpoint** (to add):

- `POST /api/loads`
  - Auth: JWT (shipper).
  - Body: load fields (except status).
  - Behavior:
    - Insert into `loads` with:
      - `shipperId = auth.sub`
      - `status = "available"`.

**Expo**:

- Shipper creates a load from a wizard:
  - Calls `POST /api/loads`.
  - On success, navigates to **driver search** for that load.

### 3.3 Driver applies / bids


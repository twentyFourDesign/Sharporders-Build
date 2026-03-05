# SharpOrder v2 (Expo Router + Supabase) — Implementation Guide

This repo (`sharporder-v2`) is an Expo app (Expo Router). This README is a **step-by-step build guide** to replicate the SharpOrder logistics marketplace (Shipper + Driver) using:

- **Expo (mobile UI)**: this app
- **Supabase Auth + Postgres**: users, loads, bids, shipments, drivers
- **Supabase Realtime**: live load board, shipment status, driver location
- **Prisma (schema/migrations/seed)**: used from Node tooling (not inside the Expo runtime)
- **Edge Functions / Server**: for push notifications + Paystack payment verification

---

## Product Summary (what you’re rebuilding)

- **Shipper**: creates a load (pickup/delivery, truck type, fare), sees interested drivers, accepts one, tracks shipment, sees history, pays via Paystack.
- **Driver**: signs up with KYC + truck details, browses loads matching truck type, applies/bids, updates status + location, completes delivery.

Lifecycle:
1) Shipper creates `load` → `status = available`  
2) Driver applies/bids → `status = applied` (+ `bid`)  
3) Shipper accepts a driver → create `shipment` + set `load.status = in_transit`  
4) Driver updates shipment states (`at_pickup`, `in_transit`, `approaching_dropoff`, `delivered`)  
5) Shipper receives realtime updates + notifications

---

## Prerequisites

- Node.js (LTS) + npm
- Expo Go / iOS Simulator / Android Emulator
- Supabase account

Optional but recommended:
- Supabase CLI (for local migrations + functions)

---

## 1) Run the Expo app (baseline)

First, create your local `.env` file from the template:

```bash
cp .env.example .env
```

Then add the values from your Supabase project (URL + anon key, and, if you plan to use Prisma, the `DATABASE_URL` / `DIRECT_URL`).

```bash
npm install
npm run start
```

This repo currently contains the default Expo Router starter under `app/`.

---

## 2) Create a Supabase project

In Supabase:
- Create a new project
- Save:
  - **Project URL**
  - **Anon key**
  - **Service role key** (server-only, never ship in the app)

Auth settings:
- Enable **Email + Password**
- Decide whether email confirmations are required:
  - To match SharpOrder behavior: **enforce email confirmation for drivers**, but allow shipper to proceed even if not verified (client-gated).

---

## 3) Configure Expo environment variables

Expo supports public env vars via `EXPO_PUBLIC_*`.

Create a local `.env` file (do not commit secrets):

```bash
EXPO_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

You will use these from your Supabase client setup in the app.

---

## 4) Install required libraries (Expo app + server tooling)

### Expo app dependencies

Install Supabase JS client and any helpers you want for forms/state:

```bash
npm install @supabase/supabase-js
```

For maps + location tracking (choose what you prefer):
- `expo-location`
- Map UI: `react-native-maps` (or a custom map provider)

For push notifications:
- `expo-notifications`

### Prisma tooling (Node-only)

Prisma should not run inside the Expo runtime; use it as **dev tooling** for schema/migrations/seed:

```bash
npm install -D prisma
npm install @prisma/client
```

Recommended structure:

```
prisma/
  schema.prisma
  seed.ts
```

---

## 5) Database design in Supabase (tables + enums)

You’ll model these Postgres tables (mirrors the Firebase collections):

- `profiles` (shipper + driver unified)
- `trucks` (reference data)
- `loads`
- `bids`
- `shipments`
- `driver_presence` (availability + last known location)
- `earnings` (driver stats)
- `push_tokens` (Expo push tokens)

### Status enums (recommended)

- `load_status`: `available | applied | accepted | in_transit | at_pickup | approaching_dropoff | delivered | cancelled`
- `shipment_status`: `pending | in_transit | picked_up | delivered | cancelled`
- `bid_status`: `pending | accepted | rejected`
- `driver_status`: `available | busy`

---

## 6) Prisma schema (example)

Use Prisma to define and migrate your schema against Supabase Postgres. Example `prisma/schema.prisma` (adapt as needed):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserType {
  shipper
  driver
}

enum LoadStatus {
  available
  applied
  accepted
  in_transit
  at_pickup
  approaching_dropoff
  delivered
  cancelled
}

enum ShipmentStatus {
  pending
  in_transit
  picked_up
  delivered
  cancelled
}

enum BidStatus {
  pending
  accepted
  rejected
}

enum DriverStatus {
  available
  busy
}

model Profile {
  id           String   @id @db.Uuid
  email        String   @unique
  userType     UserType @map("user_type")

  // Shipper
  businessName String?  @map("business_name")
  phone        String?
  logoUrl      String?  @map("logo_url")

  // Driver
  firstName        String? @map("first_name")
  lastName         String? @map("last_name")
  phoneNumber      String? @map("phone_number")
  displayName      String? @map("display_name")
  truckType        String? @map("truck_type")
  licenseNumber    String? @map("license_number")
  profilePhotoUrl  String? @map("profile_photo_url")
  licenseImageUrl  String? @map("license_image_url")
  truckPhotoUrl    String? @map("truck_photo_url")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  loads     Load[]     @relation("ShipperLoads")
  bids      Bid[]      @relation("DriverBids")
  shipments Shipment[] @relation("DriverShipments")
  shipped   Shipment[] @relation("ShipperShipments")

  @@map("profiles")
}

model Truck {
  id       String @id @default(uuid()) @db.Uuid
  name     String @unique
  tyres    Int
  capacity String

  @@map("trucks")
}

model Load {
  id              String     @id @default(uuid()) @db.Uuid
  shipperId       String     @db.Uuid @map("shipper_id")
  shipper         Profile    @relation("ShipperLoads", fields: [shipperId], references: [id])

  pickupAddress   String @map("pickup_address")
  deliveryAddress String @map("delivery_address")
  truckType       String @map("truck_type")
  loadDescription String @map("load_description")

  recipientName   String? @map("recipient_name")
  recipientNumber String? @map("recipient_number")

  fareOffer       Int    @map("fare_offer")
  loadImageUrl    String? @map("load_image_url")

  status          LoadStatus @default(available)
  acceptedDriverId String?   @db.Uuid @map("accepted_driver_id")
  acceptedAt      DateTime?  @map("accepted_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  bids      Bid[]
  shipment  Shipment?

  @@index([shipperId])
  @@index([status])
  @@map("loads")
}

model Bid {
  id          String   @id @default(uuid()) @db.Uuid
  loadId      String   @db.Uuid @map("load_id")
  driverId    String   @db.Uuid @map("driver_id")
  offerAmount Int?     @map("offer_amount")
  message     String?
  status      BidStatus @default(pending)

  load   Load    @relation(fields: [loadId], references: [id])
  driver Profile @relation("DriverBids", fields: [driverId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([loadId, driverId])
  @@index([loadId])
  @@index([driverId])
  @@map("bids")
}

model Shipment {
  id              String         @id @default(uuid()) @db.Uuid
  loadId          String         @unique @db.Uuid @map("load_id")
  shipperId       String         @db.Uuid @map("shipper_id")
  driverId        String         @db.Uuid @map("driver_id")

  pickupAddress   String @map("pickup_address")
  deliveryAddress String @map("delivery_address")
  fareOffer       Int    @map("fare_offer")

  status ShipmentStatus @default(pending)

  currentLat Float? @map("current_lat")
  currentLng Float? @map("current_lng")

  load    Load    @relation(fields: [loadId], references: [id])
  shipper Profile @relation("ShipperShipments", fields: [shipperId], references: [id])
  driver  Profile @relation("DriverShipments", fields: [driverId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([shipperId])
  @@index([driverId])
  @@index([status])
  @@map("shipments")
}

model DriverPresence {
  driverId  String       @id @db.Uuid @map("driver_id")
  status    DriverStatus @default(available)
  lat       Float?
  lng       Float?
  updatedAt DateTime     @updatedAt @map("updated_at")

  driver Profile @relation(fields: [driverId], references: [id])

  @@map("driver_presence")
}

model PushToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid @map("user_id")
  token     String
  device    String?
  createdAt DateTime @default(now()) @map("created_at")

  user Profile @relation(fields: [userId], references: [id])

  @@unique([userId, token])
  @@map("push_tokens")
}
```

### Prisma env for Supabase

In a separate `.env` for Prisma tooling (server/dev only), set:
- `DATABASE_URL` (transaction pooler / recommended for runtime)
- `DIRECT_URL` (direct connection for migrations)

Supabase provides both in the dashboard (“Connection string”). Keep these **out of the Expo app**.

### Migrate

```bash
npx prisma migrate dev
npx prisma generate
```

Seed `trucks` reference rows via `prisma/seed.ts` (optional but recommended).

---

## 7) Supabase Auth → `profiles` row (required)

Goal: when a user signs up, automatically create a `profiles` record keyed by the auth user id.

Recommended approach:
- Create a SQL function `handle_new_user()`
- Add a trigger on `auth.users` insert

### Pass the role at signup (recommended)

At signup time, include `user_type` in `raw_user_meta_data` so the trigger can write the correct role into `profiles.user_type`:

```ts
// shipper
supabase.auth.signUp({
  email,
  password,
  options: { data: { user_type: 'shipper' } },
});

// driver
supabase.auth.signUp({
  email,
  password,
  options: { data: { user_type: 'driver' } },
});
```

### SQL: trigger to create `profiles` row

Run this in Supabase SQL editor (adjust columns if your `profiles` schema differs):

```sql
-- NOTE about user_type:
-- - If profiles.user_type is TEXT, use: (new.raw_user_meta_data ->> 'user_type')
-- - If profiles.user_type is a Postgres ENUM created by Prisma, it's commonly: public."UserType"
--   In that case, cast like: (new.raw_user_meta_data ->> 'user_type')::public."UserType"

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, user_type)
  values (
    new.id,
    new.email,
    (new.raw_user_meta_data ->> 'user_type')::public."UserType"
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

Then the Expo app can:
- `signUp(email, password, { data: { user_type } })`
- immediately `update profiles` with the rest of the metadata (shipper business info or driver KYC info)

---

## 8) Row Level Security (RLS) policies (minimum)

Turn on RLS for all tables and add policies so the client app (anon key) is safe.

Suggested policy rules (high-level):

### `profiles`
- Users can `select/update` their own profile (`id = auth.uid()`).

### `loads`
- Shippers can `insert/select/update` loads where `shipper_id = auth.uid()`.
- Drivers can `select` loads where `status = 'available'` (and optionally filter by truck type in the app).

### `bids`
- Drivers can `insert` bids where `driver_id = auth.uid()`.
- Shippers can `select` bids for loads they own.
- Shippers can accept/reject bids for loads they own.

### `shipments`
- Shipper can `select` shipments where `shipper_id = auth.uid()`.
- Driver can `select` shipments where `driver_id = auth.uid()`.
- Driver can update shipment status/location for shipments assigned to them.

### `driver_presence`
- Drivers can update their own presence row.
- Shippers can read presence for a driver only when there is an active shipment between them (or keep it strict and fetch location through shipments only).

### SQL: minimal policy examples (copy/paste starter)

These are intentionally minimal so you can get the app working end-to-end, then tighten them.

```sql
-- PROFILES
alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- LOADS
alter table public.loads enable row level security;

create policy loads_shipper_crud_own
on public.loads
for all
using (shipper_id = auth.uid())
with check (shipper_id = auth.uid());

create policy loads_driver_read_available
on public.loads
for select
using (status = 'available');

-- BIDS
alter table public.bids enable row level security;

create policy bids_driver_insert_own
on public.bids
for insert
with check (driver_id = auth.uid());

create policy bids_driver_select_own
on public.bids
for select
using (driver_id = auth.uid());

create policy bids_shipper_select_for_own_loads
on public.bids
for select
using (
  exists (
    select 1
    from public.loads l
    where l.id = bids.load_id
      and l.shipper_id = auth.uid()
  )
);

-- SHIPMENTS
alter table public.shipments enable row level security;

create policy shipments_shipper_select_own
on public.shipments
for select
using (shipper_id = auth.uid());

create policy shipments_driver_select_own
on public.shipments
for select
using (driver_id = auth.uid());

create policy shipments_driver_update_own
on public.shipments
for update
using (driver_id = auth.uid())
with check (driver_id = auth.uid());
```

Note: accepting a bid (changing multiple rows + creating a shipment) is best done via an **Edge Function / RPC** with elevated permissions rather than directly from the client.

---

## 9) Expo Router UI structure (recommended)

This repo currently has a starter tab UI under `app/(tabs)`. For SharpOrder, create route groups:

```
app/
  _layout.tsx
  (auth)/
    onboarding.tsx
    role-select.tsx
    login.tsx
    signup-shipper.tsx
    signup-driver-step-1.tsx
    signup-driver-step-2.tsx
    verify-email.tsx
  (shipper)/
    _layout.tsx
    (tabs)/
      _layout.tsx
      dashboard.tsx
      loads.tsx
      shipments.tsx
      profile.tsx
    create-load/
      step-1.tsx
      step-2.tsx
      review.tsx
    load/
      [id].tsx
      driver-search.tsx
      driver-found.tsx
      track.tsx
  (driver)/
    _layout.tsx
    (tabs)/
      _layout.tsx
      dashboard.tsx
      load-board.tsx
      shipments.tsx
      profile.tsx
    load/
      [id].tsx
    active/
      [shipmentId].tsx
```

Routing guard behavior (in `app/_layout.tsx`):
- If no session → go to `(auth)`
- If session and `profiles.user_type = shipper` → go to `(shipper)`
- If session and `profiles.user_type = driver` → go to `(driver)`
- If driver and `email_confirmed_at` is missing → force `(auth)/verify-email`

---

## 10) Supabase client setup in the app

Create `lib/supabase.ts`:
- reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- exports `supabase` client

Create an auth provider:
- listens to `supabase.auth.onAuthStateChange`
- stores session + profile in state
- exposes helpers: `signUpShipper`, `signUpDriver`, `signIn`, `signOut`

---

## 11) Implement the core flows (in order)

### A) Auth + profile creation (both roles)

1. Role selection: user chooses **Shipper** or **Driver**
2. Sign up:
   - `supabase.auth.signUp({ email, password })`
   - insert/update `profiles` with:
     - `user_type`
     - shipper: `business_name`, `phone`, `logo_url`
     - driver: `first_name`, `last_name`, `phone_number`, `truck_type`, `license_number`, image urls
3. Driver verification gating:
   - if not verified, show `verify-email` screen and block driver routes

### B) Shipper creates a load

Insert into `loads`:
- `shipper_id = auth.uid()`
- pickup/delivery addresses, truck type, description, recipient info, `fare_offer`
- `status = 'available'`

### C) Driver load board + bidding

Driver queries `loads` where `status='available'` (and filter by `truck_type` client-side or SQL).

Driver action:
- create `bids` row with `load_id`, `driver_id`, `offer_amount` (optional), `message` (optional)

Optionally: set `loads.status='applied'` when first bid arrives (or compute “applied” from existing bids). Prefer the computed approach to avoid race conditions.

### D) Shipper accepts a driver

Transaction (server-side is best):
- mark one `bid.status='accepted'` and others `rejected`
- update `loads.accepted_driver_id`, `loads.status='in_transit'`, `accepted_at`
- create `shipments` row

You can implement this as:
- Supabase Edge Function `accept_bid(loadId, bidId)` (recommended)
- or a Postgres RPC function with `security definer`

### E) Driver tracking + shipment status updates

Driver updates the active `shipments` row:
- `status` transitions
- `current_lat/current_lng`

Shipper sees realtime updates via Realtime subscriptions on `shipments` (and optionally `driver_presence`).

### F) History + stats

- Shipper “My Shipments”: query `shipments` by `shipper_id`
- Driver “My Shipments”: query `shipments` by `driver_id`
- Driver stats: count delivered shipments; sum `earnings.amount`

---

## 12) Realtime subscriptions (Supabase Realtime)

Use Realtime for:
- `loads`: keep load board up-to-date
- `bids`: shipper sees bids/interest in a load
- `shipments`: both sides see status + location updates

Make sure Realtime is enabled for the tables in Supabase dashboard.

---

## 13) Storage (images)

Use Supabase Storage buckets, e.g.:
- `avatars` (shipper logos, driver profile photos)
- `driver-docs` (license/truck photos)
- `load-images`

Client flow:
- upload file to bucket
- store resulting public/private URL in `profiles`/`loads`

Keep RLS policies strict:
- drivers can only write to their own folder prefix
- shippers can only write to their own prefix

---

## 14) Push notifications (replacing Firebase FCM functions)

Recommended approach:
1. Expo app registers for push notifications, obtains an Expo push token.
2. Store it in `push_tokens` tied to `auth.uid()`.
3. When an event happens (bid accepted, status changed):
   - run an Edge Function that sends notifications via Expo Push API.

Events to notify the shipper (parity with original app):
- load created (confirmation)
- driver assigned (bid accepted)
- driver at pickup
- in transit
- approaching dropoff
- delivered (prompt rating)

---

## 15) Paystack payments (shipper)

Don’t process payments purely client-side.

Recommended setup:
- Edge Function / server endpoint to:
  - initialize a Paystack transaction
  - verify the transaction on callback
  - write a `payments` record and mark load/shipment as paid

In Expo:
- open Paystack checkout in a WebView
- listen for success redirect and then call verify endpoint

---

## 16) Suggested build order (practical checklist)

1. Supabase project + Auth configured
2. Tables/enums + RLS policies in place
3. Prisma schema + migrations + seed `trucks`
4. Expo: Supabase client + AuthProvider + route guards
5. UI: `(auth)` routes + profile creation for both roles
6. Shipper: create load + list loads
7. Driver: load board + bid submission
8. Shipper: accept bid (Edge Function/RPC)
9. Driver: active shipment status + location updates
10. Shipper: tracking screen + realtime updates
11. Notifications + Paystack

---

## Dev notes for this repo

- Routing lives in `app/` (Expo Router).
- `@/*` path alias maps to the project root (see `tsconfig.json`).
- The current UI (`app/(tabs)`) is starter content and can be replaced with the route structure above.

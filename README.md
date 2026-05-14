# Konnectly Kids Web App

Konnectly is a Next.js web app for parents, kids activities, reward brands, and admin operations. It includes a parent app, brand partner app, admin panel, OTP auth, QR vouchers, reward redemptions, events, notifications, and PWA support.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS
- Prisma + PostgreSQL
- Custom cookie/session auth
- WhatsApp OTP via Anantya API
- QR scanning via `qr-scanner`
- PWA manifest and service worker

## Getting Started

```bash
npm install
npm run dev
```

Open:

- Main site: http://localhost:3000
- Parent app: http://localhost:3000/app
- Brand app: http://localhost:3000/brand
- Admin panel: http://localhost:3000/admin
- Admin login: http://localhost:3000/admin-login

## Important Files

### Frontend Routes

- `app/page.tsx` - public landing/home page
- `app/app/page.tsx` - parent mobile app experience
- `app/brand/page.tsx` - brand partner app
- `app/admin/page.tsx` - admin dashboard
- `app/admin-login/page.tsx` - admin login
- `app/login/page.tsx` - parent login
- `app/register/page.tsx` - parent registration
- `app/forgot-password/page.tsx` - password reset

### API Routes

Auth:

- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/complete-registration/route.ts`
- `app/api/auth/admin-login/route.ts`
- `app/api/auth/brand-login/start/route.ts`
- `app/api/auth/brand-login/verify/route.ts`
- `app/api/auth/brand-login/status/route.ts`
- `app/api/auth/brand-register/start/route.ts`
- `app/api/auth/brand-register/verify/route.ts`
- `app/api/auth/logout/route.ts`

Parent app:

- `app/api/app/data/route.ts`
- `app/api/app/redeem/route.ts`
- `app/api/app/bookings/confirm/route.ts`
- `app/api/app/profile/route.ts`
- `app/api/app/kids/route.ts`
- `app/api/app/kids/update/route.ts`
- `app/api/app/switch-kid/route.ts`
- `app/api/app/notifications/dismiss/route.ts`
- `app/api/app/push-subscription/route.ts`

Brand app:

- `app/api/brand/data/route.ts`
- `app/api/brand/redeem/route.ts`

Admin:

- `app/api/admin/data/route.ts`
- `app/api/admin/brands/route.ts`
- `app/api/admin/events/route.ts`
- `app/api/admin/notifications/route.ts`
- `app/api/admin/hero-slides/route.ts`
- `app/api/admin/members/route.ts`
- `app/api/admin/kids/status/route.ts`
- `app/api/admin/redemptions/status/route.ts`
- `app/api/admin/bookings/check-in/route.ts`
- `app/api/admin/bookings/verify/route.ts`

### Core Logic

- `lib/db.ts` - Prisma/PostgreSQL query helpers
- `lib/app-data.ts` - parent app data, bookings, rewards, voucher issuing
- `lib/admin-data.ts` - admin dashboard data and admin mutations
- `lib/push-notifications.ts` - web push notification helpers
- `lib/auth/session.ts` - session token/cookie helpers
- `lib/auth/otp.ts` - OTP creation, verification, WhatsApp sending
- `lib/auth/accounts.ts` - parent account auth/registration helpers
- `lib/auth/admin.ts` - admin credential helpers
- `lib/auth/password.ts` - password verification helpers

### Database

- `prisma/schema.prisma` - Prisma schema
- `database/supabase-schema.sql` - Supabase schema backup
- `database/hostinger-schema.sql` - Hostinger/MySQL-oriented schema backup
- `database/supabase-seed.sql` - seed data

## App Workflow

### Parent Flow

1. Parent registers or logs in.
2. Parent adds kid profiles.
3. Admin can approve/reject kid profiles.
4. Parent books activities and earns Konnect Points.
5. Parent redeems points for brand vouchers.
6. Voucher QR/code is shown in the parent app.
7. Parent shows voucher to brand partner.

Main files:

- UI: `app/app/page.tsx`
- Data/API: `app/api/app/data/route.ts`
- Voucher issue: `app/api/app/redeem/route.ts`
- Logic: `lib/app-data.ts`

### Brand Partner Flow

1. Brand logs in with registered mobile number.
2. OTP is sent on WhatsApp.
3. Brand enters OTP and opens brand dashboard.
4. Dashboard shows dynamic updates, metrics, vouchers, redemptions, profile, opportunities, upgrade tiers.
5. Brand scans parent voucher QR or enters voucher code manually.
6. `app/api/brand/redeem/route.ts` validates the voucher.
7. Voucher status changes to `redeemed`.
8. Parent app, brand app, and admin panel read from the same redemption data.

Main files:

- UI: `app/brand/page.tsx`
- Brand data: `app/api/brand/data/route.ts`
- QR redeem: `app/api/brand/redeem/route.ts`
- Auth: `app/api/auth/brand-login/*`
- Registration: `app/api/auth/brand-register/*`

### Admin Flow

1. Admin logs in from `/admin-login`.
2. Admin manages users, kids, activities, bookings, brands, notifications, hero slides, vouchers, and redemptions.
3. Admin-created hero slides and notifications appear in parent and brand app surfaces.
4. Admin can update redemption status manually if needed.

Main files:

- UI: `app/admin/page.tsx`
- Data: `app/api/admin/data/route.ts`
- Logic: `lib/admin-data.ts`

## Brand App Features

The brand app at `/brand` includes:

- Mobile OTP login
- Business registration with OTP
- Dynamic dashboard
- Admin-connected updates slider
- Voucher QR scanner
- Manual voucher code verification
- Recent redemptions
- Opportunities screen
- Upgrade tier screen with request modal
- Profile screen with photo upload UI
- Business document upload UI
- Refer business share sheet
- Sign out

## Environment Variables

Common variables used by the app:

```env
DATABASE_URL=
OTP_HASH_SECRET=
ANANTYA_WHATSAPP_API_KEY=
ANANTYA_WHATSAPP_API_URL=
ANANTYA_OTP_TEMPLATE_ID=
KONNECT_LOGIN_CODE=
ADMIN_EMAIL=
ADMIN_PASSWORD=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Check `.env.example` for the current project template.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:push
npm run db:seed
```

## Notes

- QR scan uses `qr-scanner` so it works in browsers where native `BarcodeDetector` is unavailable.
- Parent voucher creation and brand redemption both use the `redemptions` table.
- Admin hero slides and notifications are reused by the brand dashboard updates slider.
- Some upload controls currently update UI state; persistent document storage can be connected later to a file storage provider or database column.

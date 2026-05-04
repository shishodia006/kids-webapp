-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "KidStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('issued', 'redeemed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('announcement', 'alert');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(190),
    "mobile" VARCHAR(20) NOT NULL,
    "password" VARCHAR(255),
    "parent_name" VARCHAR(190) NOT NULL,
    "father_name" VARCHAR(190),
    "mother_name" VARCHAR(190),
    "alternate_mobile" VARCHAR(20),
    "profession" VARCHAR(190),
    "address" TEXT,
    "locality" VARCHAR(190),
    "city" VARCHAR(120),
    "state" VARCHAR(120),
    "pincode" VARCHAR(20),
    "child_name" VARCHAR(190),
    "age" INTEGER,
    "block_sector" VARCHAR(120),
    "konnekt_kode" VARCHAR(60),
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kids" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "child_name" VARCHAR(190) NOT NULL,
    "age" INTEGER,
    "school" VARCHAR(190),
    "dob" DATE,
    "photo" VARCHAR(255),
    "school_id_card" VARCHAR(255),
    "block_rank" VARCHAR(80) NOT NULL DEFAULT 'Newbie',
    "status" "KidStatus" NOT NULL DEFAULT 'pending',
    "konnekt_kode" VARCHAR(60),
    "konnekt_points" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(190) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(80),
    "event_date" TIMESTAMPTZ(6),
    "location" VARCHAR(190),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "image" VARCHAR(255),
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kid_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "razorpay_payment_id" VARCHAR(190),
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "qr_token" VARCHAR(120) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "checked_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(190) NOT NULL,
    "description" TEXT,
    "note" VARCHAR(255),
    "points_cost" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" SERIAL NOT NULL,
    "kid_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "brand_name" VARCHAR(190) NOT NULL,
    "points_spent" INTEGER NOT NULL DEFAULT 0,
    "coupon_code" VARCHAR(120) NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'issued',
    "redeemed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'announcement',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" SERIAL NOT NULL,
    "referrer_parent_id" INTEGER NOT NULL,
    "referred_parent_id" INTEGER NOT NULL,
    "referral_code" VARCHAR(60) NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_users" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "brand_name" VARCHAR(190),
    "email" VARCHAR(190) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "partner_mobile" VARCHAR(20) NOT NULL,
    "referral_code" VARCHAR(60),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_referrals" (
    "id" SERIAL NOT NULL,
    "brand_user_id" INTEGER NOT NULL,
    "referred_parent_id" INTEGER NOT NULL,
    "referral_code" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_konnekt_kode_key" ON "users"("konnekt_kode");

-- CreateIndex
CREATE UNIQUE INDEX "kids_konnekt_kode_key" ON "kids"("konnekt_kode");

-- CreateIndex
CREATE INDEX "kids_parent_id_idx" ON "kids"("parent_id");

-- CreateIndex
CREATE INDEX "kids_status_idx" ON "kids"("status");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "events_is_active_idx" ON "events"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_qr_token_key" ON "bookings"("qr_token");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_kid_id_idx" ON "bookings"("kid_id");

-- CreateIndex
CREATE INDEX "bookings_event_id_idx" ON "bookings"("event_id");

-- CreateIndex
CREATE INDEX "bookings_payment_status_idx" ON "bookings"("payment_status");

-- CreateIndex
CREATE INDEX "brands_is_active_idx" ON "brands"("is_active");

-- CreateIndex
CREATE INDEX "brands_points_cost_idx" ON "brands"("points_cost");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_coupon_code_key" ON "redemptions"("coupon_code");

-- CreateIndex
CREATE INDEX "redemptions_kid_id_idx" ON "redemptions"("kid_id");

-- CreateIndex
CREATE INDEX "redemptions_brand_id_idx" ON "redemptions"("brand_id");

-- CreateIndex
CREATE INDEX "redemptions_status_idx" ON "redemptions"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "referral_rewards_referrer_parent_id_idx" ON "referral_rewards"("referrer_parent_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referred_parent_id_idx" ON "referral_rewards"("referred_parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_users_email_key" ON "brand_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brand_users_referral_code_key" ON "brand_users"("referral_code");

-- CreateIndex
CREATE INDEX "brand_users_brand_id_idx" ON "brand_users"("brand_id");

-- CreateIndex
CREATE INDEX "brand_users_is_active_idx" ON "brand_users"("is_active");

-- CreateIndex
CREATE INDEX "brand_referrals_brand_user_id_idx" ON "brand_referrals"("brand_user_id");

-- CreateIndex
CREATE INDEX "brand_referrals_referred_parent_id_idx" ON "brand_referrals"("referred_parent_id");

-- AddForeignKey
ALTER TABLE "kids" ADD CONSTRAINT "kids_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "kids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "kids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_parent_id_fkey" FOREIGN KEY ("referrer_parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referred_parent_id_fkey" FOREIGN KEY ("referred_parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_users" ADD CONSTRAINT "brand_users_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_referrals" ADD CONSTRAINT "brand_referrals_brand_user_id_fkey" FOREIGN KEY ("brand_user_id") REFERENCES "brand_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_referrals" ADD CONSTRAINT "brand_referrals_referred_parent_id_fkey" FOREIGN KEY ("referred_parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

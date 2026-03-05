-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('shipper', 'driver');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('available', 'applied', 'accepted', 'in_transit', 'at_pickup', 'approaching_dropoff', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('pending', 'in_transit', 'picked_up', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('available', 'busy');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "user_type" "UserType" NOT NULL,
    "business_name" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "display_name" TEXT,
    "truck_type" TEXT,
    "license_number" TEXT,
    "profile_photo_url" TEXT,
    "license_image_url" TEXT,
    "truck_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tyres" INTEGER NOT NULL,
    "capacity" TEXT NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" UUID NOT NULL,
    "shipper_id" UUID NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "truck_type" TEXT NOT NULL,
    "load_description" TEXT NOT NULL,
    "recipient_name" TEXT,
    "recipient_number" TEXT,
    "fare_offer" INTEGER NOT NULL,
    "load_image_url" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'available',
    "accepted_driver_id" UUID,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "load_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "offer_amount" INTEGER,
    "message" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "load_id" UUID NOT NULL,
    "shipper_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "fare_offer" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'pending',
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_presence" (
    "driver_id" UUID NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'available',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_presence_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_name_key" ON "trucks"("name");

-- CreateIndex
CREATE INDEX "loads_shipper_id_idx" ON "loads"("shipper_id");

-- CreateIndex
CREATE INDEX "loads_status_idx" ON "loads"("status");

-- CreateIndex
CREATE INDEX "bids_load_id_idx" ON "bids"("load_id");

-- CreateIndex
CREATE INDEX "bids_driver_id_idx" ON "bids"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "bids_load_id_driver_id_key" ON "bids"("load_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_load_id_key" ON "shipments"("load_id");

-- CreateIndex
CREATE INDEX "shipments_shipper_id_idx" ON "shipments"("shipper_id");

-- CreateIndex
CREATE INDEX "shipments_driver_id_idx" ON "shipments"("driver_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_token_key" ON "push_tokens"("user_id", "token");

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_presence" ADD CONSTRAINT "driver_presence_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

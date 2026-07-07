-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('COUPLE', 'VENDOR', 'VENUE');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'VENDOR_PRO', 'VENUE_AGENCY');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE', 'R2', 'S3');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'LIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'RECTANGULAR', 'OVAL', 'SQUARE', 'HEAD');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('APPROVED', 'PENDING', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "type" "OrgType" NOT NULL DEFAULT 'COUPLE',
    "logoUrl" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#C9A96E',
    "brandSecondary" TEXT NOT NULL DEFAULT '#3D5A80',
    "brandAccent" TEXT NOT NULL DEFAULT '#7B4F2E',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planStatus" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "supabaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coupleNames" TEXT NOT NULL,
    "partnerAName" TEXT,
    "partnerBName" TEXT,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT,
    "venueLat" DOUBLE PRECISION,
    "venueLng" DOUBLE PRECISION,
    "coverImageUrl" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "enabledLocales" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "themeOverride" JSONB,
    "featureSeating" BOOLEAN NOT NULL DEFAULT true,
    "featureMenu" BOOLEAN NOT NULL DEFAULT true,
    "featureSchedule" BOOLEAN NOT NULL DEFAULT true,
    "featureMessages" BOOLEAN NOT NULL DEFAULT true,
    "featureAudio" BOOLEAN NOT NULL DEFAULT false,
    "featurePhotos" BOOLEAN NOT NULL DEFAULT true,
    "featureRsvp" BOOLEAN NOT NULL DEFAULT false,
    "featureFaceFind" BOOLEAN NOT NULL DEFAULT false,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'GOOGLE_DRIVE',
    "googleRefreshToken" TEXT,
    "googleDriveFolderId" TEXT,
    "storageBucketPrefix" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "dataRetentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "seatsCount" INTEGER NOT NULL DEFAULT 8,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "shape" "TableShape" NOT NULL DEFAULT 'ROUND',
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "tableId" TEXT,
    "seatNumber" INTEGER,
    "groupLabel" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "locale" TEXT,
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "plusOnes" JSONB,
    "email" TEXT,
    "phone" TEXT,
    "mailingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "courseFr" TEXT,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionFr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "titleFr" TEXT,
    "description" TEXT,
    "descriptionFr" TEXT,
    "icon" TEXT,
    "location" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestId" TEXT,
    "bodyText" TEXT NOT NULL,
    "bodyOriginal" TEXT,
    "fontId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "wasAiEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "audioDuration" INTEGER,
    "transcript" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'APPROVED',
    "moderationScore" DOUBLE PRECISION,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_uploads" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT,
    "guestId" TEXT,
    "storageProvider" "StorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "thumbnailKey" TEXT,
    "previewKey" TEXT,
    "blurhash" TEXT,
    "faceEmbeddings" JSONB,
    "facesDetected" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "moderationStatus" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvp_responses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "respondentName" TEXT NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "songRequest" TEXT,
    "note" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_customDomain_key" ON "organizations"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeSubscriptionId_key" ON "organizations"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_organizationId_key" ON "memberships"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "events_status_weddingDate_idx" ON "events"("status", "weddingDate");

-- CreateIndex
CREATE UNIQUE INDEX "events_organizationId_slug_key" ON "events"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tables_eventId_number_key" ON "tables"("eventId", "number");

-- CreateIndex
CREATE INDEX "guests_eventId_nameNormalized_idx" ON "guests"("eventId", "nameNormalized");

-- CreateIndex
CREATE INDEX "menu_items_eventId_isActive_idx" ON "menu_items"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "schedule_items_eventId_startsAt_idx" ON "schedule_items"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "messages_eventId_status_createdAt_idx" ON "messages"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "photo_uploads_eventId_status_createdAt_idx" ON "photo_uploads"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "rsvp_responses_eventId_idx" ON "rsvp_responses"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "translations_eventId_locale_key_key" ON "translations"("eventId", "locale", "key");

-- CreateIndex
CREATE INDEX "audit_logs_eventId_createdAt_idx" ON "audit_logs"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

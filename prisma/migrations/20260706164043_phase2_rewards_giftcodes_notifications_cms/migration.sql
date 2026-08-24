-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DAILY', 'REFERRAL', 'ACHIEVEMENT', 'EVENT');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('AVAILABLE', 'CLAIMED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEPOSIT_APPROVED', 'WITHDRAW_APPROVED', 'GIFT_CODE_REDEEMED', 'REWARD_AVAILABLE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "CmsType" AS ENUM ('HOMEPAGE_BANNER', 'POPUP', 'ANNOUNCEMENT', 'PROMOTIONAL_CARD');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "key" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "meta" JSONB,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCodeRedemption" (
    "id" TEXT NOT NULL,
    "giftCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContent" (
    "id" TEXT NOT NULL,
    "type" "CmsType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsVersion" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reward_userId_status_idx" ON "Reward"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_userId_key_key" ON "Reward"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCodeRedemption_giftCodeId_userId_key" ON "GiftCodeRedemption"("giftCodeId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "CmsContent_type_status_idx" ON "CmsContent"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CmsVersion_contentId_version_key" ON "CmsVersion"("contentId", "version");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCode" ADD CONSTRAINT "GiftCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCodeRedemption" ADD CONSTRAINT "GiftCodeRedemption_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "GiftCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCodeRedemption" ADD CONSTRAINT "GiftCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContent" ADD CONSTRAINT "CmsContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsVersion" ADD CONSTRAINT "CmsVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CmsContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsVersion" ADD CONSTRAINT "CmsVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

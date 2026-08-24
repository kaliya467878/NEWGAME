-- CreateEnum
CREATE TYPE "DepositChannelKind" AS ENUM ('CHANNEL', 'METHOD');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('MASTER_AGENT', 'SUB_AGENT', 'REFERRAL_AGENT', 'DIRECT_AFFILIATE');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "CmsContent" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "highlight" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "DepositChannel" (
    "id" TEXT NOT NULL,
    "kind" "DepositChannelKind" NOT NULL,
    "channelKey" TEXT NOT NULL,
    "iconKey" TEXT,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "channelType" TEXT NOT NULL,
    "minAmount" INTEGER NOT NULL,
    "maxAmount" INTEGER NOT NULL,
    "bonusBadge" TEXT,
    "networkLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "disabledMessage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "parentId" TEXT,
    "commissionPct" DOUBLE PRECISION NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "linkedUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepositChannel_kind_active_idx" ON "DepositChannel"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_inviteCode_key" ON "Agent"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_linkedUserId_key" ON "Agent"("linkedUserId");

-- CreateIndex
CREATE INDEX "Agent_type_status_idx" ON "Agent"("type", "status");

-- CreateIndex
CREATE INDEX "Agent_parentId_idx" ON "Agent"("parentId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
